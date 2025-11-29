import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page, Cookie } from "puppeteer";
import { storage } from "../storage.js";

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export class LinkedInAuthService {
    private browser: Browser | null = null;
    private page: Page | null = null;

    /**
     * Initiate LinkedIn login flow
     * Opens a visible browser window for user to log in
     * Waits for successful login and captures cookies
     */
    async initiateLogin(): Promise<{ success: boolean; message: string }> {
        try {
            console.log("[LinkedIn Auth] Launching browser for authentication...");

            // Launch browser in non-headless mode so user can see and interact
            this.browser = await puppeteer.launch({
                headless: false,
                args: [
                    '--start-maximized',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                ],
            });

            this.page = await this.browser.newPage();

            // Set viewport
            await this.page.setViewport({ width: 1366, height: 768 });

            // Set realistic user agent
            await this.page.setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Navigate to LinkedIn login page
            console.log("[LinkedIn Auth] Navigating to LinkedIn login page...");
            await this.page.goto('https://www.linkedin.com/login', {
                waitUntil: 'networkidle2',
            });

            console.log("[LinkedIn Auth] Waiting for user to log in...");
            console.log("[LinkedIn Auth] Please log in to LinkedIn in the browser window");

            // Wait for successful login - detect redirect to feed or home
            // We'll wait up to 5 minutes (300 seconds) for user to login
            try {
                await this.page.waitForFunction(
                    () => {
                        const url = window.location.href;
                        return url.includes('/feed') ||
                            url.includes('/mynetwork') ||
                            url.includes('/messaging') ||
                            url.includes('/jobs') ||
                            (url === 'https://www.linkedin.com/' && !url.includes('/login'));
                    },
                    { timeout: 300000 } // 5 minutes
                );

                console.log("[LinkedIn Auth] Login successful! Capturing cookies...");

                // Extract all cookies
                const cookies = await this.page.cookies();

                // Find the important li_at cookie
                const liAtCookie = cookies.find((c: Cookie) => c.name === 'li_at');
                if (!liAtCookie) {
                    throw new Error('Failed to capture LinkedIn session cookie (li_at)');
                }

                console.log(`[LinkedIn Auth] Captured ${cookies.length} cookies`);

                // Store cookies in database
                await storage.storeLinkedInSession("default", cookies);

                console.log("[LinkedIn Auth] Session saved successfully!");

                // Close browser
                await this.cleanup();

                return {
                    success: true,
                    message: "LinkedIn account connected successfully!",
                };

            } catch (waitError: any) {
                if (waitError.message.includes('timeout')) {
                    console.log("[LinkedIn Auth] Login timeout - user took too long");
                    await this.cleanup();
                    return {
                        success: false,
                        message: "Login timeout. Please try again and complete login within 5 minutes.",
                    };
                }
                throw waitError;
            }

        } catch (error: any) {
            console.error("[LinkedIn Auth] Error during authentication:", error);
            await this.cleanup();
            return {
                success: false,
                message: `Authentication failed: ${error.message}`,
            };
        }
    }

    /**
     * Check if user has valid LinkedIn session
     */
    async checkStatus(): Promise<{
        connected: boolean;
        expiresAt?: Date;
        lastUsedAt?: Date;
    }> {
        const isValid = await storage.isSessionValid();
        if (!isValid) {
            return { connected: false };
        }

        const session = await storage.getLinkedInSession();
        if (!session) {
            return { connected: false };
        }

        return {
            connected: true,
            expiresAt: session.expiresAt,
            lastUsedAt: session.lastUsedAt || undefined,
        };
    }

    /**
     * Logout - clear stored session
     */
    async logout(): Promise<void> {
        await storage.deleteLinkedInSession();
        console.log("[LinkedIn Auth] Session cleared");
    }

    /**
     * Get stored cookies for use in scraping
     */
    async getCookies(): Promise<Cookie[] | null> {
        const session = await storage.getLinkedInSession();
        if (!session || !session.cookies) {
            return null;
        }

        // Cookies are stored as JSONB, return them as array
        return session.cookies as Cookie[];
    }

    /**
     * Clean up browser resources
     */
    private async cleanup() {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
            }
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
        } catch (error) {
            console.error("[LinkedIn Auth] Cleanup error:", error);
        }
    }
}

export const linkedInAuthService = new LinkedInAuthService();
