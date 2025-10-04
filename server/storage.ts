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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadsByOwner(ownerId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<void>;

  // Conversations
  getConversations(): Promise<Conversation[]>;
  getConversationsByLeadId(leadId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;

  // Lead Scores
  getLeadScores(leadId: string): Promise<LeadScore[]>;
  createLeadScore(score: InsertLeadScore): Promise<LeadScore>;

  // Activities
  getActivities(leadId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Sync State
  getSyncState(): Promise<SyncState | undefined>;
  updateSyncState(state: Partial<InsertSyncState>): Promise<SyncState>;

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
}

export class DatabaseStorage implements IStorage {
  async getLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async deleteLead(id: string): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  async getLeadsByOwner(ownerId: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.ownerId, ownerId)).orderBy(desc(leads.createdAt));
  }

  async getConversations(): Promise<Conversation[]> {
    return db.select().from(conversations).orderBy(desc(conversations.sentAt));
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
    const [state] = await db.select().from(syncState).limit(1);
    return state || undefined;
  }

  async updateSyncState(updates: Partial<InsertSyncState>): Promise<SyncState> {
    const existing = await this.getSyncState();
    if (existing) {
      const [state] = await db
        .update(syncState)
        .set(updates)
        .where(eq(syncState.id, existing.id))
        .returning();
      return state;
    } else {
      const [state] = await db.insert(syncState).values(updates).returning();
      return state;
    }
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
}

export const storage = new DatabaseStorage();
