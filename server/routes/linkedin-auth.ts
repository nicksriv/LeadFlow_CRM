import { Router } from "express";
import type { Request, Response } from "express";
import { linkedInAuthService } from "../services/linkedin-auth.js";

const router = Router();

/**
 * POST /api/linkedin/auth/login
 * Initiates LinkedIn authentication flow
 * Opens browser window for user to login
 */
router.post("/login", async (req: Request, res: Response) => {
    try {
        console.log("[LinkedIn Auth API] Starting authentication flow...");

        const result = await linkedInAuthService.initiateLogin();

        if (result.success) {
            res.json({ success: true, message: result.message });
        } else {
            res.status(400).json({ success: false, message: result.message });
        }
    } catch (error: any) {
        console.error("[LinkedIn Auth API] Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to initiate authentication"
        });
    }
});

/**
 * GET /api/linkedin/auth/status
 * Check if user has valid LinkedIn session
 */
router.get("/status", async (req: Request, res: Response) => {
    try {
        const status = await linkedInAuthService.checkStatus();
        res.json(status);
    } catch (error: any) {
        console.error("[LinkedIn Auth API] Status check error:", error);
        res.status(500).json({
            connected: false,
            error: error.message
        });
    }
});

/**
 * POST /api/linkedin/auth/logout
 * Clear stored LinkedIn session
 */
router.post("/logout", async (req: Request, res: Response) => {
    try {
        await linkedInAuthService.logout();
        res.json({ success: true, message: "LinkedIn session cleared" });
    } catch (error: any) {
        console.error("[LinkedIn Auth API] Logout error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to logout"
        });
    }
});

export default router;
