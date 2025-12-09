import { storage } from '../storage.js';

interface FullEnrichContact {
    email?: string;
    phone?: string;
    linkedin_url?: string;
    job_title?: string;
    company?: {
        name?: string;
        website?: string;
        linkedin_url?: string;
    };
}

interface FullEnrichResponse {
    enrichment_id: string;
    status: 'pending' | 'completed' | 'failed';
    contact?: FullEnrichContact;
}

export class FullEnrichService {
    private apiKey: string;
    private baseUrl = 'https://app.fullenrich.com/api/v1';

    constructor() {
        this.apiKey = process.env.FULLENRICH_API_KEY || '';
        if (!this.apiKey) {
            console.warn('[FullEnrich] API key not configured');
        }
    }

    /**
     * Enrich a LinkedIn profile URL to find email and phone
     */
    async enrichByLinkedInUrl(linkedInUrl: string): Promise<string | null> {
        try {
            console.log(`[FullEnrich] Enriching LinkedIn URL: ${linkedInUrl}`);

            // Make enrichment request using bulk endpoint
            const response = await fetch(`${this.baseUrl}/contact/enrich/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    name: 'LinkedIn Profile Enrichment',
                    datas: [
                        {
                            linkedin_url: linkedInUrl,
                            enrich_fields: ['contact.emails']
                        }
                    ]
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`FullEnrich API error: ${response.status} - ${errorText}`);
            }

            const data: FullEnrichResponse = await response.json();

            // Poll for results using enrichment_id
            if (data.enrichment_id) {
                console.log(`[FullEnrich] Enrichment started, polling for results...`);
                const email = await this.pollEnrichmentStatus(data.enrichment_id);
                return email;
            }

            console.log('[FullEnrich] No enrichment_id in response');
            return null;

        } catch (error: any) {
            console.error('[FullEnrich] Error:', error.message);
            throw error;
        }
    }

    /**
     * Poll enrichment status until complete (max 20 attempts, 3s intervals = 60s total)
     */
    private async pollEnrichmentStatus(enrichmentId: string, maxAttempts = 20): Promise<string | null> {
        for (let i = 0; i < maxAttempts; i++) {
            await this.sleep(3000); // Wait 3 seconds between polls

            try {
                const response = await fetch(`${this.baseUrl}/contact/enrich/bulk/${enrichmentId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                });

                if (!response.ok) {
                    console.error(`[FullEnrich] Polling error: ${response.status}`);
                    const errorText = await response.text();
                    console.error(`[FullEnrich] Error response: ${errorText}`);
                    continue;
                }

                const data: any = await response.json();
                console.log(`[FullEnrich] Poll ${i + 1}/${maxAttempts}: status = ${data.status}, has datas = ${!!data.datas}`);

                if (data.status === 'FINISHED' && data.datas && data.datas.length > 0) {
                    const contact = data.datas[0].contact;
                    const email = contact?.most_probable_email || contact?.emails?.[0]?.email;

                    if (email) {
                        console.log(`[FullEnrich] Email found after polling: ${email}`);
                        return email;
                    } else {
                        console.log(`[FullEnrich] Enrichment finished but no email found`);
                        console.log(`[FullEnrich] Contact data:`, JSON.stringify(contact, null, 2));
                        return null;
                    }
                }

                if (data.status === 'FAILED' || data.status === 'ERROR') {
                    console.log('[FullEnrich] Enrichment failed');
                    return null;
                }

            } catch (error) {
                console.error(`[FullEnrich] Polling attempt ${i + 1} failed:`, error);
            }
        }

        console.log('[FullEnrich] Max polling attempts reached (60 seconds)');
        return null;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const fullEnrichService = new FullEnrichService();
