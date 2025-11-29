import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage.js";
import OpenAI from "openai";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { LinkedApiService } from "../services/linkedapi.js";

const linkedApi = new LinkedApiService();

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const router = Router();

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
        const { jobTitle, industry, keywords } = req.body;

        console.log(`[LinkedIn Search] Searching for: ${jobTitle} in ${industry} with keywords: ${keywords}`);

        // Use authenticated scraper instead of LinkedAPI
        const { linkedInScraper } = await import("../services/linkedin-scraper.js");

        const results = await linkedInScraper.searchPeople({
            jobTitle,
            industry,
            keywords
        });

        console.log(`[LinkedIn Search] Found ${results.length} results`);

        // If no results, provide helpful message
        if (results.length === 0) {
            return res.status(200).json({
                results: [],
                message: "No profiles found. Try: (1) Broader job titles, (2) Company-specific searches, or (3) Different locations."
            });
        }

        // Return results in consistent format
        res.json({ results });

    } catch (error: any) {
        console.error("Search error:", error);

        // Check if it's an authentication error
        if (error.message?.includes("Not authenticated")) {
            return res.status(401).json({
                message: "LinkedIn account not connected. Please connect your LinkedIn account first.",
                needsAuth: true
            });
        }

        res.status(500).json({ message: error.message || "Failed to search profiles" });
    }
});

router.post("/scrape", async (req, res) => {
    try {
        const { url, profileId } = req.body;

        if (!url && !profileId) {
            return res.status(400).json({ message: "URL or profileId is required" });
        }

        console.log(`[LinkedIn Scraper] Scraping:`, { url, profileId });

        // Use authenticated scraper
        const { linkedInScraper } = await import("../services/linkedin-scraper.js");

        // Construct profile URL if we have profileId
        const profileUrl = url || `https://www.linkedin.com/in/${profileId}`;

        const profile = await linkedInScraper.scrapeProfile(profileUrl);

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

        // Simulate sending delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log(`[Mock Email Sender] Sending to: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${body}`);

        // CRM Integration: Create Lead and Conversation
        if (profile && to) {
            try {
                // 1. Check if lead exists
                const leads = await storage.getLeads();
                let lead = leads.find(l => l.email === to);

                // 2. If not, create new lead
                if (!lead) {
                    console.log("[CRM Integration] Creating new lead for:", to);
                    lead = await storage.createLead({
                        name: profile.name,
                        email: to,
                        position: profile.headline,
                        linkedinUrl: profile.url,
                        // Parse location if possible, otherwise store in city
                        city: profile.location,
                        status: "cold",
                        source: "linkedin_outreach"
                    } as any); // Type cast as source might not be in schema yet, but extra fields are usually ignored or handled
                } else {
                    console.log("[CRM Integration] Found existing lead:", lead.id);
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
                }
            } catch (crmError) {
                console.error("[CRM Integration] Failed to create lead/conversation:", crmError);
                // Don't fail the request if CRM integration fails, just log it
            }
        }

        res.json({ success: true, message: "Email sent successfully (Mock) and logged to CRM" });
    } catch (error) {
        console.error("Email sending error:", error);
        res.status(500).json({ message: "Failed to send email" });
    }
});

// Get archived profiles
router.get("/archives", async (req, res) => {
    try {
        const profiles = await storage.getScrapedProfiles();
        res.json(profiles);
    } catch (error: any) {
        console.error("Failed to fetch archives:", error);
        res.status(500).json({ message: "Failed to fetch archives" });
    }
});

export default router;
