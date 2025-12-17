import {
  leads,
  conversations,
  leadScores,
  activities,
  syncState,
  emailTemplates,
  users,
  assignmentRules,
  leadAssignments,
  tasks,
  scoringConfig,
  automationRules,
  automationLogs,
  pipelines,
  pipelineStages,
  deals,
  dealStageHistory,
  apolloEnrichments,
  saleshandySequences,
  type Lead,
  type InsertLead,
  type Conversation,
  type InsertConversation,
  type LeadScore,
  type InsertLeadScore,
  type Activity,
  type InsertActivity,
  type SyncState,
  type InsertSyncState,
  type EmailTemplate,
  type InsertEmailTemplate,
  type User,
  type InsertUser,
  type AssignmentRule,
  type InsertAssignmentRule,
  type LeadAssignment,
  type InsertLeadAssignment,
  type Task,
  type InsertTask,
  type ScoringConfig,
  type InsertScoringConfig,
  type AutomationRule,
  type InsertAutomationRule,
  type AutomationLog,
  type InsertAutomationLog,
  type Pipeline,
  type InsertPipeline,
  type PipelineStage,
  type InsertPipelineStage,
  type Deal,
  type InsertDeal,
  type DealStageHistory,
  type InsertDealStageHistory,
  type ApolloEnrichment,
  type InsertApolloEnrichment,
  type SaleshandySequence,
  type InsertSaleshandySequence,
  linkedInSessions,
  type LinkedInSession,
  type InsertLinkedInSession,
  scrapedProfiles,
  type ScrapedProfile,
  type InsertScrapedProfile,
  apifyResults,
  snovioLogs,
  type SnovioLog,
  type InsertSnovioLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, and, or, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Leads - Role-based access
  getLeads(user: { id: string; role: string }): Promise<Lead[]>;
  getLead(user: { id: string; role: string }, id: string): Promise<Lead | undefined>;
  getLeadsByOwner(ownerId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<void>;

  // Conversations
  getConversations(user: AuthUser): Promise<Conversation[]>;
  getConversationsByLeadId(leadId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;

  // Lead Scores
  getLeadScores(leadId: string): Promise<LeadScore[]>;
  createLeadScore(score: InsertLeadScore): Promise<LeadScore>;

  // Activities
  getActivities(leadId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Sync State (legacy - for backward compatibility)
  getSyncState(): Promise<SyncState | undefined>;
  updateSyncState(data: Partial<SyncState>): Promise<SyncState>;

  // Sync State (user-specific)
  getSyncStateForUser(userId: string): Promise<SyncState | undefined>;
  updateSyncStateForUser(userId: string, data: Partial<SyncState>): Promise<SyncState>;

  // Email Templates
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<void>;

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByManager(managerId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  // Assignment Rules
  getAssignmentRules(): Promise<AssignmentRule[]>;
  createAssignmentRule(rule: InsertAssignmentRule): Promise<AssignmentRule>;
  updateAssignmentRule(id: string, rule: Partial<InsertAssignmentRule>): Promise<AssignmentRule | undefined>;
  deleteAssignmentRule(id: string): Promise<void>;

  // Lead Assignments
  getLeadAssignment(leadId: string): Promise<LeadAssignment | undefined>;
  createLeadAssignment(assignment: InsertLeadAssignment): Promise<LeadAssignment>;

  // Tasks
  getTasks(leadId: string): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  // Scoring Config
  getScoringConfig(): Promise<ScoringConfig | undefined>;
  updateScoringConfig(config: Partial<InsertScoringConfig>): Promise<ScoringConfig>;

  // Pipelines
  getPipelines(): Promise<Pipeline[]>;
  getPipeline(id: string): Promise<Pipeline | undefined>;
  getDefaultPipeline(): Promise<Pipeline | undefined>;
  createPipeline(pipeline: InsertPipeline): Promise<Pipeline>;
  updatePipeline(id: string, pipeline: Partial<InsertPipeline>): Promise<Pipeline | undefined>;
  deletePipeline(id: string): Promise<void>;

  // Pipeline Stages
  getStages(pipelineId: string): Promise<PipelineStage[]>;
  getStage(id: string): Promise<PipelineStage | undefined>;
  createStage(stage: InsertPipelineStage): Promise<PipelineStage>;
  updateStage(id: string, stage: Partial<InsertPipelineStage>): Promise<PipelineStage | undefined>;
  deleteStage(id: string): Promise<void>;
  reorderStages(stageIds: string[]): Promise<void>;

  // Deals - Role-based access
  getDeals(user: { id: string; role: string }, filters?: {
    pipelineId?: string;
    stageId?: string;
    ownerId?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<Deal[]>;
  getDeal(user: { id: string; role: string }, id: string): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal | undefined>;
  deleteDeal(id: string): Promise<void>;
  moveDealToStage(dealId: string, toStageId: string, movedById?: string): Promise<Deal | undefined>;

  // Deal Stage History
  getDealStageHistory(dealId: string): Promise<DealStageHistory[]>;
  createDealStageHistory(history: InsertDealStageHistory): Promise<DealStageHistory>;

  // Automation Rules
  getAutomationRules(): Promise<AutomationRule[]>;
  getAutomationRule(id: string): Promise<AutomationRule | undefined>;
  createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule>;
  updateAutomationRule(id: string, rule: Partial<InsertAutomationRule>): Promise<AutomationRule | undefined>;
  deleteAutomationRule(id: string): Promise<void>;

  // Automation Logs
  getAutomationLogs(ruleId?: string): Promise<AutomationLog[]>;
  logAutomationExecution(log: InsertAutomationLog): Promise<AutomationLog>;

  // Apollo Enrichments
  createApolloEnrichment(enrichment: InsertApolloEnrichment): Promise<ApolloEnrichment>;
  getApolloEnrichments(leadId: string): Promise<ApolloEnrichment[]>;

  // Saleshandy Sequences
  createSaleshandySequence(sequence: InsertSaleshandySequence): Promise<SaleshandySequence>;
  getSaleshandySequences(leadId: string): Promise<SaleshandySequence[]>;
  updateSaleshandySequence(id: string, sequence: Partial<InsertSaleshandySequence>): Promise<SaleshandySequence | undefined>;

  // LinkedIn Sessions
  storeLinkedInSession(userId: string, cookies: any[]): Promise<LinkedInSession>;
  getLinkedInSession(userId?: string): Promise<LinkedInSession | undefined>;
  deleteLinkedInSession(userId?: string): Promise<void>;
  isSessionValid(userId?: string): Promise<boolean>;

  // Scraped Profiles (Archives) - Role-based access
  createScrapedProfile(userId: string, profile: InsertScrapedProfile): Promise<ScrapedProfile>;
  getScrapedProfiles(user: { id: string; role: string }): Promise<ScrapedProfile[]>;
  updateScrapedProfile(userId: string, id: string, updates: Partial<InsertScrapedProfile>): Promise<ScrapedProfile | undefined>;

  // Apify Results
  createApifyResult(result: any): Promise<any>;
  getApifyResults(): Promise<any[]>;
  clearApifyResults(): Promise<void>;

  // Helper methods
  getConversation(id: string): Promise<Conversation | undefined>;
  getPipelineStages(pipelineId: string): Promise<PipelineStage[]>;

  // Snov.io Logs
  logSnovioAction(log: InsertSnovioLog): Promise<SnovioLog>;
}

export class DatabaseStorage implements IStorage {
  async getLeads(user: { id: string; role: string }): Promise<Lead[]> {
    // Import PermissionService to get accessible user IDs
    const { default: PermissionService } = await import("./permissions.js");
    const accessibleUserIds = await PermissionService.getAccessibleUserIds(user as any);

    // Filter leads by accessible owner IDs (role-based)
    return db
      .select()
      .from(leads)
      .where(sql`${leads.ownerId} IN (${sql.join(accessibleUserIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(leads.createdAt));
  }

  async getLead(user: { id: string; role: string }, id: string): Promise<Lead | undefined> {
    // Import PermissionService to check access
    const { default: PermissionService } = await import("./permissions.js");
    const accessibleUserIds = await PermissionService.getAccessibleUserIds(user as any);

    const [lead] = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.id, id),
        sql`${leads.ownerId} IN (${sql.join(accessibleUserIds.map(id => sql`${id}`), sql`, `)})`
      ));
    return lead || undefined;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    console.log(`[Storage.updateLead] Called with id: ${id}, updates:`, updates);
    const [lead] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    console.log(`[Storage.updateLead] Result for id ${id}:`, lead);
    return lead || undefined;
  }

  async deleteLead(id: string): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  async getLeadsByOwner(ownerId: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.ownerId, ownerId)).orderBy(desc(leads.createdAt));
  }

  async getConversations(user: AuthUser): Promise<Conversation[]> {
    // Get all leads accessible by this user
    const accessibleLeads = await this.getLeads(user);
    const accessibleLeadIds = accessibleLeads.map(l => l.id);

    // Filter conversations to only show ones for accessible leads
    if (accessibleLeadIds.length === 0) {
      return [];
    }

    return db
      .select()
      .from(conversations)
      .where(inArray(conversations.leadId, accessibleLeadIds))
      .orderBy(desc(conversations.sentAt));
  }

  async getConversationsByLeadId(leadId: string): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.leadId, leadId))
      .orderBy(desc(conversations.sentAt));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getLeadScores(leadId: string): Promise<LeadScore[]> {
    return db
      .select()
      .from(leadScores)
      .where(eq(leadScores.leadId, leadId))
      .orderBy(desc(leadScores.analyzedAt));
  }

  async createLeadScore(insertScore: InsertLeadScore): Promise<LeadScore> {
    const [score] = await db.insert(leadScores).values(insertScore).returning();
    return score;
  }

  async getActivities(leadId: string): Promise<Activity[]> {
    return db
      .select()
      .from(activities)
      .where(eq(activities.leadId, leadId))
      .orderBy(desc(activities.createdAt));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values(insertActivity)
      .returning();
    return activity;
  }

  async getSyncState(): Promise<SyncState | undefined> {
    // Legacy method - get first sync state record (system-wide MS365 configuration)
    // Kept for backward compatibility
    const results = await db.select().from(syncState).limit(1);
    return results[0];
  }

  async updateSyncState(data: Partial<SyncState>): Promise<SyncState> {
    // Legacy method - kept for backward compatibility
    const existing = await this.getSyncState();
    if (existing) {
      // Update existing record
      const updated = await db
        .update(syncState)
        .set(data)
        .where(eq(syncState.id, existing.id))
        .returning();
      return updated[0];
    }
    // Create new record
    const created = await db.insert(syncState).values(data).returning();
    return created[0];
  }

  async getSyncStateForUser(userId: string): Promise<SyncState | undefined> {
    // Get sync state for specific user
    const [result] = await db
      .select()
      .from(syncState)
      .where(eq(syncState.userId, userId))
      .limit(1);
    return result || undefined;
  }

  async updateSyncStateForUser(userId: string, data: Partial<SyncState>): Promise<SyncState> {
    const existing = await this.getSyncStateForUser(userId);
    if (existing) {
      // Update existing record for this user
      const [updated] = await db
        .update(syncState)
        .set(data)
        .where(eq(syncState.id, existing.id))
        .returning();
      return updated;
    }
    // Create new record for this user
    const [created] = await db
      .insert(syncState)
      .values({ ...data, userId })
      .returning();
    return created;
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template || undefined;
  }

  async createEmailTemplate(insertTemplate: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db.insert(emailTemplates).values(insertTemplate).returning();
    return template;
  }

  async updateEmailTemplate(id: string, updates: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .update(emailTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return template || undefined;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }

  async getUsersByManager(managerId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.managerId, managerId));
  }

  async getAssignmentRules(): Promise<AssignmentRule[]> {
    return db.select().from(assignmentRules).orderBy(desc(assignmentRules.priority));
  }

  async createAssignmentRule(insertRule: InsertAssignmentRule): Promise<AssignmentRule> {
    const [rule] = await db.insert(assignmentRules).values(insertRule).returning();
    return rule;
  }

  async updateAssignmentRule(id: string, updates: Partial<InsertAssignmentRule>): Promise<AssignmentRule | undefined> {
    const [rule] = await db
      .update(assignmentRules)
      .set(updates)
      .where(eq(assignmentRules.id, id))
      .returning();
    return rule || undefined;
  }

  async deleteAssignmentRule(id: string): Promise<void> {
    await db.delete(assignmentRules).where(eq(assignmentRules.id, id));
  }

  async getLeadAssignment(leadId: string): Promise<LeadAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(leadAssignments)
      .where(eq(leadAssignments.leadId, leadId))
      .orderBy(desc(leadAssignments.assignedAt))
      .limit(1);
    return assignment || undefined;
  }

  async createLeadAssignment(insertAssignment: InsertLeadAssignment): Promise<LeadAssignment> {
    const [assignment] = await db.insert(leadAssignments).values(insertAssignment).returning();
    return assignment;
  }

  async getTasks(leadId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.leadId, leadId))
      .orderBy(desc(tasks.createdAt));
  }

  async getAllTasks(): Promise<Task[]> {
    return db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getScoringConfig(): Promise<ScoringConfig | undefined> {
    const [config] = await db.select().from(scoringConfig).limit(1);
    return config || undefined;
  }

  async updateScoringConfig(updates: Partial<InsertScoringConfig>): Promise<ScoringConfig> {
    const existing = await this.getScoringConfig();
    if (existing) {
      const [config] = await db
        .update(scoringConfig)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(scoringConfig.id, existing.id))
        .returning();
      return config;
    } else {
      const [config] = await db.insert(scoringConfig).values(updates).returning();
      return config;
    }
  }

  // Pipelines
  async getPipelines(): Promise<Pipeline[]> {
    return db.select().from(pipelines).orderBy(desc(pipelines.createdAt));
  }

  async getPipeline(id: string): Promise<Pipeline | undefined> {
    const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, id));
    return pipeline || undefined;
  }

  async getDefaultPipeline(): Promise<Pipeline | undefined> {
    const [pipeline] = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.isDefault, 1))
      .limit(1);
    return pipeline || undefined;
  }

  async createPipeline(insertPipeline: InsertPipeline): Promise<Pipeline> {
    const [pipeline] = await db.insert(pipelines).values(insertPipeline).returning();
    return pipeline;
  }

  async updatePipeline(id: string, updates: Partial<InsertPipeline>): Promise<Pipeline | undefined> {
    const [pipeline] = await db
      .update(pipelines)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pipelines.id, id))
      .returning();
    return pipeline || undefined;
  }

  async deletePipeline(id: string): Promise<void> {
    await db.delete(pipelines).where(eq(pipelines.id, id));
  }

  // Pipeline Stages
  async getStages(pipelineId: string): Promise<PipelineStage[]> {
    return db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipelineId))
      .orderBy(pipelineStages.order);
  }

  async getStage(id: string): Promise<PipelineStage | undefined> {
    const [stage] = await db.select().from(pipelineStages).where(eq(pipelineStages.id, id));
    return stage || undefined;
  }

  async createStage(insertStage: InsertPipelineStage): Promise<PipelineStage> {
    const [stage] = await db.insert(pipelineStages).values(insertStage).returning();
    return stage;
  }

  async updateStage(id: string, updates: Partial<InsertPipelineStage>): Promise<PipelineStage | undefined> {
    const [stage] = await db
      .update(pipelineStages)
      .set(updates)
      .where(eq(pipelineStages.id, id))
      .returning();
    return stage || undefined;
  }

  async deleteStage(id: string): Promise<void> {
    await db.delete(pipelineStages).where(eq(pipelineStages.id, id));
  }

  async reorderStages(stageIds: string[]): Promise<void> {
    for (let i = 0; i < stageIds.length; i++) {
      await db
        .update(pipelineStages)
        .set({ order: i })
        .where(eq(pipelineStages.id, stageIds[i]));
    }
  }

  // Deals
  async getDeals(user: { id: string; role: string }, filters?: {
    pipelineId?: string;
    stageId?: string;
    ownerId?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<Deal[]> {
    // Import PermissionService to get accessible user IDs
    const { default: PermissionService } = await import("./permissions.js");
    const accessibleUserIds = await PermissionService.getAccessibleUserIds(user as any);

    const conditions = [
      // Always filter by accessible users
      sql`${deals.ownerId} IN (${sql.join(accessibleUserIds.map(id => sql`${id}`), sql`, `)})`
    ];

    if (filters?.pipelineId) {
      conditions.push(eq(deals.pipelineId, filters.pipelineId));
    }
    if (filters?.stageId) {
      conditions.push(eq(deals.stageId, filters.stageId));
    }
    if (filters?.ownerId) {
      // Additional owner filter (must still be in accessible users)
      conditions.push(eq(deals.ownerId, filters.ownerId));
    }
    if (filters?.status) {
      conditions.push(eq(deals.status, filters.status));
    }
    if (filters?.minAmount !== undefined) {
      conditions.push(gte(deals.amount, filters.minAmount));
    }
    if (filters?.maxAmount !== undefined) {
      conditions.push(lte(deals.amount, filters.maxAmount));
    }
    if (filters?.fromDate) {
      conditions.push(gte(deals.expectedCloseDate, filters.fromDate));
    }
    if (filters?.toDate) {
      conditions.push(lte(deals.expectedCloseDate, filters.toDate));
    }

    return db.select().from(deals).where(and(...conditions)).orderBy(desc(deals.createdAt));
  }

  async getDeal(user: { id: string; role: string }, id: string): Promise<Deal | undefined> {
    // Import PermissionService to check access
    const { default: PermissionService } = await import("./permissions.js");
    const accessibleUserIds = await PermissionService.getAccessibleUserIds(user as any);

    const [deal] = await db
      .select()
      .from(deals)
      .where(and(
        eq(deals.id, id),
        sql`${deals.ownerId} IN (${sql.join(accessibleUserIds.map(id => sql`${id}`), sql`, `)})`
      ));
    return deal || undefined;
  }

  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    const [deal] = await db.insert(deals).values(insertDeal).returning();
    return deal;
  }

  async updateDeal(id: string, updates: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [deal] = await db
      .update(deals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return deal || undefined;
  }

  async deleteDeal(id: string): Promise<void> {
    await db.delete(deals).where(eq(deals.id, id));
  }

  async moveDealToStage(dealId: string, toStageId: string, movedById?: string): Promise<Deal | undefined> {
    const deal = await this.getDeal(dealId);
    if (!deal) return undefined;

    const toStage = await this.getStage(toStageId);
    if (!toStage) return undefined;

    // Create stage history record
    await this.createDealStageHistory({
      dealId,
      fromStageId: deal.stageId,
      toStageId,
      probability: deal.probability || toStage.defaultProbability,
      amount: deal.amount,
      movedById,
    });

    // Update deal with new stage and probability
    const probability = deal.probability !== null && deal.probability !== undefined
      ? deal.probability
      : toStage.defaultProbability;

    return this.updateDeal(dealId, {
      stageId: toStageId,
      probability,
    });
  }

  // Deal Stage History
  async getDealStageHistory(dealId: string): Promise<DealStageHistory[]> {
    return db
      .select()
      .from(dealStageHistory)
      .where(eq(dealStageHistory.dealId, dealId))
      .orderBy(desc(dealStageHistory.createdAt));
  }

  async createDealStageHistory(insertHistory: InsertDealStageHistory): Promise<DealStageHistory> {
    const [history] = await db.insert(dealStageHistory).values(insertHistory).returning();
    return history;
  }

  // Automation Rules
  async getAutomationRules(): Promise<AutomationRule[]> {
    return db.select().from(automationRules).orderBy(desc(automationRules.priority), desc(automationRules.createdAt));
  }

  async getAutomationRule(id: string): Promise<AutomationRule | undefined> {
    const [rule] = await db.select().from(automationRules).where(eq(automationRules.id, id));
    return rule || undefined;
  }

  async createAutomationRule(insertRule: InsertAutomationRule): Promise<AutomationRule> {
    const [rule] = await db.insert(automationRules).values(insertRule).returning();
    return rule;
  }

  async updateAutomationRule(id: string, updates: Partial<InsertAutomationRule>): Promise<AutomationRule | undefined> {
    const [rule] = await db
      .update(automationRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(automationRules.id, id))
      .returning();
    return rule || undefined;
  }

  async deleteAutomationRule(id: string): Promise<void> {
    await db.delete(automationRules).where(eq(automationRules.id, id));
  }

  // Automation Logs
  async getAutomationLogs(ruleId?: string): Promise<AutomationLog[]> {
    if (ruleId) {
      return db
        .select()
        .from(automationLogs)
        .where(eq(automationLogs.ruleId, ruleId))
        .orderBy(desc(automationLogs.executedAt));
    }
    return db.select().from(automationLogs).orderBy(desc(automationLogs.executedAt));
  }

  async logAutomationExecution(insertLog: InsertAutomationLog): Promise<AutomationLog> {
    const [log] = await db.insert(automationLogs).values(insertLog).returning();
    return log;
  }

  // Helper methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getPipelineStages(pipelineId: string): Promise<PipelineStage[]> {
    return db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipelineId))
      .orderBy(pipelineStages.order);
  }

  // Apollo Enrichments
  async createApolloEnrichment(insertEnrichment: InsertApolloEnrichment): Promise<ApolloEnrichment> {
    const [enrichment] = await db.insert(apolloEnrichments).values(insertEnrichment).returning();
    return enrichment;
  }

  async getApolloEnrichments(leadId: string): Promise<ApolloEnrichment[]> {
    return db
      .select()
      .from(apolloEnrichments)
      .where(eq(apolloEnrichments.leadId, leadId))
      .orderBy(desc(apolloEnrichments.enrichedAt));
  }

  // Saleshandy Sequences
  async createSaleshandySequence(insertSequence: InsertSaleshandySequence): Promise<SaleshandySequence> {
    const [sequence] = await db.insert(saleshandySequences).values(insertSequence).returning();
    return sequence;
  }

  async getSaleshandySequences(leadId: string): Promise<SaleshandySequence[]> {
    return db
      .select()
      .from(saleshandySequences)
      .where(eq(saleshandySequences.leadId, leadId))
      .orderBy(desc(saleshandySequences.addedAt));
  }

  async updateSaleshandySequence(id: string, updates: Partial<InsertSaleshandySequence>): Promise<SaleshandySequence | undefined> {
    const [sequence] = await db
      .update(saleshandySequences)
      .set(updates)
      .where(eq(saleshandySequences.id, id))
      .returning();
    return sequence || undefined;
  }

  // LinkedIn Sessions
  async storeLinkedInSession(userId: string = "default", cookies: any[]): Promise<LinkedInSession> {
    // Delete existing session for this user
    await this.deleteLinkedInSession(userId);

    // Calculate expiration (30 days from now, LinkedIn's typical session duration)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const [session] = await db.insert(linkedInSessions).values({
      userId,
      cookies: cookies, // Stored as JSONB
      isValid: 1,
      expiresAt,
      lastUsedAt: new Date(),
    }).returning();

    return session;
  }

  async getLinkedInSession(userId: string = "default"): Promise<LinkedInSession | undefined> {
    const [session] = await db
      .select()
      .from(linkedInSessions)
      .where(
        and(
          eq(linkedInSessions.userId, userId),
          eq(linkedInSessions.isValid, 1)
        )
      )
      .orderBy(desc(linkedInSessions.createdAt))
      .limit(1);

    if (session) {
      // Update last used timestamp
      await db
        .update(linkedInSessions)
        .set({ lastUsedAt: new Date() })
        .where(eq(linkedInSessions.id, session.id));
    }

    return session || undefined;
  }

  async deleteLinkedInSession(userId: string = "default"): Promise<void> {
    await db
      .delete(linkedInSessions)
      .where(eq(linkedInSessions.userId, userId));
  }

  async isSessionValid(userId: string = "default"): Promise<boolean> {
    const session = await this.getLinkedInSession(userId);
    if (!session) return false;

    // Check if session is expired
    const now = new Date();
    if (session.expiresAt && new Date(session.expiresAt) < now) {
      // Mark as invalid
      await db
        .update(linkedInSessions)
        .set({ isValid: 0 })
        .where(eq(linkedInSessions.id, session.id));
      return false;
    }

    return true;
  }

  // Scraped Profiles
  async createScrapedProfile(userId: string, insertProfile: InsertScrapedProfile): Promise<ScrapedProfile> {
    const [profile] = await db
      .insert(scrapedProfiles)
      .values({ ...insertProfile, userId }) // Add userId to the profile
      .returning();
    return profile;
  }

  async getScrapedProfiles(user: { id: string; role: string }): Promise<ScrapedProfile[]> {
    // Import PermissionService to get accessible user IDs
    const { default: PermissionService } = await import("./permissions.js");
    const accessibleUserIds = await PermissionService.getAccessibleUserIds(user as any);

    // Filter profiles by accessible user IDs (role-based)
    return db
      .select()
      .from(scrapedProfiles)
      .where(sql`${scrapedProfiles.userId} IN (${sql.join(accessibleUserIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(scrapedProfiles.scrapedAt));
  }

  async updateScrapedProfile(userId: string, id: string, updates: Partial<InsertScrapedProfile>): Promise<ScrapedProfile | undefined> {
    const [profile] = await db
      .update(scrapedProfiles)
      .set(updates)
      .where(and(
        eq(scrapedProfiles.id, id),
        eq(scrapedProfiles.userId, userId) // Only update if owned by this user
      ))
      .returning();
    return profile || undefined;
  }

  // Apify Results
  async createApifyResult(result: any): Promise<any> {
    const [saved] = await db.insert(apifyResults).values(result).returning();
    return saved;
  }

  async getApifyResults(): Promise<any[]> {
    return await db.select().from(apifyResults).orderBy(desc(apifyResults.createdAt));
  }

  async clearApifyResults(): Promise<void> {
    await db.delete(apifyResults);
  }

  // Snov.io Logs
  async logSnovioAction(insertLog: InsertSnovioLog): Promise<SnovioLog> {
    const [log] = await db.insert(snovioLogs).values(insertLog).returning();
    return log;
  }


}

export const storage = new DatabaseStorage();
