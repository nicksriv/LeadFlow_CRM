import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage.js";
import OpenAI from "openai";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { LinkedApiService } from "../services/linkedapi.js";
import { ms365Integration } from "../ms365.js";
import AuthService from "../auth.js";

const linkedApi = new LinkedApiService();

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const router = Router();

// Protect all LinkedIn routes with authentication
router.use(AuthService.requireAuth);

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy",
});

// Helper to launch browser and set cookie
async function getAuthenticatedPage(cookie: string) {
    const browser = await puppeteer.launch({
        headless: false, // Run in visible mode to avoid detection
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--start-maximized',
        ],
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set the LinkedIn session cookie
    await page.setCookie({
        name: "li_at",
        value: cookie,
        domain: ".linkedin.com",
        path: "/",
        httpOnly: true,
        secure: true,
    });

    // Set a realistic user agent
    await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Set additional headers
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    return { browser, page };
}

router.post("/search", async (req, res) => {
    try {
        const { jobTitle, industry, keywords, company, page, limit } = req.body;

        console.log(`[LinkedIn Search] Searching for: ${jobTitle} in ${industry} with keywords: ${keywords}, page: ${page || 1}, limit: ${limit || 10}`);

        // Use authenticated scraper instead of LinkedAPI
        const { linkedInScraper } = await import("../services/linkedin-scraper.js");

        const searchResponse = await linkedInScraper.searchPeople(req.user!.id, {
            jobTitle,
            industry,
            keywords,
            company
        });

        console.log(`[LinkedIn Search] Found ${searchResponse.results.length} results on page ${searchResponse.pagination.page}`);

        // Return full response with pagination metadata
        res.json(searchResponse);

    } catch (error: any) {
        console.error("Search error:", error);

        // Check if it's an authentication error
        if (error.message?.includes("Not authenticated")) {
            return res.status(401).json({
                error: "Not authenticated",
                message: "Please connect your LinkedIn account first"
            });
        }

        res.status(500).json({
            error: "Search failed",
            message: error.message
        });
    }
});

// Get profile history grouped by search criteria
router.get("/history", async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { profileHistoryService } = await import("../services/profile-history.js");

        const start = startDate ? new Date(startDate as string) : undefined;
        const end = endDate ? new Date(endDate as string) : undefined;

        const groupedHistory = await profileHistoryService.getHistoryGrouped(
            req.user!.id,
            start,
            end
        );

        res.json(groupedHistory);
    } catch (error: any) {
        console.error("History fetch error:", error);
        res.status(500).json({
            error: "Failed to fetch history",
            message: error.message
        });
    }
});

// Get profile history statistics
router.get("/history/stats", async (req, res) => {
    try {
        const { profileHistoryService } = await import("../services/profile-history.js");

        const stats = await profileHistoryService.getStats(req.user!.id);

        res.json(stats);
    } catch (error: any) {
        console.error("Stats fetch error:", error);
        res.status(500).json({
            error: "Failed to fetch stats",
            message: error.message
        });
    }
});

// Delete old history entries (optional cleanup)
router.delete("/history/cleanup", async (req, res) => {
    try {
        const { days = 90 } = req.body;
        const { profileHistoryService } = await import("../services/profile-history.js");

        const deleted = await profileHistoryService.deleteOlderThan(req.user!.id, Number(days));

        res.json({
            message: `Deleted ${deleted} old entries`,
            deleted
        });
    } catch (error: any) {
        console.error("Cleanup error:", error);
        res.status(500).json({
            error: "Cleanup failed",
            message: error.message
        });
    }
});

