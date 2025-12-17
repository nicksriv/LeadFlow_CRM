import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Lead status enum
export const leadStatuses = ["cold", "warm", "hot"] as const;
export type LeadStatus = typeof leadStatuses[number];

// Line of business options
export const lineOfBusinessOptions = [
  "Technology",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail",
  "Education",
  "Real Estate",
  "Professional Services",
  "Marketing & Advertising",
  "Other"
] as const;
export type LineOfBusiness = typeof lineOfBusinessOptions[number];

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Contact Information
  name: text("name").notNull(), // Full name (kept for backward compatibility)
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email").notNull(),
  phone: text("phone"),

  // Work Information
  position: text("position"), // Job Title
  department: text("department"),
  industry: text("industry"),
  experience: text("experience"), // Years of experience or description

  // Social Profiles
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  facebookUrl: text("facebook_url"),
  website: text("website"),

  // Location Information
  city: text("city"),
  state: text("state"),
  country: text("country"),

  // Company Information
  company: text("company"),
  companyDomain: text("company_domain"),
  companyWebsite: text("company_website"),
  companyIndustry: text("company_industry"),
  companySize: text("company_size"),
  companyRevenue: text("company_revenue"),
  companyFoundedYear: integer("company_founded_year"),
  companyLinkedin: text("company_linkedin"),
  companyPhone: text("company_phone"),

  // Legacy/System Fields
  lineOfBusiness: text("line_of_business"), // Deprecated, use industry
  status: text("status").notNull().default("cold"), // cold, warm, hot
  score: integer("score").notNull().default(0), // 0-100
  ownerId: varchar("owner_id").references(() => users.id), // Lead owner/assigned sales rep
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  notes: text("notes"),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  customFields: jsonb("custom_fields").default(sql`'{}'::jsonb`), // Custom data storage
});

// Conversations table (email threads)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email").notNull(),
  sentAt: timestamp("sent_at").notNull(),
  isFromLead: integer("is_from_lead").notNull().default(0), // 0 or 1 (boolean)
  messageId: text("message_id"), // MS 365 message ID for sync
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Lead scoring history
export const leadScores = pgTable("lead_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  previousScore: integer("previous_score"),
  status: text("status").notNull(), // cold, warm, hot
  previousStatus: text("previous_status"),
  factors: jsonb("factors"), // JSON object with scoring factors
  analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
});

// Activity log
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  dealId: varchar("deal_id"), // Link to deal - reference added later to avoid circular dependency
  type: text("type").notNull(), // email_received, email_sent, score_updated, lead_created, deal_created, etc.
  description: text("description").notNull(),
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// MS 365 sync state
export const syncState = pgTable("sync_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Per-user MS365 tokens (nullable for migration)
  lastSyncAt: timestamp("last_sync_at"),
  deltaToken: text("delta_token"), // For incremental sync
  isConfigured: integer("is_configured").notNull().default(0), // 0 or 1
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
});

// Apollo.io enrichment tracking
export const apolloEnrichments = pgTable("apollo_enrichments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  enrichedAt: timestamp("enriched_at").notNull().defaultNow(),
  enrichmentData: jsonb("enrichment_data"), // Store full Apollo response
  fieldsEnriched: text("fields_enriched").array().default(sql`ARRAY[]::text[]`), // Track which fields were enriched
  creditsUsed: integer("credits_used").notNull().default(1),
  status: text("status").notNull().default("success"), // success, failed, partial
  errorMessage: text("error_message"),
});

// Saleshandy sequence tracking
export const saleshandySequences = pgTable("saleshandy_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  sequenceId: text("sequence_id").notNull(), // Saleshandy sequence ID
  sequenceName: text("sequence_name").notNull(),
  stepId: text("step_id"), // Current step in sequence
  status: text("status").notNull().default("active"), // active, paused, completed, unsubscribed
  addedAt: timestamp("added_at").notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at"),
  emailsSent: integer("emails_sent").notNull().default(0),
  emailsOpened: integer("emails_opened").notNull().default(0),
  emailsClicked: integer("emails_clicked").notNull().default(0),
  emailsReplied: integer("emails_replied").notNull().default(0),
});

// LinkedIn authentication sessions
export const linkedInSessions = pgTable("linkedin_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // For multi-user support (nullable for migration)
  cookies: jsonb("cookies").notNull(), // Encrypted LinkedIn cookies
  isValid: integer("is_valid").notNull().default(1), // 0 or 1
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // When session expires
  lastUsedAt: timestamp("last_used_at"),
});

