
import fetch from 'node-fetch';
import { storage } from '../storage';

interface SnovioTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

interface SnovioEmailResponse {
    success: boolean;
    emails: Array<{
        email: string;
        status: string; // "valid", "uncertain", "invalid"
    }>;
    message?: string;
}

export class SnovioService {
    private clientId: string;
    private clientSecret: string;
    private baseUrl = 'https://api.snov.io/v1';
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor() {
        this.clientId = process.env.SNOVIO_CLIENT_ID || '';
        this.clientSecret = process.env.SNOVIO_CLIENT_SECRET || '';
    }

    private async getAccessToken(): Promise<string> {
        if (!this.clientId || !this.clientSecret) {
            throw new Error("Snov.io credentials not configured");
        }

        // Return cached token if valid (with 5 min buffer)
        if (this.accessToken && Date.now() < this.tokenExpiresAt - 300000) {
            return this.accessToken;
        }

        console.log("[Snov.io] Refreshing access token...");

        try {
            const response = await fetch(`${this.baseUrl}/oauth/access_token`, {
                method: 'POST',
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Auth failed: ${response.status} ${text}`);
            }

            const data = await response.json() as SnovioTokenResponse;
            this.accessToken = data.access_token;
            this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

            console.log("[Snov.io] Token refreshed successfully");
            return this.accessToken;

        } catch (error: any) {
            console.error("[Snov.io] Auth Error:", error);
            throw error;
        }
    }

    async findEmail(firstName: string, lastName: string, domain: string, profileUrl?: string): Promise<string | null> {
        try {
            const token = await this.getAccessToken();

            console.log(`[Snov.io] Finding email for ${firstName} ${lastName} @ ${domain}`);

            const params = new URLSearchParams({
                access_token: token,
                firstName,
                lastName,
                domain
            });

            const response = await fetch(`${this.baseUrl}/get-emails-from-names?${params}`, {
                method: 'POST' // Snov.io documentation says POST for this endpoint usually, but let's check. Actually get-emails-from-names is POST.
            });

            const data = await response.json() as any;

            // Log the attempt
            await storage.logSnovioAction({
                action: 'find_email',
                status: data.success ? 'success' : 'failed',
                creditsUsed: 1, // Estimate
                profileUrl: profileUrl || '',
                responseData: data
            });

            if (data.success && data.emails && data.emails.length > 0) {
                // Return the first valid email
                const validEmail = data.emails.find((e: any) => e.emailStatus === 'valid');
                if (validEmail) return validEmail.email;

                // Or just the first one if no "valid" one found (could be uncertain)
                return data.emails[0].email;
            }

            return null;

        } catch (error: any) {
            console.error("[Snov.io] Find Email Error:", error);

            await storage.logSnovioAction({
                action: 'find_email',
                status: 'error',
                creditsUsed: 0,
                profileUrl: profileUrl || '',
                responseData: { error: error.message }
            });

            return null;
        }
    }

    async searchByUrl(url: string): Promise<string | null> {
        try {
            const token = await this.getAccessToken();
            console.log(`[Snov.io] Searching by URL: ${url}`);

            const params = new URLSearchParams({
                access_token: token,
                url: url
            });

            const response = await fetch(`${this.baseUrl}/get-profile-by-url?${params}`, {
                method: 'GET'
            });

            const data = await response.json() as any;

            await storage.logSnovioAction({
                action: 'get_profile_by_url',
                status: data.success ? 'success' : 'failed',
                creditsUsed: 1,
                profileUrl: url,
                responseData: data
            });

            if (data.success && data.emails && data.emails.length > 0) {
                const validEmail = data.emails.find((e: any) => e.status === 'valid');
                return validEmail ? validEmail.email : data.emails[0].email;
            }

            return null;

        } catch (error: any) {
            console.error("[Snov.io] Search By URL Error:", error);
            await storage.logSnovioAction({
                action: 'get_profile_by_url',
                status: 'error',
                creditsUsed: 0,
                profileUrl: url,
                responseData: { error: error.message }
            });
            return null;
        }
    }
}

export const snovioService = new SnovioService();
