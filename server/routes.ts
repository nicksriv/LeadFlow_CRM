import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertLeadSchema, 
  insertConversationSchema,
  insertEmailTemplateSchema,
  insertUserSchema,
  insertAssignmentRuleSchema,
  insertTaskSchema,
  insertScoringConfigSchema,
} from "@shared/schema";
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

  // Email Template routes
  app.get("/api/email-templates", async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/email-templates", async (req, res) => {
    try {
      const validatedData = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(validatedData);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/email-templates/:id", async (req, res) => {
    try {
      const validatedData = insertEmailTemplateSchema.partial().parse(req.body);
      const template = await storage.updateEmailTemplate(req.params.id, validatedData);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/email-templates/:id", async (req, res) => {
    try {
      await storage.deleteEmailTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/leads/:id/send-email", async (req, res) => {
    try {
      const { subject, body } = req.body;
      
      if (!subject || !subject.trim()) {
        return res.status(400).json({ error: "Subject is required" });
      }
      if (!body || !body.trim()) {
        return res.status(400).json({ error: "Body is required" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const syncState = await storage.getSyncState();
      if (!syncState || !syncState.accessToken) {
        const conversation = await storage.createConversation({
          leadId: lead.id,
          subject,
          body,
          fromEmail: "your-crm@example.com",
          toEmail: lead.email,
          sentAt: new Date(),
          isFromLead: 0,
          messageId: null,
        });

        await storage.createActivity({
          leadId: lead.id,
          type: "email_sent",
          description: `Email sent: "${subject}" (local only - MS 365 not configured)`,
          metadata: { conversationId: conversation.id },
        });

        return res.json({ 
          success: true, 
          conversation,
          warning: "Email stored locally. Configure MS 365 to send actual emails." 
        });
      }

      const emailResult = await ms365Integration.sendEmail({
        to: lead.email,
        subject,
        body,
        accessToken: syncState.accessToken,
      });

      if (!emailResult.success) {
        return res.status(500).json({ error: "Failed to send email via MS 365" });
      }

      const conversation = await storage.createConversation({
        leadId: lead.id,
        subject,
        body,
        fromEmail: "your-crm@example.com",
        toEmail: lead.email,
        sentAt: new Date(),
        isFromLead: 0,
        messageId: emailResult.messageId,
      });

      await storage.createActivity({
        leadId: lead.id,
        type: "email_sent",
        description: `Email sent via MS 365: "${subject}"`,
        metadata: { conversationId: conversation.id, messageId: emailResult.messageId },
      });

      res.json({ success: true, conversation, sent: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // User routes - Order matters! Specific routes before parameterized ones
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Specific routes MUST come before /api/users/:id
  app.get("/api/users/role/:role", async (req, res) => {
    try {
      const users = await storage.getUsersByRole(req.params.role);
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/subordinates", async (req, res) => {
    try {
      const subordinates = await storage.getUsersByManager(req.params.id);
      res.json(subordinates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generic :id route must come AFTER specific routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const validatedData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, validatedData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Lead ownership routes
  app.get("/api/leads/owner/:ownerId", async (req, res) => {
    try {
      const leads = await storage.getLeadsByOwner(req.params.ownerId);
      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Assignment Rule routes
  app.get("/api/assignment-rules", async (req, res) => {
    try {
      const rules = await storage.getAssignmentRules();
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/assignment-rules", async (req, res) => {
    try {
      const validatedData = insertAssignmentRuleSchema.parse(req.body);
      const rule = await storage.createAssignmentRule(validatedData);
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/assignment-rules/:id", async (req, res) => {
    try {
      const validatedData = insertAssignmentRuleSchema.partial().parse(req.body);
      const rule = await storage.updateAssignmentRule(req.params.id, validatedData);
      if (!rule) {
        return res.status(404).json({ error: "Rule not found" });
      }
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/assignment-rules/:id", async (req, res) => {
    try {
      await storage.deleteAssignmentRule(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/leads/:id/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks(req.params.id);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      
      await storage.createActivity({
        leadId: task.leadId,
        type: "task_created",
        description: `Task created: "${task.title}"`,
        metadata: { taskId: task.id },
      });

      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(req.params.id, validatedData);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (validatedData.status === "completed" && task.status === "completed") {
        await storage.createActivity({
          leadId: task.leadId,
          type: "task_completed",
          description: `Task completed: "${task.title}"`,
          metadata: { taskId: task.id },
        });
      }

      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Scoring Config routes
  app.get("/api/scoring-config", async (req, res) => {
    try {
      const config = await storage.getScoringConfig();
      res.json(config || { 
        sentimentWeight: 25, 
        engagementWeight: 25, 
        responseTimeWeight: 25, 
        intentWeight: 25 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/scoring-config", async (req, res) => {
    try {
      const validatedData = insertScoringConfigSchema.parse(req.body);
      const config = await storage.updateScoringConfig(validatedData);
      res.json(config);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