router.post("/scrape", async (req, res) => {
    try {
        const { url, profileId, name } = req.body;

        if (!url && !profileId) {
            return res.status(400).json({ message: "URL or profileId is required" });
        }

        console.log(`[LinkedIn Scraper] Scraping:`, { url, profileId, name });

        // Use authenticated scraper
        const { linkedInScraper } = await import("../services/linkedin-scraper.js");

        // Construct profile URL if we have profileId
        const profileUrl = url || `https://www.linkedin.com/in/${profileId}`;

        const profile = await linkedInScraper.scrapeProfile(req.user!.id, profileUrl, name);

        console.log("[LinkedIn Scraper] Starting archive save process...");
        console.log("[LinkedIn Scraper] Profile URL:", profileUrl);
        console.log("[LinkedIn Scraper] Profile data:", {
            name: profile.name,
            headline: profile.headline,
            url: profileUrl,
            currentCompany: profile.currentCompany,  // Debug company extraction
            hasProfileImageUrl: !!profile.profileImageUrl,  // Fix: it's profileImageUrl not avatar
            hasEmail: !!profile.email
        });

        // Save to archives - check if profile already exists for this user
        try {
            console.log("[LinkedIn Scraper] Fetching existing profiles for user:", req.user!.id);
            const existingProfiles = await storage.getScrapedProfiles(req.user!);
            console.log("[LinkedIn Scraper] Found", existingProfiles.length, "existing profiles");

            // Normalize URLs for comparison (remove trailing slashes, query params)
            const normalizeUrl = (url: string) => url.replace(/\/+$/, '').split('?')[0];
            const normalizedProfileUrl = normalizeUrl(profileUrl);
            const existingProfile = existingProfiles.find(p => normalizeUrl(p.url) === normalizedProfileUrl);

            if (existingProfile) {
                console.log("[LinkedIn Scraper] Updating existing profile:", existingProfile.id);

                // Build update object - only include fields that have meaningful new data
                const updateData: any = {
                    name: profile.name,
                    headline: profile.headline || existingProfile.headline || '',
                    location: profile.location || existingProfile.location || '',
                    avatar: profile.profileImageUrl || existingProfile.avatar || null,  // Fix: profileImageUrl not avatar
                    about: profile.about || existingProfile.about || null,
                    skills: (profile.skills && profile.skills.length > 0) ? profile.skills : existingProfile.skills || [],
                    company: profile.currentCompany || existingProfile.company || null,
                };

                // CRITICAL: Don't overwrite real email with fallback email
                const isFallbackEmail = (email: string | null | undefined) => !email || email === 'technology@codescribed.com';
                if (!isFallbackEmail(profile.email)) {
                    // New profile has real email - use it
                    updateData.email = profile.email;
                } else if (!isFallbackEmail(existingProfile.email)) {
                    // Existing profile has real email - keep it
                    updateData.email = existingProfile.email;
                } else {
                    // Both are fallback - use null
                    updateData.email = null;
                }

                await storage.updateScrapedProfile(req.user!.id, existingProfile.id, updateData);
                console.log("[LinkedIn Scraper] ✅ Profile updated in archives");
            } else {
                console.log("[LinkedIn Scraper] Creating new archive entry");
                // Create new archive entry
                const isFallbackEmail = (email: string | null) => !email || email === 'technology@codescribed.com';
                const savedProfile = await storage.createScrapedProfile(req.user!.id, {
                    name: profile.name,
                    headline: profile.headline || '',
                    location: profile.location || '',
                    url: profileUrl,
                    email: isFallbackEmail(profile.email) ? null : profile.email,
                    avatar: profile.profileImageUrl || null,  // Fix: profileImageUrl not avatar
                    about: profile.about || null,
                    skills: profile.skills || [],
                    company: profile.currentCompany || null,
                });
                console.log("[LinkedIn Scraper] ✅ Profile saved to archives with ID:", savedProfile.id);
            }
        } catch (archiveError) {
            console.error("[LinkedIn Scraper] ❌ Failed to save to archives:", archiveError);
            console.error("[LinkedIn Scraper] Error details:", archiveError);
            // Don't fail the request if archiving fails - still return the profile data
        }

        console.log("[LinkedIn Scraper] Scraped profile:", profile);
        return res.json(profile);

    } catch (error: any) {
        console.error("Scraping error:", error);

        // Check if it's an authentication error
        if (error.message?.includes("Not authenticated")) {
            return res.status(401).json({
                message: "LinkedIn account not connected. Please connect your LinkedIn account first.",
                needsAuth: true
            });
        }

        res.status(500).json({ message: error.message || "Failed to scrape profile" });
    }
});

router.post("/generate-email", async (req, res) => {
    try {
        const { profile, productContext } = req.body;

        if (!profile) {
            return res.status(400).json({ message: "Profile data is required" });
        }

        // Simulate AI generation if no API key or dummy key
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith("dummy")) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return res.json({
                subject: `Partnership opportunity for ${profile.headline.split(" at ")[1] || "your company"}`,
                body: `Hi ${profile.name.split(" ")[0]},\n\nI came across your profile and was impressed by your work as ${profile.headline}.\n\n${profile.about ? `Reading about your experience in ${profile.about.substring(0, 50)}... caught my eye.` : ""}\n\nGiven your background, I thought you might be interested in our solution, ${productContext || "LeadFlow CRM"}.\n\nWould you be open to a quick chat?\n\nBest regards,\n[Your Name]`,
            });
        }

        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an expert sales copywriter. Generate a personalized cold email based on the provided LinkedIn profile data and product context.",
                },
                {
                    role: "user",
                    content: `
            Profile Name: ${profile.name}
            Headline: ${profile.headline}
            About: ${profile.about}
            Recent Posts: ${profile.posts.join("\n")}
            
            Product Context: ${productContext || "LeadFlow CRM - An all-in-one CRM for growing businesses."}
            
            Generate a JSON response with "subject" and "body" fields.
          `,
                },
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("No content generated");
        }

        const email = JSON.parse(content);
        res.json(email);
    } catch (error) {
        console.error("AI Generation error:", error);
        res.status(500).json({ message: "Failed to generate email" });
    }
});

