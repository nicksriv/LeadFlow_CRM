import {
  leads,
  conversations,
  leadScores,
  activities,
  syncState,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
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
}

export const storage = new DatabaseStorage();
