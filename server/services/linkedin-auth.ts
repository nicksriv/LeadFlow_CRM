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
     * Login using credentials via headless browser automation
     */
    async loginWithCredentials(userId: string, email: string, password: string): Promise<{ success: boolean; requires2FA?: boolean; message: string }> {
        try {
            console.log(`[LinkedIn Auth] Starting headless login automation for user ${userId}...`);

            if (!email || !password) {
                throw new Error("Email and password are required");
            }

            // Launch headless browser
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

            // Set viewport
            await this.page.setViewport({ width: 1366, height: 768 });

            // Set realistic user agent
            await this.page.setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Navigate to login page
            console.log("[LinkedIn Auth] Navigating to login page...");
            await this.page.goto('https://www.linkedin.com/login', {
                waitUntil: 'networkidle2',
                timeout: 60000,
            });

            // Type credentials
            console.log("[LinkedIn Auth] Entering credentials...");
            await this.page.type('#username', email, { delay: 100 });
            await this.page.type('#password', password, { delay: 100 });

            // Click login
            console.log("[LinkedIn Auth] Submitting form...");
            await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
                this.page.click('.btn__primary--large'),
            ]);

            // Check login status
            const url = this.page.url();
            console.log(`[LinkedIn Auth] Post-login URL: ${url}`);

            if (url.includes('/checkpoint/challenge')) {
                console.log("[LinkedIn Auth] 2FA Challenge detected. Waiting for code...");
                // DO NOT close browser. Return status to frontend.
                return {
                    success: false,
                    requires2FA: true,
                    message: "LinkedIn requires a verification code. Please enter the code sent to your email/phone.",
                };
            }

            if (url.includes('/login') || url.includes('uas/login-submit')) {
                throw new Error("Login failed. Please check your credentials.");
            }

            if (url.includes('/feed') || url.includes('/mynetwork') || url.includes('/messaging')) {
                console.log("[LinkedIn Auth] Login successful! Capturing cookies...");

                // Get cookies
                const cookies = await this.page.cookies();

                // Verify li_at exists
                const liAtCookie = cookies.find((c: Cookie) => c.name === 'li_at');
                if (!liAtCookie) {
                    throw new Error('Login appeared successful but session cookie (li_at) was not found.');
                }

                // Store cookies with user's ID
                await storage.storeLinkedInSession(userId, cookies);
                console.log(`[LinkedIn Auth] Session saved successfully for user ${userId}!`);

                await this.cleanup();

                return {
                    success: true,
                    message: "LinkedIn account connected successfully!",
                };
            }

            throw new Error("Unknown login state. Please try again.");

        } catch (error: any) {
            console.error("[LinkedIn Auth] Error during credential login:", error);
            await this.cleanup();
            return {
                success: false,
                message: `Login failed: ${error.message}`,
            };
        }
    }

    /**
     * Submit 2FA code to the active browser session
     */
    async submit2FACode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
        try {
            if (!this.browser || !this.page) {
                throw new Error("No active login session found. Please try logging in again.");
            }

            console.log(`[LinkedIn Auth] Submitting 2FA code for user ${userId}...`);

            // Try multiple selectors for the verification code input (LinkedIn changes these frequently)
            const possibleSelectors = [
                'input[name="pin"]',
                'input#input__phone_verification_pin',
                'input#input__email_verification_pin',
                'input[aria-label*="verification"]',
                'input[aria-label*="code"]',
                'input[data-testid*="verification"]',
                'input[type="text"][autocomplete="one-time-code"]',
                'input[inputmode="numeric"]',
                '#verification-code',
                '.input_verification_pin',
                'input.challenge-form__input'
            ];

            let inputSelector: string | null = null;
            for (const selector of possibleSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 2000 });
                    inputSelector = selector;
                    console.log(`[LinkedIn Auth] Found 2FA input using selector: ${selector}`);
                    break;
                } catch {
                    // Try next selector
                }
            }

            if (!inputSelector) {
                throw new Error('Could not find 2FA verification code input field. LinkedIn may have changed their page structure.');
            }

            await this.page.type(inputSelector, code, { delay: 100 });

            // Click submit button - try multiple selectors
            const submitSelectors = [
                'button#two-step-submit-button',
                'button[type="submit"]',
                'button[data-testid="submit-button"]',
                'button.primary-action',
                'button:has-text("Submit")',
                'button:has-text("Verify")'
            ];

            let submitSelector: string | null = null;
            for (const selector of submitSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 2000 });
                    submitSelector = selector;
                    console.log(`[LinkedIn Auth] Found submit button using selector: ${selector}`);
                    break;
                } catch {
                    // Try next selector
                }
            }

            if (!submitSelector) {
                throw new Error('Could not find submit button. LinkedIn may have changed their page structure.');
            }

            await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
                this.page.click(submitSelector),
            ]);

            // Verify success
            const url = this.page.url();
            console.log(`[LinkedIn Auth] Post-2FA URL: ${url}`);

            if (url.includes('/feed') || url.includes('/mynetwork') || url.includes('/messaging')) {
                console.log("[LinkedIn Auth] 2FA successful! Capturing cookies...");

                const cookies = await this.page.cookies();
                const liAtCookie = cookies.find((c: Cookie) => c.name === 'li_at');

                if (!liAtCookie) {
                    throw new Error('2FA successful but session cookie (li_at) was not found.');
                }

                await storage.storeLinkedInSession(userId, cookies);
                console.log(`[LinkedIn Auth] Session saved successfully for user ${userId}!`);

                await this.cleanup();

                return {
                    success: true,
                    message: "LinkedIn account connected successfully!",
                };
            }

            throw new Error("2FA verification failed. Please check the code and try again.");

        } catch (error: any) {
            console.error("[LinkedIn Auth] Error during 2FA submission:", error);
            await this.cleanup(); // Cleanup on error to reset state
            return {
                success: false,
                message: `Verification failed: ${error.message}`,
            };
        }
    }

    /**
     * Check if user has valid LinkedIn session
     */
    async checkStatus(userId: string): Promise<{
        connected: boolean;
        expiresAt?: Date;
        lastUsedAt?: Date;
    }> {
        const session = await storage.getLinkedInSession(userId);
        if (!session) {
            return { connected: false };
        }

        const isValid = await storage.isSessionValid(userId);
        if (!isValid) {
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
    async logout(userId: string): Promise<void> {
        await storage.deleteLinkedInSession(userId);
        console.log(`[LinkedIn Auth] Session cleared for user ${userId}`);
    }

    /**
     * Get stored cookies for use in scraping
     */
    async getCookies(userId: string): Promise<Cookie[] | null> {
        const session = await storage.getLinkedInSession(userId);
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
