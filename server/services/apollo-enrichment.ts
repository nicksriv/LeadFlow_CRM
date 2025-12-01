import { storage } from '../storage.js';
import { searchApolloContacts } from '../apollo.js';

interface ApolloPerson {
    id: string;
    email?: string;
    linkedin_url?: string;
    name?: string;
}

export class ApolloEnrichmentService {

    /**
     * Enrich a scraped profile with email from Apollo.io
     */
    async enrichScrapedProfile(profileId: string): Promise<{ success: boolean; email?: string; message: string }> {
        try {
            // Get the scraped profile
            const profiles = await storage.getScrapedProfiles();
            const profile = profiles.find(p => p.id === profileId);

            if (!profile) {
                return { success: false, message: 'Profile not found' };
            }

            if (profile.email) {
                return { success: false, message: 'Profile already has an email', email: profile.email };
            }

            if (!profile.url) {
                return { success: false, message: 'Profile does not have a LinkedIn URL' };
            }

            console.log(`[Apollo Enrichment] Enriching profile: ${profile.name}`);

            // Search Apollo.io using name and headline
            const apolloResults = await this.searchByNameAndTitle(profile.name, profile.headline || '');

            if (apolloResults.length === 0) {
                return { success: false, message: 'No results found on Apollo.io' };
            }

            // Match LinkedIn URL
            const matchedPerson = this.matchLinkedInUrl(apolloResults, profile.url);

            if (!matchedPerson || !matchedPerson.email) {
                return { success: false, message: 'No matching profile with email found' };
            }

            console.log(`[Apollo Enrichment] Found email: ${matchedPerson.email}`);

            // Update scraped profile
            await storage.updateScrapedProfile(profileId, { email: matchedPerson.email });

            // Update lead if exists
            await this.updateLeadEmail(profile.name, matchedPerson.email);

            // Log enrichment
            await storage.createApolloEnrichment({
                leadId: '' as any, // No lead ID for scraped profiles
                enrichmentData: matchedPerson,
                fieldsEnriched: ['email'],
                creditsUsed: 1,
                status: 'success',
                errorMessage: null
            });

            return { success: true, email: matchedPerson.email, message: 'Email found and updated' };

        } catch (error: any) {
            console.error('[Apollo Enrichment] Error:', error);

            // Log error
            await storage.createApolloEnrichment({
                leadId: '' as any, // No lead ID for scraped profiles
                enrichmentData: { error: error.message },
                fieldsEnriched: [],
                creditsUsed: 0,
                status: 'error',
                errorMessage: error.message
            });

            return { success: false, message: error.message };
        }
    }

    /**
     * Search Apollo.io by name and title/headline
     */
    private async searchByNameAndTitle(name: string, headline: string): Promise<ApolloPerson[]> {
        // Extract potential title/company from headline
        const searchTerms = [name];

        // Add headline as a title filter if available
        if (headline) {
            searchTerms.push(headline);
        }

        // Search using person name and title
        const result = await searchApolloContacts({
            personTitles: headline ? [headline] : undefined,
            page: 1,
            perPage: 10 // Limit to 10 results
        });

        return result.contacts as ApolloPerson[];
    }

    /**
     * Match LinkedIn URL from Apollo results
     */
    private matchLinkedInUrl(apolloResults: ApolloPerson[], targetUrl: string): ApolloPerson | null {
        // Normalize URLs for comparison
        const normalizeUrl = (url: string) => {
            return url.toLowerCase()
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .replace(/\/$/, '')
                .replace(/\/+$/, '');
        };

        const normalizedTarget = normalizeUrl(targetUrl);

        for (const person of apolloResults) {
            if (person.linkedin_url) {
                const normalizedApollo = normalizeUrl(person.linkedin_url);
                if (normalizedApollo === normalizedTarget) {
                    return person;
                }
            }
        }

        return null;
    }

    /**
     * Update lead email if a lead with matching name exists
     */
    private async updateLeadEmail(name: string, email: string): Promise<void> {
        try {
            const leads = await storage.getLeads();
            const matchingLead = leads.find(l => l.name.toLowerCase() === name.toLowerCase());

            if (matchingLead && !matchingLead.email) {
                await storage.updateLead(matchingLead.id, { email });
                console.log(`[Apollo Enrichment] Updated lead ${matchingLead.id} with email`);
            }
        } catch (error) {
            console.error('[Apollo Enrichment] Failed to update lead:', error);
        }
    }
}

export const apolloEnrichmentService = new ApolloEnrichmentService();
