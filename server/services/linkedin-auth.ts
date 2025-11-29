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
    /**
     * Validate and store manually provided LinkedIn cookie
     */
    async validateAndStoreCookie(li_at: string): Promise<{ success: boolean; message: string }> {
        try {
            console.log("[LinkedIn Auth] Validating provided cookie...");

            if (!li_at) {
                throw new Error("No cookie provided");
            }

            // Create a temporary browser instance to validate the cookie
            // We use the same headless config as the scraper
            this.browser = await puppeteer.launch({
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-blink-features=AutomationControlled',
                ],
            });

            this.page = await this.browser.newPage();

            // Set cookie
            await this.page.setCookie({
                name: 'li_at',
                value: li_at,
                domain: '.linkedin.com',
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'None',
            });

            // Navigate to LinkedIn feed to verify
            console.log("[LinkedIn Auth] Navigating to LinkedIn to verify session...");
            await this.page.goto('https://www.linkedin.com/feed/', {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });

            const url = this.page.url();
            const isLoggedIn = url.includes('/feed') || url.includes('/mynetwork');

            if (!isLoggedIn) {
                throw new Error("Invalid cookie or session expired. Please try getting a fresh cookie.");
            }

            console.log("[LinkedIn Auth] Cookie validated successfully!");

            // Get all cookies (in case LinkedIn added more)
            const cookies = await this.page.cookies();

            // Store cookies in database
            await storage.storeLinkedInSession("default", cookies);

            console.log("[LinkedIn Auth] Session saved successfully!");

            await this.cleanup();

            return {
                success: true,
                message: "LinkedIn account connected successfully!",
            };

        } catch (error: any) {
            console.error("[LinkedIn Auth] Error during cookie validation:", error);
            await this.cleanup();
            return {
                success: false,
                message: `Validation failed: ${error.message}`,
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
