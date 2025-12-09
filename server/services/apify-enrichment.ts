import { ApifyClient } from 'apify-client';

interface ApifyLead {
    first_name: string;
    last_name: string;
    full_name: string;
    email?: string;
    linkedin?: string;
    job_title?: string;
    company_name?: string;
    company_domain?: string;
}

interface MatchResult {
    profileId: string;
    email: string;
    confidence: number; // 0-100
    matchType: 'linkedin_url' | 'name_company' | 'name_only';
}

export class ApifyEnrichmentService {
    private client: ApifyClient;

    constructor() {
        const apiToken = process.env.APIFY_API_TOKEN || '';
        if (!apiToken) {
            console.warn('[Apify] API token not configured');
        }
        this.client = new ApifyClient({ token: apiToken });
    }

    /**
     * Enrich profiles using bulk Apify search
     */
    async bulkEnrich(searchCriteria: {
        jobTitle?: string;
        location?: string;
        industry?: string;
        keywords?: string;
    }): Promise<ApifyLead[]> {
        try {
            console.log('[Apify] Starting bulk enrichment with criteria:', searchCriteria);

            // Build minimal input - just fetch_count is required
            const input: any = {
                fetch_count: 100
            };

            console.log('[Apify] Actor input:', JSON.stringify(input, null, 2));

            // Use .start() instead of .call() to properly pass input
            const run = await this.client.actor('code_crafter/leads-finder').start(input);

            console.log(`[Apify] Actor run started: ${run.id}, status: ${run.status}`);

            // Wait for the run to finish
            const finishedRun = await this.client.run(run.id).waitForFinish();

            console.log(`[Apify] Actor run finished: ${finishedRun.id}, status: ${finishedRun.status}`);

            // Fetch results from dataset
            const { items } = await this.client.dataset(finishedRun.defaultDatasetId).listItems();

            console.log(`[Apify] Retrieved ${items.length} leads`);
            return items as ApifyLead[];

        } catch (error: any) {
            console.error('[Apify] Error:', error.message);
            throw error;
        }
    }

    /**
     * Match Apify results with scraped profiles
     */
    matchProfiles(apifyLeads: ApifyLead[], scrapedProfiles: any[]): MatchResult[] {
        const matches: MatchResult[] = [];

        for (const profile of scrapedProfiles) {
            if (profile.email) {
                // Already has email, skip
                continue;
            }

            const match = this.findBestMatch(profile, apifyLeads);
            if (match) {
                matches.push(match);
            }
        }

        console.log(`[Apify] Matched ${matches.length}/${scrapedProfiles.length} profiles`);
        return matches;
    }

    /**
     * Find best matching lead for a profile
     */
    private findBestMatch(profile: any, apifyLeads: ApifyLead[]): MatchResult | null {
        let bestMatch: { lead: ApifyLead; confidence: number; matchType: any } | null = null;

        for (const lead of apifyLeads) {
            if (!lead.email) continue;

            // Match by LinkedIn URL (highest confidence - 95%)
            if (profile.url && lead.linkedin) {
                const profileUrl = this.normalizeLinkedInUrl(profile.url);
                const leadUrl = this.normalizeLinkedInUrl(lead.linkedin);

                if (profileUrl === leadUrl) {
                    return {
                        profileId: profile.id,
                        email: lead.email,
                        confidence: 95,
                        matchType: 'linkedin_url'
                    };
                }
            }

            // Match by Name + Company (medium confidence - 75%)
            if (profile.name && profile.company && lead.full_name && lead.company_name) {
                const nameMatch = this.normalizeName(profile.name) === this.normalizeName(lead.full_name);
                const companyMatch = this.normalizeCompany(profile.company) === this.normalizeCompany(lead.company_name);

                if (nameMatch && companyMatch) {
                    if (!bestMatch || bestMatch.confidence < 75) {
                        bestMatch = {
                            lead,
                            confidence: 75,
                            matchType: 'name_company'
                        };
                    }
                }
            }

            // Match by Name only (low confidence - 50%)
            if (profile.name && lead.full_name) {
                const nameMatch = this.normalizeName(profile.name) === this.normalizeName(lead.full_name);

                if (nameMatch && (!bestMatch || bestMatch.confidence < 50)) {
                    bestMatch = {
                        lead,
                        confidence: 50,
                        matchType: 'name_only'
                    };
                }
            }
        }

        if (bestMatch) {
            return {
                profileId: profile.id,
                email: bestMatch.lead.email!,
                confidence: bestMatch.confidence,
                matchType: bestMatch.matchType
            };
        }

        return null;
    }

    /**
     * Normalize LinkedIn URL for comparison
     */
    private normalizeLinkedInUrl(url: string): string {
        return url.toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '')
            .replace(/\/+$/, '');
    }

    /**
     * Normalize name for comparison
     */
    private normalizeName(name: string): string {
        return name.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Normalize company name for comparison
     */
    private normalizeCompany(company: string): string {
        return company.toLowerCase()
            .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

export const apifyEnrichmentService = new ApifyEnrichmentService();