router.post("/send-email", async (req, res) => {
    try {
        const { to, subject, body, profile } = req.body;

        let emailSent = false;
        let sendMethod = "mock";

        // Try to send via MS365 if configured for this user
        const syncState = await storage.getSyncStateForUser(req.user!.id);

        if (syncState && syncState.isConfigured === 1) {
            try {
                console.log(`[MS365] Attempting to send email to: ${to}`);
                const accessToken = await ms365Integration.ensureValidToken(req.user!.id);
                await ms365Integration.sendEmail({
                    to,
                    subject,
                    body,
                    accessToken,
                    userId: req.user!.id,
                });
                console.log(`[MS365] Email sent successfully to: ${to}`);
                emailSent = true;
                sendMethod = "ms365";
            } catch (ms365Error) {
                console.error("[MS365] Failed to send email, falling back to mock:", ms365Error);
                // Fall through to mock sender
            }
        }

        // Fallback to mock if MS365 not configured or failed
        if (!emailSent) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log(`[Mock Email Sender] Sending to: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body: ${body}`);
        }

        // CRM Integration: Create Lead and Conversation
        if (profile && to) {
            try {
                // 1. Check if lead exists - use LinkedIn URL as unique identifier
                const leads = await storage.getLeads(req.user!);
                let lead = leads.find(l => l.linkedinUrl === profile.url);

                // 2. If not found by URL, create new lead
                if (!lead) {
                    console.log("[CRM Integration] Creating new lead for:", profile.name, "with URL:", profile.url);
                    lead = await storage.createLead({
                        name: profile.name,
                        email: to,
                        position: profile.headline,
                        linkedinUrl: profile.url,  // Unique identifier
                        city: profile.location,
                        status: "cold", // New lead starts as cold
                        source: "linkedin_outreach",
                        ownerId: req.user!.id,  // Set owner to current user
                    } as any);
                    console.log("[CRM Integration] Created new lead:", lead.id, "with owner:", req.user!.id);
                } else {
                    console.log("[CRM Integration] Found existing lead by LinkedIn URL:", lead.id);
                    // Update email if changed
                    if (lead.email !== to) {
                        await storage.updateLead(lead.id, { email: to });
                        console.log("[CRM Integration] Updated lead email");
                    }
                    // Update lead status to "contacted" if currently "cold"
                    if (lead.status === "cold") {
                        await storage.updateLead(lead.id, { status: "warm" });
                        console.log("[CRM Integration] Updated lead status to 'warm'");
                    }
                }

                // 3. Create conversation
                if (lead) {
                    console.log("[CRM Integration] Logging conversation for lead:", lead.id);
                    await storage.createConversation({
                        leadId: lead.id,
                        subject: subject,
                        body: body,
                        fromEmail: "user@example.com", // TODO: Get from authenticated user
                        toEmail: to,
                        sentAt: new Date(),
                        isFromLead: 0
                    });
                    console.log("[CRM Integration] Conversation logged successfully");
                }
            } catch (crmError) {
                console.error("[CRM Integration] Failed to create lead/conversation:", crmError);
                // Don't fail the request if CRM integration fails, just log it
            }
        }

        const message = sendMethod === "ms365"
            ? "Email sent via MS365 and logged to CRM"
            : "Email sent (Mock) and logged to CRM";

        res.json({ success: true, message });
    } catch (error) {
        console.error("Email sending error:", error);
        res.status(500).json({ message: "Failed to send email" });
    }
});

// Get archived profiles
router.get("/archives", async (req: Request, res: Response) => {
    try {
        // Get scraped profiles (role-based access)
        const profiles = await storage.getScrapedProfiles(req.user!);
        res.json(profiles);
    } catch (error: any) {
        console.error("Failed to fetch archives:", error);
        res.status(500).json({ message: "Failed to fetch archives" });
    }
});

export default router;
