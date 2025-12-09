import { Router } from "express";
import { storage } from "../storage.js";
import { DatagmaService } from "../services/datagma.js";
import { ApifyEnrichmentService } from "../services/apify-enrichment.js";
import { apolloEnrichmentService } from "../services/apollo-enrichment.js";
import { hunterEnrichmentService } from "../services/hunter-enrichment.js";

const router = Router();

// Initialize Datagma service
const datagmaService = new DatagmaService();
const apifyEnrichmentService = new ApifyEnrichmentService();

// Datagma Enrichment Endpoint (replaces FullEnrich)
router.post("/fullenrich/search", async (req, res) => {
    try {
        const { profileId } = req.body;

        console.log('[Datagma Route] Enriching profile:', profileId);

        // Get profile from database
        const profiles = await storage.getScrapedProfiles();
        const profile = profiles.find(p => p.id === profileId);

        if (!profile) {
            return res.status(404).json({ success: false, message: "Profile not found" });
        }

        if (!profile.url) {
            return res.status(400).json({ success: false, message: "Profile has no LinkedIn URL" });
        }

        // Enrich using Datagma
        const email = await datagmaService.enrichByLinkedInUrl(profile.url);

        // Use found email or fallback for development
        const finalEmail = email || 'technology@codescribed.com';
        const emailSource = email ? 'datagma' : 'fallback';

        console.log(`[Datagma Route] Using email: ${finalEmail} (source: ${emailSource})`);

        // Update profile with email
        await storage.updateScrapedProfile(profileId, {
            email: finalEmail,
            emailConfidence: email ? 95 : 50 // Lower confidence for fallback emails
        });

        console.log('[Datagma Route] Email updated in profile');

        // Also update or create lead if profile has name
        if (profile.name) {
            const leads = await storage.getLeads();
            let lead = leads.find(l => l.email === finalEmail || l.linkedinUrl === profile.url);

            if (lead) {
                await storage.updateLead(lead.id, { email: finalEmail });
            } else {
                await storage.createLead({
                    name: profile.name,
                    email: finalEmail,
                    position: profile.headline,
                    linkedinUrl: profile.url,
                    city: profile.location,
                    status: "cold"
                } as any);
            }
        }

        return res.json({
            success: true,
            email: finalEmail,
            source: emailSource
        });

    } catch (error: any) {
        console.error("Datagma Enrichment Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post("/apify/bulk-enrich", async (req, res) => {
    try {
        const { jobTitle, location, industry, keywords } = req.body;

        console.log('[Apify Route] Starting bulk enrichment with criteria:', { jobTitle, location, industry, keywords });

        // Get Apify results
        const apifyLeads = await apifyEnrichmentService.bulkEnrich({
            jobTitle,
            location,
            industry,
            keywords
        });

        console.log(`[Apify Route] Received ${apifyLeads.length} leads from Apify`);

        if (apifyLeads.length > 0) {
            console.log('[Apify Route] First lead sample:', JSON.stringify(apifyLeads[0], null, 2));
        }

        // Save ALL Apify results to database
        const searchCriteria = { jobTitle, location, industry, keywords };
        let savedCount = 0;

        for (const lead of apifyLeads) {
            try {
                await storage.createApifyResult({
                    fullName: lead.full_name,
                    firstName: lead.first_name,
                    lastName: lead.last_name,
                    email: lead.email,
                    jobTitle: lead.job_title,
                    linkedinUrl: lead.linkedin,
                    companyName: lead.company_name,
                    companyDomain: lead.company_domain,
                    location: lead.city || lead.state || lead.country || '',
                    industry: lead.industry || '',
                    searchCriteria,
                });
                savedCount++;
            } catch (saveError: any) {
                console.error('[Apify Route] Error saving lead:', saveError.message);
                console.error('[Apify Route] Lead data:', lead);
            }
        }

        console.log(`[Apify Route] Saved ${savedCount}/${apifyLeads.length} leads to database`);

        // Get scraped profiles without emails
        const profiles = await storage.getScrapedProfiles();
        const profilesWithoutEmail = profiles.filter(p => !p.email);

        // Match profiles
        const matches = apifyEnrichmentService.matchProfiles(apifyLeads, profilesWithoutEmail);

        // Update profiles with emails and confidence scores
        for (const match of matches) {
            await storage.updateScrapedProfile(match.profileId, {
                email: match.email,
                emailConfidence: match.confidence
            });
        }

        return res.json({
            success: true,
            enrichedCount: matches.length,
            totalProfiles: profilesWithoutEmail.length,
            apifyResultsCount: apifyLeads.length,
            savedToDatabase: savedCount
        });

    } catch (error: any) {
        console.error("Apify Enrichment Error:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get("/apify/results", async (req, res) => {
    try {
        // Return ALL Apify results from database
        const results = await storage.getApifyResults();
        return res.json(results);
    } catch (error: any) {
        console.error("Apify Results Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post("/apollo/enrich-profile", async (req, res) => {
    try {
        const { profileId } = req.body;

        if (!profileId) {
            return res.status(400).json({ success: false, message: "Profile ID is required" });
        }

        const result = await apolloEnrichmentService.enrichScrapedProfile(profileId);

        if (result.success) {
            return res.json(result);
        } else {
            return res.status(404).json(result);
        }

    } catch (error: any) {
        console.error("Apollo Enrichment Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post("/hunter/enrich-profile", async (req, res) => {
    try {
        const { profileUrl } = req.body;

        if (!profileUrl) {
            return res.status(400).json({ success: false, message: "Profile URL is required" });
        }

        const result = await hunterEnrichmentService.enrichScrapedProfile(profileUrl);

        if (result.success) {
            return res.json(result);
        } else {
            return res.status(404).json(result);
        }

    } catch (error: any) {
        console.error("Hunter.io Enrichment Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
