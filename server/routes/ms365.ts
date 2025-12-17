import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage.js";
import AuthService from "../auth.js";

const router = Router();

// Protect routes with authentication
router.use(AuthService.requireAuth);

/**
 * GET /api/ms365/status
 * Check if MS365 is connected
 */
router.get("/status", async (req: Request, res: Response) => {
    try {
        const syncState = await storage.getSyncState();
        res.json({
            connected: syncState?.isConfigured === 1,
            lastSyncAt: syncState?.lastSyncAt,
        });
    } catch (error: any) {
        console.error("[MS365] Status check error:", error);
        res.status(500).json({
            connected: false,
            error: error.message,
        });
    }
});

/**
 * POST /api/ms365/disconnect
 * Disconnect MS365 account (clear tokens and configuration)
 */
router.post("/disconnect", async (req: Request, res: Response) => {
    try {
        await storage.updateSyncState({
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            deltaToken: null,
            isConfigured: 0,
        });

        res.json({
            success: true,
            message: "MS365 account disconnected successfully",
        });
    } catch (error: any) {
        console.error("[MS365] Disconnect error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to disconnect MS365",
        });
    }
});

export default router;