// Email templates
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: text("category"), // follow-up, introduction, proposal, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Users/Team members for assignment and authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // For authentication
  role: text("role").notNull().default("sales_rep"), // admin, sales_manager, sales_rep
  managerId: varchar("manager_id"), // Reporting manager for hierarchy - reference added in relations
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Authentication sessions
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Assignment rules
export const assignmentRules = pgTable("assignment_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  condition: text("condition").notNull(), // score_threshold, territory, round_robin
  conditionValue: jsonb("condition_value").notNull(), // threshold value, territory data, etc.
  assignToUserId: varchar("assign_to_user_id").references(() => users.id),
  isActive: integer("is_active").notNull().default(1),
  priority: integer("priority").notNull().default(0), // Higher number = higher priority
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Lead assignments
export const leadAssignments = pgTable("lead_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  assignedBy: text("assigned_by"), // auto, manual, rule_id
});

// Tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Scoring configuration for weighted criteria
export const scoringConfig = pgTable("scoring_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sentimentWeight: integer("sentiment_weight").notNull().default(25),
  engagementWeight: integer("engagement_weight").notNull().default(25),
  responseTimeWeight: integer("response_time_weight").notNull().default(25),
  intentWeight: integer("intent_weight").notNull().default(25),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Automation/Workflow rules
export const automationRules = pgTable("automation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(), // lead_score_change, conversation_received, deal_stage_change, time_based
  triggerConditions: jsonb("trigger_conditions").notNull(), // Complex condition object
  actionType: text("action_type").notNull(), // convert_to_deal, create_task, advance_stage, assign_lead, send_email
  actionConfig: jsonb("action_config").notNull(), // Action-specific configuration
  isActive: integer("is_active").notNull().default(1),
  priority: integer("priority").notNull().default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Automation execution log
export const automationLogs = pgTable("automation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: varchar("rule_id").notNull().references(() => automationRules.id, { onDelete: "cascade" }),
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  dealId: varchar("deal_id"), // Reference added in relations
  triggerData: jsonb("trigger_data"), // What triggered the automation
  actionResult: jsonb("action_result"), // Result of the action
  success: integer("success").notNull().default(1), // 0 or 1
  errorMessage: text("error_message"),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
});

// Pipelines for deal management
export const pipelines = pgTable("pipelines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: integer("is_default").notNull().default(0), // 0 or 1
  ownerId: varchar("owner_id").references(() => users.id), // Optional owner for private pipelines
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Pipeline stages
export const pipelineStages = pgTable("pipeline_stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pipelineId: varchar("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").notNull(), // Display order
  defaultProbability: integer("default_probability").notNull().default(0), // 0-100
  forecastCategory: text("forecast_category").notNull().default("pipeline"), // pipeline, best_case, commit, closed
  color: text("color"), // Optional color for visual representation
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Deals/Opportunities
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  amount: integer("amount").notNull().default(0), // Deal value in cents
  currency: text("currency").notNull().default("USD"),
  probability: integer("probability"), // Override default stage probability (0-100)
  expectedCloseDate: timestamp("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  status: text("status").notNull().default("open"), // open, won, lost
  lostReason: text("lost_reason"), // Why deal was lost
  pipelineId: varchar("pipeline_id").notNull().references(() => pipelines.id),
  stageId: varchar("stage_id").notNull().references(() => pipelineStages.id),
  leadId: varchar("lead_id").references(() => leads.id), // Optional link to lead
  ownerId: varchar("owner_id").notNull().references(() => users.id), // Deal owner
  customFields: jsonb("custom_fields"), // Flexible custom data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Deal stage history for tracking
export const dealStageHistory = pgTable("deal_stage_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  fromStageId: varchar("from_stage_id").references(() => pipelineStages.id),
  toStageId: varchar("to_stage_id").notNull().references(() => pipelineStages.id),
  probability: integer("probability"), // Probability at time of move
  amount: integer("amount"), // Amount at time of move
  movedById: varchar("moved_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Define relations
export const leadsRelations = relations(leads, ({ many, one }) => ({
  conversations: many(conversations),
  scores: many(leadScores),
  activities: many(activities),
  owner: one(users, {
    fields: [leads.ownerId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  lead: one(leads, {
    fields: [conversations.leadId],
    references: [leads.id],
  }),
}));

export const leadScoresRelations = relations(leadScores, ({ one }) => ({
  lead: one(leads, {
    fields: [leadScores.leadId],
    references: [leads.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  lead: one(leads, {
    fields: [activities.leadId],
    references: [leads.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  lead: one(leads, {
    fields: [tasks.leadId],
    references: [leads.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToUserId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "managerToSubordinates",
  }),
  subordinates: many(users, {
    relationName: "managerToSubordinates",
  }),
  ownedLeads: many(leads),
  assignedTasks: many(tasks),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const leadAssignmentsRelations = relations(leadAssignments, ({ one }) => ({
  lead: one(leads, {
    fields: [leadAssignments.leadId],
    references: [leads.id],
  }),
  user: one(users, {
    fields: [leadAssignments.userId],
    references: [users.id],
  }),
}));

export const pipelinesRelations = relations(pipelines, ({ many, one }) => ({
  stages: many(pipelineStages),
  deals: many(deals),
  owner: one(users, {
    fields: [pipelines.ownerId],
    references: [users.id],
  }),
}));

export const pipelineStagesRelations = relations(pipelineStages, ({ one, many }) => ({
  pipeline: one(pipelines, {
    fields: [pipelineStages.pipelineId],
    references: [pipelines.id],
  }),
  deals: many(deals),
  historyEntries: many(dealStageHistory),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  pipeline: one(pipelines, {
    fields: [deals.pipelineId],
    references: [pipelines.id],
  }),
  stage: one(pipelineStages, {
    fields: [deals.stageId],
    references: [pipelineStages.id],
  }),
  lead: one(leads, {
    fields: [deals.leadId],
    references: [leads.id],
  }),
  owner: one(users, {
    fields: [deals.ownerId],
    references: [users.id],
  }),
  stageHistory: many(dealStageHistory),
  activities: many(activities),
}));

export const dealStageHistoryRelations = relations(dealStageHistory, ({ one }) => ({
  deal: one(deals, {
    fields: [dealStageHistory.dealId],
    references: [deals.id],
  }),
  fromStage: one(pipelineStages, {
    fields: [dealStageHistory.fromStageId],
    references: [pipelineStages.id],
  }),
  toStage: one(pipelineStages, {
    fields: [dealStageHistory.toStageId],
    references: [pipelineStages.id],
  }),
  movedBy: one(users, {
    fields: [dealStageHistory.movedById],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  score: z.number().min(0).max(100).optional(),
  status: z.enum(leadStatuses).optional(),

  // URL validations for social profiles and websites
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  facebookUrl: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  companyWebsite: z.string().url().optional().or(z.literal("")),
  companyLinkedin: z.string().url().optional().or(z.literal("")),

  // Number validations
  companyFoundedYear: z.number().min(1800).max(new Date().getFullYear()).optional().nullable(),

  // Optional legacy field
  lineOfBusiness: z.enum(lineOfBusinessOptions).optional(),

  customFields: z.record(z.string(), z.any()).optional(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
}).extend({
  sentAt: z.coerce.date(),
});

export const insertLeadScoreSchema = createInsertSchema(leadScores).omit({
  id: true,
  analyzedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertSyncStateSchema = createInsertSchema(syncState).omit({
  id: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentRuleSchema = createInsertSchema(assignmentRules).omit({
  id: true,
  createdAt: true,
});

export const insertLeadAssignmentSchema = createInsertSchema(leadAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertScoringConfigSchema = createInsertSchema(scoringConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutomationLogSchema = createInsertSchema(automationLogs).omit({
  id: true,
  executedAt: true,
});

export const insertPipelineSchema = createInsertSchema(pipelines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPipelineStageSchema = createInsertSchema(pipelineStages).omit({
  id: true,
  createdAt: true,
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  actualCloseDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
});

export const insertDealStageHistorySchema = createInsertSchema(dealStageHistory).omit({
  id: true,
  createdAt: true,
});

export const insertApolloEnrichmentSchema = createInsertSchema(apolloEnrichments).omit({
  id: true,
  enrichedAt: true,
});

export const insertSaleshandySequenceSchema = createInsertSchema(saleshandySequences).omit({
  id: true,
  addedAt: true,
});

export const insertLinkedInSessionSchema = createInsertSchema(linkedInSessions).omit({
  id: true,
  createdAt: true,
});

// Types
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type LeadScore = typeof leadScores.$inferSelect;
export type InsertLeadScore = z.infer<typeof insertLeadScoreSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type SyncState = typeof syncState.$inferSelect;
export type InsertSyncState = z.infer<typeof insertSyncStateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AssignmentRule = typeof assignmentRules.$inferSelect;
export type InsertAssignmentRule = z.infer<typeof insertAssignmentRuleSchema>;
export type LeadAssignment = typeof leadAssignments.$inferSelect;
export type InsertLeadAssignment = z.infer<typeof insertLeadAssignmentSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type ScoringConfig = typeof scoringConfig.$inferSelect;
export type InsertScoringConfig = z.infer<typeof insertScoringConfigSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationLog = typeof automationLogs.$inferSelect;
export type InsertAutomationLog = z.infer<typeof insertAutomationLogSchema>;
export type Pipeline = typeof pipelines.$inferSelect;
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type DealStageHistory = typeof dealStageHistory.$inferSelect;
export type InsertDealStageHistory = z.infer<typeof insertDealStageHistorySchema>;
export type ApolloEnrichment = typeof apolloEnrichments.$inferSelect;
export type InsertApolloEnrichment = z.infer<typeof insertApolloEnrichmentSchema>;
export type SaleshandySequence = typeof saleshandySequences.$inferSelect;
export type InsertSaleshandySequence = z.infer<typeof insertSaleshandySequenceSchema>;
export type LinkedInSession = typeof linkedInSessions.$inferSelect;
export type InsertLinkedInSession = z.infer<typeof insertLinkedInSessionSchema>;

// Snov.io API logs
export const snovioLogs = pgTable("snovio_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id), // Optional link to lead
  profileUrl: text("profile_url"), // LinkedIn URL searched
  action: text("action").notNull(), // find_email, get_profile
  status: text("status").notNull(), // success, failed
  creditsUsed: integer("credits_used").default(0),
  responseData: jsonb("response_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSnovioLogSchema = createInsertSchema(snovioLogs).omit({
  id: true,
  createdAt: true,
});

export type SnovioLog = typeof snovioLogs.$inferSelect;
export type InsertSnovioLog = z.infer<typeof insertSnovioLogSchema>;

// Scraped profiles archive
export const scrapedProfiles = pgTable("scraped_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Owner of this profile (nullable for migration)
  name: text("name").notNull(),
  headline: text("headline"),
  company: text("company"), // Extracted company name
  location: text("location"),
  url: text("url").notNull(), // LinkedIn URL (removed unique constraint to allow multiple users to scrape same profile)
  email: text("email"),
  emailConfidence: integer("email_confidence"), // Match confidence (0-100)
  avatar: text("avatar"),
  about: text("about"), // About section
  skills: text("skills").array().default(sql`ARRAY[]::text[]`), // Skills array
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
});

export const insertScrapedProfileSchema = createInsertSchema(scrapedProfiles).omit({
  id: true,
  scrapedAt: true,
});

export type ScrapedProfile = typeof scrapedProfiles.$inferSelect;
export type InsertScrapedProfile = z.infer<typeof insertScrapedProfileSchema>;

// Apify enrichment results
export const apifyResults = pgTable("apify_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  jobTitle: text("job_title"),
  linkedinUrl: text("linkedin_url"),
  companyName: text("company_name"),
  companyDomain: text("company_domain"),
  location: text("location"),
  industry: text("industry"),
  searchCriteria: jsonb("search_criteria"), // Store the search params used
  matchedProfileId: varchar("matched_profile_id"), // Reference to scraped_profiles if matched
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApifyResultSchema = createInsertSchema(apifyResults).omit({
  id: true,
  createdAt: true,
});

export type ApifyResult = typeof apifyResults.$inferSelect;
export type InsertApifyResult = z.infer<typeof insertApifyResultSchema>;

// Extended types with relations
export type LeadWithRelations = Lead & {
  conversations: Conversation[];
  scores: LeadScore[];
  activities: Activity[];
};

export type PipelineWithStages = Pipeline & {
  stages: PipelineStage[];
};

export type DealWithRelations = Deal & {
  pipeline: Pipeline;
  stage: PipelineStage;
  lead?: Lead;
  owner: User;
  stageHistory: DealStageHistory[];
  activities: Activity[];
};

export type StageWithDeals = PipelineStage & {
  deals: Deal[];
};
