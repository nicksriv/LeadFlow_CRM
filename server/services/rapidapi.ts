import fetch from 'node-fetch';

interface RapidApiSearchParams {
    jobTitle?: string;
    industry?: string;
    keywords?: string;
    company?: string;
}

interface RapidApiProfile {
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

export class RapidApiService {
    private apiKey: string;
    private searchHost = 'fresh-linkedin-scraper-api.p.rapidapi.com';
    private enrichHost = 'fresh-linkedin-profile-data.p.rapidapi.com';

    constructor() {
        this.apiKey = process.env.RAPIDAPI_KEY || '';
        if (!this.apiKey) {
            throw new Error('RAPIDAPI_KEY is not configured');
        }
    }

    private async request(url: string, method: string = 'GET'): Promise<any> {
        const response = await fetch(url, {
            method,
            headers: {
                'x-rapidapi-key': this.apiKey,
                'x-rapidapi-host': url.includes(this.searchHost) ? this.searchHost : this.enrichHost,
            },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`RapidAPI Error: ${response.status} ${response.statusText} - ${text}`);
        }

        return response.json();
    }

    async searchEmployees(params: RapidApiSearchParams): Promise<RapidApiProfile[]> {
        try {
            // Build query params for Fresh LinkedIn Scraper API
            const queryParams = new URLSearchParams();

            // Parse job title and company if format is "Title - Company"
            let jobTitle = params.jobTitle || '';
            let company = params.company || '';

            if (jobTitle.includes(' - ') && !company) {
                const parts = jobTitle.split(' - ');
                jobTitle = parts[0].trim();
                company = parts[1].trim();
            }

            if (jobTitle) {
                queryParams.append('title', jobTitle);
            }

            // Look up company ID if company name provided
            if (company) {
                try {
                    console.log(`[RapidAPI] Looking up company: ${company}`);
                    const companyUrl = `https://${this.searchHost}/api/v1/company/profile?company=${encodeURIComponent(company.toLowerCase())}`;
                    const companyData = await this.request(companyUrl);
                    if (companyData?.data?.id) {
                        queryParams.append('current_company', companyData.data.id.toString());
                        console.log(`[RapidAPI] Found company ID: ${companyData.data.id}`);
                    }
                } catch (error) {
                    console.log(`[RapidAPI] Could not find company ID for: ${company}`);
                }
            }

            // Look up location geocode if keywords provided
            if (params.keywords) {
                try {
                    console.log(`[RapidAPI] Looking up location: ${params.keywords}`);
                    const locationUrl = `https://${this.searchHost}/api/v1/search/location?keyword=${encodeURIComponent(params.keywords)}`;
                    const locationData = await this.request(locationUrl);
                    if (locationData?.data && locationData.data.length > 0) {
                        // Use the first (most relevant) location match
                        const geocode = locationData.data[0].geocode;
                        queryParams.append('geocode_location', geocode);
                        console.log(`[RapidAPI] Found geocode for ${locationData.data[0].location}: ${geocode}`);
                    }
                } catch (error) {
                    console.log(`[RapidAPI] Could not find geocode for: ${params.keywords}`);
                }
            }

            queryParams.append('page', '1');

            const url = `https://${this.searchHost}/api/v1/search/people?${queryParams.toString()}`;

            console.log(`[RapidAPI Search] Searching for: ${jobTitle || 'All'} at ${company || params.keywords || 'any location'}`);

            const response = await this.request(url);

            if (!response.success || !response.data) {
                console.log('No results from RapidAPI');
                return [];
            }

            // Map results to our common profile format and filter out private/hidden profiles
            const profiles = response.data
                .map((profile: any) => ({
                    id: profile.id || profile.urn || Math.random().toString(),
                    name: profile.full_name || "LinkedIn Member",
                    headline: profile.title || "",
                    summary: "",
                    industry: "",
                    url: profile.url || "",
                    skills: [],
                    posts: [],
                    experience: [],
                    education: []
                }))
                .filter((profile: RapidApiProfile) => {
                    // STRICT: Only show non-private profiles with URLs and real names
                    return profile.url && profile.url.length > 0 && profile.name !== "LinkedIn Member";
                })
                .slice(0, 5); // Take top 5 after filtering

            console.log(`Found ${profiles.length} accessible (non-private) results via RapidAPI`);
            return profiles;

        } catch (error) {
            console.error("RapidAPI Search Error", error);
            return [];
        }
    }

    async getProfileByUrl(url: string): Promise<RapidApiProfile | null> {
        try {
            // Extract LinkedIn username from URL
            const usernameMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
            if (!usernameMatch) {
                console.log("Could not extract username from URL");
                return null;
            }

            const linkedinUrl = encodeURIComponent(url);
            const enrichUrl = `https://${this.enrichHost}/enrich-lead?linkedin_url=${linkedinUrl}`;

            console.log(`[RapidAPI Enrich] Fetching profile: ${url}`);

            const profile = await this.request(enrichUrl);

            if (profile) {
                return {
                    id: profile.urn_id || profile.public_identifier || Math.random().toString(),
                    name: profile.full_name || "LinkedIn Member",
                    headline: profile.headline || profile.occupation || "",
                    summary: profile.summary || "",
                    industry: profile.industry || "",
                    url: profile.url || url,
                    experience: profile.experiences || [],
                    education: profile.education || [],
                    skills: profile.skills || [],
                    posts: []
                };
            }

            return null;

        } catch (error) {
            console.error("RapidAPI Get Profile Error", error);
            return null;
        }
    }

    async getProfileById(profileId: string | number): Promise<RapidApiProfile | null> {
        // For RapidAPI, we need a URL to enrich
        // If profileId is just an ID, we can't do much
        // Return a minimal profile
        try {
            return {
                id: profileId.toString(),
                name: "LinkedIn Member",
                headline: "Profile information available via URL enrichment",
                summary: "",
                industry: "",
                url: "",
                experience: [],
                education: [],
                skills: [],
                posts: []
            };
        } catch (error) {
            console.error("RapidAPI Get Profile By ID Error", error);
            return null;
        }
    }
}
