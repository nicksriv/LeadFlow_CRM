import fetch from 'node-fetch';

interface LinkedApiSearchParams {
    jobTitle?: string;
    industry?: string;
    keywords?: string;
    company?: string;
}

interface LinkedApiProfile {
    id: string;
    name: string;
    headline: string;
    summary: string;
    industry: string;
    url: string;
    experience: any[];
    education: any[];
    skills: string[];
    posts: string[];
}

export class LinkedApiService {
    private apiToken: string;
    private identificationToken: string;
    private baseUrl = 'https://api.linkedapi.io';

    constructor() {
        this.apiToken = process.env.LINKEDAPI_TOKEN || '';
        this.identificationToken = process.env.LINKEDAPI_IDENTIFICATION_TOKEN || '';

        if (!this.apiToken || !this.identificationToken) {
            throw new Error('LinkedAPI tokens not configured');
        }
    }

    private async executeWorkflow(workflow: any): Promise<any> {
        const response = await fetch(`${this.baseUrl}/workflows`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'linked-api-token': this.apiToken,
                'identification-token': this.identificationToken
            },
            body: JSON.stringify(workflow)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`LinkedAPI Error: ${response.status} ${response.statusText} - ${text}`);
        }

        return response.json();
    }

    async searchEmployees(params: LinkedApiSearchParams): Promise<LinkedApiProfile[]> {
        try {
            // Build filter object
            const filter: any = {};

            if (params.jobTitle) {
                filter.position = params.jobTitle;
            }

            if (params.keywords) {
                // Use keywords as location
                filter.locations = [params.keywords];
            }

            if (params.company) {
                filter.currentCompanies = [params.company];
            }

            if (params.industry) {
                filter.industries = [params.industry];
            }

            // Create workflow
            const workflow = {
                actionType: 'st.searchPeople',
                limit: 10,
                filter: filter
            };

            console.log(`[LinkedAPI Search] Searching with filter:`, JSON.stringify(filter));

            const result = await this.executeWorkflow(workflow);

            if (!result.success) {
                console.error('[LinkedAPI] Search failed:', result.error);
                return [];
            }

            // Map results to our common format
            const profiles: LinkedApiProfile[] = (result.result?.data || []).map((profile: any) => ({
                id: profile.publicUrl || Math.random().toString(),
                name: profile.name || "LinkedIn Member",
                headline: profile.headline || "",
                summary: "",
                industry: "",
                url: profile.publicUrl || "",
                skills: [],
                posts: [],
                experience: [],
                education: []
            }));

            console.log(`[LinkedAPI] Found ${profiles.length} results`);
            return profiles;

        } catch (error) {
            console.error("LinkedAPI Search Error", error);
            return [];
        }
    }

    async getProfileByUrl(url: string): Promise<LinkedApiProfile | null> {
        try {
            // LinkedAPI requires workflows, we can use st.getPersonData
            const workflow = {
                actionType: 'st.getPersonData',
                url: url
            };

            console.log(`[LinkedAPI] Fetching profile: ${url}`);

            const result = await this.executeWorkflow(workflow);

            if (!result.success) {
                console.error('[LinkedAPI] Profile fetch failed:', result.error);
                return null;
            }

            const data = result.result?.data;

            if (data) {
                return {
                    id: data.publicUrl || Math.random().toString(),
                    name: data.name || "LinkedIn Member",
                    headline: data.headline || "",
                    summary: data.summary || "",
                    industry: "",
                    url: data.publicUrl || url,
                    experience: data.experience || [],
                    education: data.education || [],
                    skills: data.skills || [],
                    posts: []
                };
            }

            return null;

        } catch (error) {
            console.error("LinkedAPI Get Profile Error", error);
            return null;
        }
    }

    async getProfileById(profileId: string | number): Promise<LinkedApiProfile | null> {
        // LinkedAPI doesn't support lookup by ID, need URL
        return {
            id: profileId.toString(),
            name: "LinkedIn Member",
            headline: "Profile enrichment requires URL",
            summary: "",
            industry: "",
            url: "",
            experience: [],
            education: [],
            skills: [],
            posts: []
        };
    }
}
