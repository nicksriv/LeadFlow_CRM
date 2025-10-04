import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Lead status enum
export const leadStatuses = ["cold", "warm", "hot"] as const;
export type LeadStatus = typeof leadStatuses[number];

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  position: text("position"),
  status: text("status").notNull().default("cold"), // cold, warm, hot
  score: integer("score").notNull().default(0), // 0-100
  ownerId: varchar("owner_id").references(() => users.id), // Lead owner/assigned sales rep
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  notes: text("notes"),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
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
  lastSyncAt: timestamp("last_sync_at"),
  deltaToken: text("delta_token"), // For incremental sync
  isConfigured: integer("is_configured").notNull().default(0), // 0 or 1
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
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

// Users/Team members for assignment
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("sales_rep"), // admin, sales_manager, sales_rep
  managerId: varchar("manager_id"), // Reporting manager for hierarchy - reference added in relations
  isActive: integer("is_active").notNull().default(1),
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
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
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
export type Pipeline = typeof pipelines.$inferSelect;
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type DealStageHistory = typeof dealStageHistory.$inferSelect;
export type InsertDealStageHistory = z.infer<typeof insertDealStageHistorySchema>;

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
