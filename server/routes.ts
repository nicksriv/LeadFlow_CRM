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
  insertPipelineSchema,
  insertPipelineStageSchema,
  insertDealSchema,
  insertAutomationRuleSchema,
  type Lead,
} from "@shared/schema";
import { analyzeLeadConversations, summarizeConversations, draftEmailResponse, generateNextBestAction, analyzeSentimentTimeline, predictDealOutcome } from "./ai";
import { ms365Integration } from "./ms365";
import { automationEngine } from "./automation";

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

  // Apollo.io import routes
  app.post("/api/integrations/apollo/search", async (req, res) => {
    try {
      const { searchApolloContacts } = await import("./apollo");
      const filters = req.body;

      const result = await searchApolloContacts(filters);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/integrations/apollo/import", async (req, res) => {
    try {
      const { searchApolloContacts, mapApolloContactToLead } = await import("./apollo");
      const { filters, selectedContactIds } = req.body;

      // Search Apollo to get contacts
      const searchResult = await searchApolloContacts(filters);
      
      // Filter to only selected contacts if provided
      let contactsToImport = searchResult.contacts;
      if (selectedContactIds && Array.isArray(selectedContactIds) && selectedContactIds.length > 0) {
        contactsToImport = searchResult.contacts.filter(c => selectedContactIds.includes(c.id));
      }

      const importResults = {
        imported: [] as any[],
        skipped: [] as any[],
        errors: [] as any[],
      };

      // Import each contact
      for (const contact of contactsToImport) {
        try {
          // Map Apollo contact to Lead
          const leadData = mapApolloContactToLead(contact);

          // Check for duplicate by email
          if (leadData.email) {
            const existingLeads = await storage.getLeads();
            const duplicate = existingLeads.find(l => l.email === leadData.email);
            
            if (duplicate) {
              importResults.skipped.push({
                contact,
                reason: `Lead with email ${leadData.email} already exists`,
                existingLeadId: duplicate.id,
              });
              continue;
            }
          }

          // Create the lead
          const newLead = await storage.createLead(leadData as any);

          // Track import in enrichmentHistory table (repurposing for import tracking)
          await storage.createApolloEnrichment({
            leadId: newLead.id,
            enrichmentData: contact,
            fieldsEnriched: Object.keys(leadData),
            creditsUsed: 1,
            status: "success",
            errorMessage: null,
          });

          // Create activity
          await storage.createActivity({
            leadId: newLead.id,
            type: "lead_created",
            description: `Lead imported from Apollo.io`,
            metadata: { source: "apollo", apolloContactId: contact.id },
          });

          importResults.imported.push(newLead);
        } catch (error: any) {
          importResults.errors.push({
            contact,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        imported: importResults.imported.length,
        skipped: importResults.skipped.length,
        errors: importResults.errors.length,
        details: importResults,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Saleshandy import routes
  app.get("/api/integrations/saleshandy/prospects", async (req, res) => {
    try {
      const { fetchSaleshandyProspects } = await import("./saleshandy");
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;

      const result = await fetchSaleshandyProspects(page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/integrations/saleshandy/import", async (req, res) => {
    try {
      const { fetchSaleshandyProspects, mapSaleshandyProspectToLead } = await import("./saleshandy");
      const { page, limit, selectedProspectIds } = req.body;

      // Fetch Saleshandy prospects
      const fetchResult = await fetchSaleshandyProspects(page || 1, limit || 100);
      
      // Filter to only selected prospects if provided
      let prospectsToImport = fetchResult.prospects;
      if (selectedProspectIds && Array.isArray(selectedProspectIds) && selectedProspectIds.length > 0) {
        prospectsToImport = fetchResult.prospects.filter(p => selectedProspectIds.includes(p._id));
      }

      const importResults = {
        imported: [] as any[],
        skipped: [] as any[],
        errors: [] as any[],
      };

      // Import each prospect
      for (const prospect of prospectsToImport) {
        try {
          // Map Saleshandy prospect to Lead
          const leadData = mapSaleshandyProspectToLead(prospect);

          // Check for duplicate by email
          if (leadData.email) {
            const existingLeads = await storage.getLeads();
            const duplicate = existingLeads.find(l => l.email === leadData.email);
            
            if (duplicate) {
              importResults.skipped.push({
                prospect,
                reason: `Lead with email ${leadData.email} already exists`,
                existingLeadId: duplicate.id,
              });
              continue;
            }
          } else {
            // Skip prospects without email
            importResults.skipped.push({
              prospect,
              reason: "Prospect has no email address",
            });
            continue;
          }

          // Create the lead
          const newLead = await storage.createLead(leadData as any);

          // Track import in campaignProspects table (repurposing for import tracking)
          await storage.createSaleshandySequence({
            leadId: newLead.id,
            sequenceId: prospect._id,
            sequenceName: "Imported from Saleshandy",
            stepId: prospect._id,
            status: prospect.status || "active",
            lastActivityAt: prospect.updatedAt ? new Date(prospect.updatedAt) : null,
            emailsSent: 0,
            emailsOpened: 0,
            emailsClicked: 0,
            emailsReplied: 0,
          });

          // Create activity
          await storage.createActivity({
            leadId: newLead.id,
            type: "lead_created",
            description: `Lead imported from Saleshandy`,
            metadata: { source: "saleshandy", saleshandyProspectId: prospect._id },
          });

          importResults.imported.push(newLead);
        } catch (error: any) {
          importResults.errors.push({
            prospect,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        imported: importResults.imported.length,
        skipped: importResults.skipped.length,
        errors: importResults.errors.length,
        details: importResults,
      });
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

        // Trigger automation on conversation received
        if (conversation.isFromLead) {
          await automationEngine.onConversationReceived(conversation.id);
        }

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

          // Trigger automation workflows on score change
          await automationEngine.onLeadScoreChange(
            lead.id,
            previousScore,
            analysis.score,
            analysis.status
          );
        }
      }

      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // AI Conversation Summary
  app.get("/api/leads/:id/conversation-summary", async (req, res) => {
    try {
      const conversations = await storage.getConversationsByLeadId(req.params.id);
      const conversationsForSummary = conversations.map((c) => ({
        subject: c.subject,
        body: c.body,
        isFromLead: c.isFromLead === 1,
        sentAt: c.sentAt,
      }));

      const summary = await summarizeConversations(conversationsForSummary);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Email Drafting
  app.post("/api/leads/:id/draft-email", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const validResponseTypes = ["follow-up", "answer-question", "proposal", "closing"];
      const responseType = req.body.responseType || "follow-up";
      
      if (!validResponseTypes.includes(responseType)) {
        return res.status(400).json({ 
          error: `Invalid responseType. Must be one of: ${validResponseTypes.join(", ")}` 
        });
      }

      const conversations = await storage.getConversationsByLeadId(req.params.id);
      const conversationHistory = conversations
        .map((c) => {
          const dir = c.isFromLead ? "FROM" : "TO";
          return `[${dir}] ${c.subject}\n${c.body}`;
        })
        .join("\n\n---\n\n");

      const draft = await draftEmailResponse(lead.name, conversationHistory, responseType);
      
      res.json(draft);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Next Best Action
  app.get("/api/leads/:id/next-best-action", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const [conversations, activities, tasks, leadScores] = await Promise.all([
        storage.getConversationsByLeadId(req.params.id),
        storage.getActivities(req.params.id),
        storage.getTasks(req.params.id),
        storage.getLeadScores(req.params.id),
      ]);

      const latestScore = leadScores.length > 0 
        ? leadScores.sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())[0]
        : null;

      const openTasks = tasks.filter((t: any) => t.status !== "completed");

      const nextAction = await generateNextBestAction(
        {
          name: lead.name,
          email: lead.email,
          company: lead.company || "Unknown",
          score: latestScore?.score || 0,
          status: (latestScore?.status as "hot" | "warm" | "cold") || "cold",
        },
        conversations.map(c => ({
          subject: c.subject,
          body: c.body,
          isFromLead: Boolean(c.isFromLead),
          sentAt: c.sentAt,
        })),
        activities.slice(0, 10),
        openTasks
      );

      res.json(nextAction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Sentiment Timeline
  app.get("/api/leads/:id/sentiment-timeline", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const conversations = await storage.getConversationsByLeadId(req.params.id);

      const timeline = await analyzeSentimentTimeline(
        conversations.map(c => ({
          subject: c.subject,
          body: c.body,
          isFromLead: Boolean(c.isFromLead),
          sentAt: c.sentAt,
        }))
      );

      res.json(timeline);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  app.get("/api/ms365/callback", async (req, res) => {
    try {
      const authCode = req.query.code as string;
      if (!authCode) {
        return res.status(400).json({ error: "Missing authorization code" });
      }

      // Exchange code for tokens
      const tokens = await ms365Integration.exchangeCodeForToken(authCode);

      // Store tokens in sync state
      await storage.updateSyncState({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        isConfigured: 1,
      });

      // Setup webhook for real-time notifications
      const webhookUrl = `${process.env.REPL_SLUG ? 'https://' + process.env.REPL_SLUG + '.replit.app' : 'http://localhost:5000'}/api/ms365/webhook`;
      try {
        const webhook = await ms365Integration.setupWebhook(webhookUrl, tokens.accessToken);
        console.log(`MS365: Webhook setup successful: ${webhook.subscriptionId}`);
      } catch (error) {
        console.warn("MS365: Failed to setup webhook (will use polling):", error);
      }

      // Redirect to settings page with success message
      res.redirect('/settings?ms365=connected');
    } catch (error: any) {
      console.error("MS365: OAuth callback failed:", error);
      res.redirect('/settings?ms365=error&message=' + encodeURIComponent(error.message));
    }
  });

  app.post("/api/ms365/webhook", async (req, res) => {
    try {
      const validationToken = req.query.validationToken as string;
      
      // Microsoft Graph validation request
      if (validationToken) {
        return res.send(validationToken);
      }

      // Handle webhook notification
      const notification = req.body.value?.[0];
      if (notification) {
        // Ensure valid token before processing webhook
        const accessToken = await ms365Integration.ensureValidToken();
        await ms365Integration.handleWebhookNotification(notification, accessToken);
      }

      res.status(202).send();
    } catch (error: any) {
      console.error("MS365: Webhook handling failed:", error);
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

      // Ensure valid token before sending email
      const accessToken = await ms365Integration.ensureValidToken();
      
      const emailResult = await ms365Integration.sendEmail({
        to: lead.email,
        subject,
        body,
        accessToken,
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

  // Pipeline routes
  app.get("/api/pipelines", async (req, res) => {
    try {
      const pipelines = await storage.getPipelines();
      res.json(pipelines);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pipelines/default", async (req, res) => {
    try {
      const pipeline = await storage.getDefaultPipeline();
      if (!pipeline) {
        return res.status(404).json({ error: "No default pipeline found" });
      }
      res.json(pipeline);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pipelines/:id", async (req, res) => {
    try {
      const pipeline = await storage.getPipeline(req.params.id);
      if (!pipeline) {
        return res.status(404).json({ error: "Pipeline not found" });
      }
      res.json(pipeline);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pipelines", async (req, res) => {
    try {
      const validatedData = insertPipelineSchema.parse(req.body);
      
      // Get current default BEFORE creating new pipeline
      const oldDefault = validatedData.isDefault === 1 ? await storage.getDefaultPipeline() : null;
      
      // Create new pipeline
      const pipeline = await storage.createPipeline(validatedData);
      
      // If successfully created as default, demote the old one
      if (pipeline.isDefault === 1 && oldDefault && oldDefault.id !== pipeline.id) {
        await storage.updatePipeline(oldDefault.id, { isDefault: 0 });
      }
      
      res.json(pipeline);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/pipelines/:id", async (req, res) => {
    try {
      const validatedData = insertPipelineSchema.partial().parse(req.body);
      
      // Prevent demoting the last default pipeline
      if (validatedData.isDefault === 0) {
        const currentPipeline = await storage.getPipeline(req.params.id);
        if (currentPipeline?.isDefault === 1) {
          const allPipelines = await storage.getPipelines();
          if (allPipelines.length === 1 || allPipelines.filter(p => p.isDefault === 1).length === 1) {
            return res.status(400).json({ 
              error: "Cannot remove default status from the only default pipeline. Set another pipeline as default first." 
            });
          }
        }
      }
      
      // Get old default BEFORE updating (only if we're setting a new default)
      const oldDefault = validatedData.isDefault === 1 ? await storage.getDefaultPipeline() : null;
      
      // Update the pipeline first
      const pipeline = await storage.updatePipeline(req.params.id, validatedData);
      if (!pipeline) {
        return res.status(404).json({ error: "Pipeline not found" });
      }
      
      // If successfully updated to default, demote the old one
      if (pipeline.isDefault === 1 && oldDefault && oldDefault.id !== pipeline.id) {
        await storage.updatePipeline(oldDefault.id, { isDefault: 0 });
      }
      
      res.json(pipeline);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/pipelines/:id", async (req, res) => {
    try {
      // Check for dependent deals
      const deals = await storage.getDeals({ pipelineId: req.params.id });
      if (deals.length > 0) {
        return res.status(400).json({ 
          error: `Cannot delete pipeline with ${deals.length} active deal(s). Please reassign or delete the deals first.` 
        });
      }

      // Check if it's the default pipeline
      const pipeline = await storage.getPipeline(req.params.id);
      if (pipeline?.isDefault === 1) {
        return res.status(400).json({ 
          error: "Cannot delete the default pipeline. Set another pipeline as default first." 
        });
      }

      await storage.deletePipeline(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pipeline Stage routes
  app.get("/api/pipelines/:pipelineId/stages", async (req, res) => {
    try {
      const stages = await storage.getStages(req.params.pipelineId);
      res.json(stages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pipelines/:pipelineId/stages", async (req, res) => {
    try {
      const validatedData = insertPipelineStageSchema.parse({
        ...req.body,
        pipelineId: req.params.pipelineId,
      });
      const stage = await storage.createStage(validatedData);
      res.json(stage);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/stages/:id", async (req, res) => {
    try {
      const validatedData = insertPipelineStageSchema.partial().parse(req.body);
      const stage = await storage.updateStage(req.params.id, validatedData);
      if (!stage) {
        return res.status(404).json({ error: "Stage not found" });
      }
      res.json(stage);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/stages/:id", async (req, res) => {
    try {
      // Check for dependent deals
      const deals = await storage.getDeals({ stageId: req.params.id });
      if (deals.length > 0) {
        return res.status(400).json({ 
          error: `Cannot delete stage with ${deals.length} active deal(s). Please move the deals to another stage first.` 
        });
      }

      await storage.deleteStage(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stages/reorder", async (req, res) => {
    try {
      const { stageIds } = req.body;
      if (!Array.isArray(stageIds)) {
        return res.status(400).json({ error: "stageIds must be an array" });
      }
      await storage.reorderStages(stageIds);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Deal routes
  app.get("/api/deals", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.pipelineId) filters.pipelineId = req.query.pipelineId as string;
      if (req.query.stageId) filters.stageId = req.query.stageId as string;
      if (req.query.ownerId) filters.ownerId = req.query.ownerId as string;
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.minAmount) filters.minAmount = parseFloat(req.query.minAmount as string);
      if (req.query.maxAmount) filters.maxAmount = parseFloat(req.query.maxAmount as string);
      if (req.query.fromDate) filters.fromDate = new Date(req.query.fromDate as string);
      if (req.query.toDate) filters.toDate = new Date(req.query.toDate as string);

      const deals = await storage.getDeals(filters);
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/deals/:id", async (req, res) => {
    try {
      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      res.json(deal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/deals", async (req, res) => {
    try {
      const validatedData = insertDealSchema.parse(req.body);
      const deal = await storage.createDeal(validatedData);

      if (deal.leadId) {
        await storage.createActivity({
          leadId: deal.leadId,
          type: "deal_created",
          description: `Deal "${deal.name}" was created with value $${deal.amount.toLocaleString()}`,
          metadata: { dealId: deal.id },
        });
      }

      res.json(deal);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/deals/:id", async (req, res) => {
    try {
      const validatedData = insertDealSchema.partial().parse(req.body);
      const deal = await storage.updateDeal(req.params.id, validatedData);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (deal.leadId) {
        await storage.createActivity({
          leadId: deal.leadId,
          type: "deal_updated",
          description: `Deal "${deal.name}" was updated`,
          metadata: { dealId: deal.id },
        });
      }

      res.json(deal);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/deals/:id", async (req, res) => {
    try {
      await storage.deleteDeal(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/deals/:id/move-stage", async (req, res) => {
    try {
      const { toStageId, movedById } = req.body;
      if (!toStageId) {
        return res.status(400).json({ error: "toStageId is required" });
      }

      const deal = await storage.moveDealToStage(req.params.id, toStageId, movedById);
      if (!deal) {
        return res.status(404).json({ error: "Deal or stage not found" });
      }

      if (deal.leadId) {
        const stage = await storage.getStage(toStageId);
        await storage.createActivity({
          leadId: deal.leadId,
          type: "deal_stage_changed",
          description: `Deal "${deal.name}" moved to ${stage?.name || 'new stage'}`,
          metadata: { dealId: deal.id, stageId: toStageId },
        });
      }

      res.json(deal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/deals/:id/history", async (req, res) => {
    try {
      const history = await storage.getDealStageHistory(req.params.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Deal Outcome Prediction
  app.get("/api/deals/:id/forecast", async (req, res) => {
    try {
      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const [stage, stageHistory, conversations] = await Promise.all([
        storage.getStage(deal.stageId),
        storage.getDealStageHistory(deal.id),
        deal.leadId ? storage.getConversationsByLeadId(deal.leadId) : Promise.resolve([]),
      ]);

      // Calculate days in current stage
      const latestStageChange = stageHistory.length > 0
        ? stageHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;
      const daysInStage = latestStageChange
        ? Math.floor((Date.now() - new Date(latestStageChange.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Calculate days until expected close
      const daysUntilClose = deal.expectedCloseDate
        ? Math.floor((new Date(deal.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 999;

      // Calculate conversation sentiment
      let averageSentiment = 0;
      let recentSentiment: "positive" | "neutral" | "negative" = "neutral";
      
      if (conversations.length > 0) {
        try {
          const sentimentTimeline = await analyzeSentimentTimeline(
            conversations.map(c => ({
              subject: c.subject,
              body: c.body,
              isFromLead: Boolean(c.isFromLead),
              sentAt: c.sentAt,
            }))
          );
          
          if (sentimentTimeline.length > 0) {
            averageSentiment = sentimentTimeline.reduce((sum, s) => sum + s.score, 0) / sentimentTimeline.length;
            const recent = sentimentTimeline[sentimentTimeline.length - 1];
            recentSentiment = recent?.sentiment || "neutral";
          }
        } catch (error) {
          console.error("Error analyzing sentiment for deal forecast:", error);
          // Continue with default neutral sentiment
        }
      }

      // Calculate engagement metrics
      const lastConversation = conversations.length > 0
        ? conversations.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0]
        : null;
      
      const lastContactDays = lastConversation
        ? Math.floor((Date.now() - new Date(lastConversation.sentAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const forecast = await predictDealOutcome(
        {
          name: deal.name,
          amount: deal.amount,
          probability: deal.probability || 50,
          stageName: stage?.name || "Unknown",
          daysInStage,
          daysUntilExpectedClose: daysUntilClose,
        },
        {
          averageScore: averageSentiment,
          recentSentiment,
        },
        {
          totalConversations: conversations.length,
          lastContactDays,
          stageChanges: stageHistory.length,
        }
      );

      res.json(forecast);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Forecast route
  app.get("/api/forecast", async (req, res) => {
    try {
      const pipelineId = req.query.pipelineId as string | undefined;
      const ownerId = req.query.ownerId as string | undefined;
      
      const deals = await storage.getDeals({
        pipelineId,
        ownerId,
        status: "open",
      });

      const forecast = {
        totalValue: deals.reduce((sum, deal) => sum + deal.amount, 0),
        weightedValue: deals.reduce((sum, deal) => sum + (deal.amount * (deal.probability || 0) / 100), 0),
        dealCount: deals.length,
        avgDealSize: deals.length > 0 ? deals.reduce((sum, deal) => sum + deal.amount, 0) / deals.length : 0,
        byStage: {} as Record<string, { count: number; totalValue: number; weightedValue: number }>,
        byMonth: {} as Record<string, { count: number; totalValue: number; weightedValue: number }>,
      };

      // Group by stage
      for (const deal of deals) {
        if (!forecast.byStage[deal.stageId]) {
          forecast.byStage[deal.stageId] = {
            count: 0,
            totalValue: 0,
            weightedValue: 0,
          };
        }
        forecast.byStage[deal.stageId].count++;
        forecast.byStage[deal.stageId].totalValue += deal.amount;
        forecast.byStage[deal.stageId].weightedValue += deal.amount * (deal.probability || 0) / 100;
      }

      // Group by month (based on expected close date)
      for (const deal of deals) {
        if (deal.expectedCloseDate) {
          const date = new Date(deal.expectedCloseDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!forecast.byMonth[monthKey]) {
            forecast.byMonth[monthKey] = {
              count: 0,
              totalValue: 0,
              weightedValue: 0,
            };
          }
          forecast.byMonth[monthKey].count++;
          forecast.byMonth[monthKey].totalValue += deal.amount;
          forecast.byMonth[monthKey].weightedValue += deal.amount * (deal.probability || 0) / 100;
        }
      }

      res.json(forecast);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Automation Rules routes
  app.get("/api/automation-rules", async (req, res) => {
    try {
      const rules = await storage.getAutomationRules();
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/automation-rules/:id", async (req, res) => {
    try {
      const rule = await storage.getAutomationRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      res.json(rule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/automation-rules", async (req, res) => {
    try {
      const validatedData = insertAutomationRuleSchema.parse(req.body);
      const rule = await storage.createAutomationRule(validatedData);
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/automation-rules/:id", async (req, res) => {
    try {
      const validatedData = insertAutomationRuleSchema.partial().parse(req.body);
      const rule = await storage.updateAutomationRule(req.params.id, validatedData);
      if (!rule) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/automation-rules/:id", async (req, res) => {
    try {
      await storage.deleteAutomationRule(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Automation Logs routes
  app.get("/api/automation-logs", async (req, res) => {
    try {
      const logs = await storage.getAutomationLogs();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
