import { Router } from "express";
import { storage } from "../storage";
import { snovioService } from "../services/snovio";
import { apolloEnrichmentService } from "../services/apollo-enrichment";

const router = Router();

router.post("/snovio/search", async (req, res) => {
    try {
        const { profileId } = req.body;

        if (!profileId) {
            return res.status(400).json({ success: false, message: "Profile ID is required" });
        }

        // Get the profile to find the URL
        const profiles = await storage.getScrapedProfiles();
        const profile = profiles.find(p => p.id === profileId);

        if (!profile) {
            return res.status(404).json({ success: false, message: "Profile not found" });
        }

        if (!profile.url) {
            return res.status(400).json({ success: false, message: "Profile does not have a LinkedIn URL" });
        }

        const email = await snovioService.searchByUrl(profile.url);

        if (email) {
            // Update the profile with the found email
            await storage.updateScrapedProfile(profileId, { email });
            return res.json({ success: true, email });
        } else {
            return res.json({ success: false, message: "No email found" });
        }

    } catch (error: any) {
        console.error("Snov.io Enrichment Error:", error);
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

export default router;
