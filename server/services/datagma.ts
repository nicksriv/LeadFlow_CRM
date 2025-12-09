import fetch from 'node-fetch';

export interface DatagmaEnrichmentResponse {
    email?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    job_title?: string;
    company_name?: string;
    linkedin_url?: string;
    phone?: string;
}

export class DatagmaService {
    private apiKey: string;
    private baseUrl = 'https://gateway.datagma.net/api/ingress/v2/full';

    constructor() {
        this.apiKey = process.env.DATAGMA_API_KEY || '';
        if (!this.apiKey) {
            console.warn('[Datagma] API key not found. Set DATAGMA_API_KEY in .env');
        }
    }

    async enrichByLinkedInUrl(linkedInUrl: string): Promise<string | null> {
        try {
            console.log('[Datagma] Enriching LinkedIn URL:', linkedInUrl);

            // Datagma v2 API uses GET with query parameters
            const url = new URL(this.baseUrl);
            url.searchParams.append('apiId', this.apiKey);
            url.searchParams.append('password', this.apiKey);
            url.searchParams.append('data', linkedInUrl);

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Datagma] API Error:', response.status, errorText);
                throw new Error(`Datagma API error: ${response.status}`);
            }

            const data = await response.json() as DatagmaEnrichmentResponse;
            console.log('[Datagma] Response:', data);

            // Extract email from response
            const email = data.email;

            if (email) {
                console.log('[Datagma] Email found:', email);
                return email;
            } else {
                console.log('[Datagma] No email found in response');
                return null;
            }

        } catch (error: any) {
            console.error('[Datagma] Enrichment error:', error.message);
            throw error;
        }
    }
}
