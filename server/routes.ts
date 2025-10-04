import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertConversationSchema } from "@shared/schema";
import { analyzeLeadConversations } from "./ai";
import { ms365Integration } from "./ms365";

export async function registerRoutes(app: Express): Promise<Server> {
  // Lead routes
  app.get("/api/leads", async (req, res) => {
    try {
      const allLeads = await storage.getLeads();
      res.json(allLeads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(validatedData);

      await storage.createActivity({
        leadId: lead.id,
        type: "lead_created",
        description: `Lead "${lead.name}" was created`,
        metadata: null,
      });

      res.json(lead);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const validatedData = insertLeadSchema.partial().parse(req.body);
      const lead = await storage.updateLead(req.params.id, validatedData);

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      await storage.createActivity({
        leadId: lead.id,
        type: "lead_updated",
        description: `Lead information was updated`,
        metadata: null,
      });

      res.json(lead);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      await storage.deleteLead(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Conversation routes
  app.get("/api/conversations", async (req, res) => {
    try {
      const allConversations = await storage.getConversations();
      const conversationsWithLeads = await Promise.all(
        allConversations.map(async (conv) => {
          const lead = await storage.getLead(conv.leadId);
          return { ...conv, lead };
        })
      );
      res.json(conversationsWithLeads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/leads/:id/conversations", async (req, res) => {
    try {
      const convs = await storage.getConversationsByLeadId(req.params.id);
      res.json(convs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);

      const lead = await storage.getLead(conversation.leadId);
      if (lead) {
        await storage.updateLead(lead.id, {
          lastContactedAt: conversation.sentAt,
        });

        await storage.createActivity({
          leadId: lead.id,
          type: conversation.isFromLead ? "email_received" : "email_sent",
          description: `Email ${conversation.isFromLead ? "received from" : "sent to"} lead: "${conversation.subject}"`,
          metadata: { conversationId: conversation.id },
        });

        const allConversations = await storage.getConversationsByLeadId(lead.id);
        const conversationsForAnalysis = allConversations.map((c) => ({
          subject: c.subject,
          body: c.body,
          isFromLead: c.isFromLead === 1,
          sentAt: c.sentAt,
        }));

        const analysis = await analyzeLeadConversations(
          lead.name,
          lead.email,
          conversationsForAnalysis
        );

        const previousScore = lead.score;
        const previousStatus = lead.status;

        await storage.updateLead(lead.id, {
          score: analysis.score,
          status: analysis.status,
        });

        await storage.createLeadScore({
          leadId: lead.id,
          score: analysis.score,
          previousScore,
          status: analysis.status,
          previousStatus,
          factors: analysis.factors,
        });

        if (analysis.score !== previousScore || analysis.status !== previousStatus) {
          await storage.createActivity({
            leadId: lead.id,
            type: "score_updated",
            description: `Lead score updated from ${previousScore} to ${analysis.score} (${previousStatus} → ${analysis.status})`,
            metadata: { factors: analysis.factors },
          });
        }
      }

      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Activity routes
  app.get("/api/leads/:id/activities", async (req, res) => {
    try {
      const acts = await storage.getActivities(req.params.id);
      res.json(acts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stats route
  app.get("/api/stats", async (req, res) => {
    try {
      const allLeads = await storage.getLeads();
      const allConversations = await storage.getConversations();

      const hotLeads = allLeads.filter((l) => l.status === "hot").length;
      const warmLeads = allLeads.filter((l) => l.status === "warm").length;
      const coldLeads = allLeads.filter((l) => l.status === "cold").length;

      const avgScore =
        allLeads.length > 0
          ? Math.round(
              allLeads.reduce((sum, l) => sum + l.score, 0) / allLeads.length
            )
          : 0;

      res.json({
        totalLeads: allLeads.length,
        hotLeads,
        warmLeads,
        coldLeads,
        avgScore,
        totalConversations: allConversations.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sync state routes
  app.get("/api/sync-state", async (req, res) => {
    try {
      const state = await storage.getSyncState();
      res.json(state || { isConfigured: 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sync/manual", async (req, res) => {
    try {
      const state = await storage.getSyncState();
      if (!state || state.isConfigured !== 1) {
        return res.status(400).json({
          error: "MS 365 integration not configured. Please configure it in Settings.",
        });
      }

      const result = await ms365Integration.syncEmailsWithLeads();

      res.json({
        success: true,
        message: `Sync completed. ${result.matched} emails matched with leads.`,
        ...result,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ms365/auth-url", async (req, res) => {
    try {
      const authUrl = ms365Integration.getAuthorizationUrl();
      res.json({ authUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
