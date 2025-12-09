import { storage } from '../storage.js';

interface HunterEmailFinderResponse {
    data: {
        email: string | null;
        score: number;
        first_name: string;
        last_name: string;
        position: string;
        domain: string;
        sources: Array<{
            domain: string;
            uri: string;
            extracted_on: string;
        }>;
    };
}

export class HunterEnrichmentService {
    private apiKey: string;
    private baseUrl = 'https://api.hunter.io/v2';

    constructor() {
        this.apiKey = process.env.HUNTER_API_KEY || '';
        if (!this.apiKey) {
            console.warn('[Hunter.io] API key not configured');
        }
    }

    /**
     * Enrich a scraped profile with email from Hunter.io
     */
    async enrichScrapedProfile(profileUrl: string): Promise<{ success: boolean; email?: string; confidence?: number; message: string }> {
        try {
            if (!this.apiKey) {
                return { success: false, message: 'Hunter.io API key not configured' };
            }

            // Get the scraped profile by URL
            const profiles = await storage.getScrapedProfiles();
            const profile = profiles.find(p => p.url === profileUrl);

            if (!profile) {
                return { success: false, message: 'Profile not found' };
            }

            console.log(`[Hunter.io] Enriching profile: ${profile.name}`);

            // Extract and clean first name, last name from profile name (handle international characters)
            const { firstName, lastName } = this.extractName(profile.name);

            if (!firstName || !lastName) {
                return { success: false, message: 'Could not extract full name from profile' };
            }

            console.log(`[Hunter.io] Cleaned name: ${firstName} ${lastName}`);

            // Extract company domain from profile
            const companyName = await this.extractCompanyDomain(profile);

            if (!companyName) {
                return { success: false, message: 'Could not extract company domain from profile' };
            }

            // Try different domain extensions
            const domainExtensions = ['.com', '.co.in', '.org', '.io', '.net'];
            let result: { email: string | null; score: number } | null = null;
            let successfulDomain = '';

            for (const extension of domainExtensions) {
                const domain = this.convertCompanyToDomain(companyName, extension);
                console.log(`[Hunter.io] Trying: ${firstName} ${lastName} @ ${domain}`);

                try {
                    const apiResult = await this.findEmail(firstName, lastName, domain);
                    if (apiResult.email) {
                        result = apiResult;
                        successfulDomain = domain;
                        console.log(`[Hunter.io] ✅ Found email with domain: ${domain}`);
                        break;
                    }
                } catch (error: any) {
                    console.log(`[Hunter.io] Domain ${domain} failed: ${error.message}`);
                    continue;
                }
            }

            if (!result || !result.email) {
                return {
                    success: false,
                    message: `No email found on Hunter.io for ${companyName} (tried: ${domainExtensions.join(', ')})`
                };
            }

            console.log(`[Hunter.io] Found email: ${result.email} (confidence: ${result.score}%)`);

            // Determine final email value
            let finalEmail: string;
            const existingEmail = profile.email;

            if (!existingEmail || existingEmail === 'technology@codescribed.com') {
                // No email or fallback email - replace it
                finalEmail = result.email;
            } else if (existingEmail.includes(result.email)) {
                // Email already exists in the list
                finalEmail = existingEmail;
            } else {
                // Append as comma-separated
                finalEmail = `${existingEmail}, ${result.email}`;
            }

            // Update scraped profile
            await storage.updateScrapedProfile(profile.id, {
                email: finalEmail,
                emailConfidence: result.score
            });

            // Update lead if exists
            await this.updateLeadEmail(profile.name, finalEmail);

            return {
                success: true,
                email: finalEmail,
                confidence: result.score,
                message: `Email found with ${result.score}% confidence`
            };

        } catch (error: any) {
            console.error('[Hunter.io] Error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Find email using Hunter.io Email Finder API
     */
    private async findEmail(firstName: string, lastName: string, domain: string): Promise<{ email: string | null; score: number }> {
        const url = `${this.baseUrl}/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${this.apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Hunter.io API error: ${error}`);
        }

        const data: HunterEmailFinderResponse = await response.json();

        return {
            email: data.data.email,
            score: data.data.score
        };
    }

    /**
     * Extract name and clean non-English characters
     */
    private extractName(fullName: string): { firstName: string; lastName: string } {
        // Remove non-Latin characters (keeps English letters and spaces)
        const cleaned = fullName.replace(/[^a-zA-Z\s-]/g, '').trim();

        const parts = cleaned.split(/\s+/).filter(p => p.length > 0);

        if (parts.length === 0) {
            return { firstName: '', lastName: '' };
        }

        const firstName = parts[0];
        const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

        return { firstName, lastName };
    }

    /**
     * Extract company name from LinkedIn profile
     */
    private async extractCompanyDomain(profile: any): Promise<string | null> {
        console.log(`[Hunter.io] Attempting company extraction for profile:`, {
            name: profile.name,
            headline: profile.headline,
            company: profile.company,
            hasExperiences: profile.experiences?.length > 0,
            hasSkills: profile.skills?.length > 0,
            hasAbout: !!profile.about
        });

        // PRIORITY 1: Check database company field (most reliable)
        if (profile.company) {
            const companyName = profile.company.trim();
            console.log(`[Hunter.io] ✅ Extracted company from database: ${companyName}`);
            return companyName;
        }

        // PRIORITY 2: Extract from experiences (work history)
        if (profile.experiences && Array.isArray(profile.experiences) && profile.experiences.length > 0) {
            // Get the most recent experience (first in array)
            const currentExp = profile.experiences[0];
            if (currentExp.company && currentExp.company.trim().length > 0) {
                const companyName = currentExp.company.trim();
                console.log(`[Hunter.io] ✅ Extracted company from experiences[0]: ${companyName}`);
                return companyName;
            }
        }

        // PRIORITY 3: Extract from headline with "at Company" or "@Company"
        if (profile.headline) {
            const atMatch = profile.headline.match(/@\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (atMatch) {
                console.log(`[Hunter.io] ✅ Extracted domain from headline @: ${atMatch[1]}`);
                return atMatch[1];
            }

            const companyPatterns = [
                /\bat\s+([A-Z][A-Za-z0-9\s&.'-]+?)(?:\s*[,|]|$)/i,
                /\b(?:CEO|CTO|VP|Vice President|Director|Manager|Head|Lead)\s+(?:at|@)\s+([A-Z][A-Za-z0-9\s&.'-]+?)(?:\s*[,|]|$)/i,
            ];

            for (const pattern of companyPatterns) {
                const match = profile.headline.match(pattern);
                if (match && match[1]) {
                    const companyName = match[1].trim();
                    console.log(`[Hunter.io] ✅ Extracted company from headline: ${companyName}`);
                    return companyName;
                }
            }
        }

        // PRIORITY 4: Extract from skills (first skill is often current company)
        if (profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) {
            // Check first 3 skills for company-like names
            for (let i = 0; i < Math.min(3, profile.skills.length); i++) {
                const skill = profile.skills[i];
                // Skip if it looks like a job title or person name
                if (this.looksLikeCompany(skill)) {
                    console.log(`[Hunter.io] ✅ Extracted company from skills[${i}]: ${skill}`);
                    return skill;
                }
            }
        }

        // PRIORITY 5: Extract from about section
        if (profile.about) {
            // Look for patterns like "at Noventiq" or "working at Company"
            const aboutPatterns = [
                /\b(?:at|working at|work at|with)\s+([A-Z][A-Za-z0-9\s&.'-]+?)(?:\s*[,.]|$)/i,
                /\b([A-Z][A-Za-z0-9\s&.'-]{2,})\s+(?:India|Ltd|LLC|Inc|Corp)/i,
            ];

            for (const pattern of aboutPatterns) {
                const match = profile.about.match(pattern);
                if (match && match[1] && this.looksLikeCompany(match[1])) {
                    const companyName = match[1].trim();
                    console.log(`[Hunter.io] ✅ Extracted company from about: ${companyName}`);
                    return companyName;
                }
            }
        }

        console.log(`[Hunter.io] ❌ Could not extract company domain from any source`);
        return null;
    }

    /**
     * Check if a string looks like a company name (not a person or job title)
     */
    private looksLikeCompany(text: string): boolean {
        const cleanText = text.trim().toLowerCase();

        // Skip if it's too short
        if (cleanText.length < 3) return false;

        // Skip common job titles and skills
        const jobRelatedTerms = [
            'ceo', 'cto', 'vp', 'vice president', 'director', 'manager', 'head', 'lead',
            'engineer', 'developer', 'analyst', 'consultant', 'specialist', 'executive',
            'sales', 'marketing', 'operations', 'finance', 'hr', 'human resources',
            'project management', 'business development', 'account manager',
            'product manager', 'general manager', 'regional', 'senior', 'junior',
            'assistant', 'associate', 'coordinator', 'administrator', 'officer',
            'investment strategies', 'team management', 'leadership', 'business strategy'
        ];

        if (jobRelatedTerms.some(term => cleanText === term || cleanText.includes(` ${term}`) || cleanText.startsWith(term + ' '))) {
            return false;
        }

        // Skip if it looks like a person name (has common first names)
        const commonNames = ['john', 'jane', 'amit', 'rahul', 'priya', 'michael', 'sarah', 'david', 'james'];
        if (commonNames.some(name => cleanText.includes(name))) {
            return false;
        }

        // Skip educational terms
        if (cleanText.includes('university') || cleanText.includes('college') || cleanText.includes('mba') || cleanText.includes('cfp')) {
            return false;
        }

        return true;
    }

    /**
     * Convert company name to domain with specified extension
     */
    private convertCompanyToDomain(companyName: string, extension: string = '.com'): string {
        // Remove common suffixes
        let cleaned = companyName
            .replace(/\b(PVT\s+LTD|PRIVATE\s+LIMITED|LTD|LLC|INC|CORP|CORPORATION|INDIA|LIMITED)\b/gi, '')
            .trim();

        // Convert to domain
        const domainName = cleaned.toLowerCase()
            .replace(/[^a-z0-9]/g, '');

        return `${domainName}${extension}`;
    }
    /**
     * Update lead email if lead exists
     */
    private async updateLeadEmail(profileName: string, email: string): Promise<void> {
        try {
            const leads = await storage.getLeads();
            const matchingLead = leads.find(l =>
                l.name?.toLowerCase() === profileName.toLowerCase()
            );

            if (matchingLead && !matchingLead.email) {
                await storage.updateLead(matchingLead.id, { email });
                console.log(`[Hunter.io] Updated lead ${matchingLead.id} with email`);
            }
        } catch (error) {
            console.error('[Hunter.io] Failed to update lead:', error);
        }
    }
}

export const hunterEnrichmentService = new HunterEnrichmentService();
