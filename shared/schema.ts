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
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // email_received, email_sent, score_updated, lead_created, etc.
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

// Define relations
export const leadsRelations = relations(leads, ({ many }) => ({
  conversations: many(conversations),
  scores: many(leadScores),
  activities: many(activities),
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

// Extended types with relations
export type LeadWithRelations = Lead & {
  conversations: Conversation[];
  scores: LeadScore[];
  activities: Activity[];
};
