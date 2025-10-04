import { storage } from "./storage";
import type { AutomationRule, Lead, Deal, Conversation } from "@shared/schema";
import { analyzeLeadConversations } from "./ai";

/**
 * Automation Engine
 * 
 * Handles trigger-based workflow automation for:
 * - Auto-converting leads to deals
 * - Auto-advancing deal stages
 * - Creating tasks
 * - Sending emails
 * - Assigning leads
 */

interface TriggerContext {
  lead?: Lead;
  deal?: Deal;
  conversation?: Conversation;
  oldScore?: number;
  newScore?: number;
  oldStageId?: string;
  newStageId?: string;
}

export class AutomationEngine {
  /**
   * Check and execute automation rules based on lead score change
   */
  async onLeadScoreChange(
    leadId: string,
    oldScore: number,
    newScore: number,
    newStatus: string
  ): Promise<void> {
    const rules = await storage.getAutomationRules();
    const activeRules = rules.filter(
      (r: AutomationRule) => r.isActive === 1 && r.triggerType === "score_changed"
    );

    const lead = await storage.getLead(leadId);
    if (!lead) return;

    for (const rule of activeRules) {
      try {
        const shouldExecute = this.evaluateScoreChangeTrigger(
          rule,
          oldScore,
          newScore,
          newStatus
        );

        if (shouldExecute) {
          await this.executeAction(rule, {
            lead,
            oldScore,
            newScore,
          });
        }
      } catch (error) {
        console.error(`Automation rule ${rule.id} failed:`, error);
        await storage.logAutomationExecution({
          ruleId: rule.id,
          leadId,
          success: 0,
          errorMessage: error instanceof Error ? error.message : String(error),
          triggerData: { oldScore, newScore, newStatus },
        });
      }
    }
  }

  /**
   * Check and execute automation rules on new conversation
   */
  async onConversationReceived(conversationId: string): Promise<void> {
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) return;

    const lead = await storage.getLead(conversation.leadId);
    if (!lead) return;

    const rules = await storage.getAutomationRules();
    const activeRules = rules.filter(
      (r: AutomationRule) => r.isActive === 1 && r.triggerType === "conversation_received"
    );

    for (const rule of activeRules) {
      try {
        const shouldExecute = await this.evaluateConversationTrigger(
          rule,
          conversation,
          lead
        );

        if (shouldExecute) {
          await this.executeAction(rule, {
            lead,
            conversation,
          });
        }
      } catch (error) {
        console.error(`Automation rule ${rule.id} failed:`, error);
        await storage.logAutomationExecution({
          ruleId: rule.id,
          leadId: lead.id,
          success: 0,
          errorMessage: error instanceof Error ? error.message : String(error),
          triggerData: { conversationId },
        });
      }
    }
  }

  /**
   * Check and execute automation rules on deal stage change
   */
  async onDealStageChange(
    dealId: string,
    oldStageId: string,
    newStageId: string
  ): Promise<void> {
    const deal = await storage.getDeal(dealId);
    if (!deal) return;

    const rules = await storage.getAutomationRules();
    const activeRules = rules.filter(
      (r: AutomationRule) => r.isActive === 1 && r.triggerType === "deal_stage_change"
    );

    for (const rule of activeRules) {
      try {
        const shouldExecute = this.evaluateStageChangeTrigger(
          rule,
          oldStageId,
          newStageId
        );

        if (shouldExecute) {
          await this.executeAction(rule, {
            deal,
            oldStageId,
            newStageId,
          });
        }
      } catch (error) {
        console.error(`Automation rule ${rule.id} failed:`, error);
        await storage.logAutomationExecution({
          ruleId: rule.id,
          dealId,
          success: 0,
          errorMessage: error instanceof Error ? error.message : String(error),
          triggerData: { oldStageId, newStageId },
        });
      }
    }
  }

  /**
   * Evaluate if score change trigger conditions are met
   */
  private evaluateScoreChangeTrigger(
    rule: AutomationRule,
    oldScore: number,
    newScore: number,
    newStatus: string
  ): boolean {
    const conditions = rule.triggerConditions as any;

    // Check minimum score (new score must be at or above threshold)
    if (conditions.minScore !== undefined && newScore < conditions.minScore) {
      return false;
    }

    // Check maximum score (new score must be at or below threshold)
    if (conditions.maxScore !== undefined && newScore > conditions.maxScore) {
      return false;
    }

    // Check status
    if (conditions.status && conditions.status !== newStatus) {
      return false;
    }

    // Check score increase/decrease
    if (conditions.scoreChange === "increase" && newScore <= oldScore) {
      return false;
    }
    if (conditions.scoreChange === "decrease" && newScore >= oldScore) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate if conversation trigger conditions are met
   */
  private async evaluateConversationTrigger(
    rule: AutomationRule,
    conversation: Conversation,
    lead: Lead
  ): Promise<boolean> {
    const conditions = rule.triggerConditions as any;

    // Check if from lead (not sent by us)
    if (conditions.isFromLead !== undefined) {
      if (conversation.isFromLead !== conditions.isFromLead) {
        return false;
      }
    }

    // Check for keywords in subject or body
    if (conditions.keywords && Array.isArray(conditions.keywords)) {
      const text = `${conversation.subject} ${conversation.body}`.toLowerCase();
      const hasKeyword = conditions.keywords.some((keyword: string) =>
        text.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    // Check lead score range
    if (conditions.minScore !== undefined && lead.score < conditions.minScore) {
      return false;
    }
    if (conditions.maxScore !== undefined && lead.score > conditions.maxScore) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate if stage change trigger conditions are met
   */
  private evaluateStageChangeTrigger(
    rule: AutomationRule,
    oldStageId: string,
    newStageId: string
  ): boolean {
    const conditions = rule.triggerConditions as any;

    if (conditions.fromStageId && conditions.fromStageId !== oldStageId) {
      return false;
    }

    if (conditions.toStageId && conditions.toStageId !== newStageId) {
      return false;
    }

    return true;
  }

  /**
   * Execute the automation action
   */
  private async executeAction(
    rule: AutomationRule,
    context: TriggerContext
  ): Promise<void> {
    const config = rule.actionConfig as any;

    switch (rule.actionType) {
      case "convert_to_deal":
        await this.convertToDeal(context.lead!, config);
        break;

      case "create_task":
        await this.createTask(context.lead!, config);
        break;

      case "advance_stage":
        await this.advanceStage(context.deal!, config);
        break;

      case "assign_lead":
        await this.assignLead(context.lead!, config);
        break;

      case "send_email":
        await this.sendEmail(context.lead!, config);
        break;

      default:
        throw new Error(`Unknown action type: ${rule.actionType}`);
    }

    // Log successful execution
    await storage.logAutomationExecution({
      ruleId: rule.id,
      leadId: context.lead?.id,
      dealId: context.deal?.id,
      success: 1,
      triggerData: {
        oldScore: context.oldScore,
        newScore: context.newScore,
        oldStageId: context.oldStageId,
        newStageId: context.newStageId,
      },
      actionResult: { actionType: rule.actionType, config },
    });

    console.log(`Automation rule "${rule.name}" executed successfully`);
  }

  /**
   * Action: Convert lead to deal
   */
  private async convertToDeal(lead: Lead, config: any): Promise<void> {
    const pipelines = await storage.getPipelines();
    const defaultPipeline = pipelines.find((p) => p.isDefault === 1) || pipelines[0];
    
    if (!defaultPipeline) {
      throw new Error("No pipeline found for deal creation");
    }

    const stages = await storage.getPipelineStages(defaultPipeline.id);
    const firstStage = stages.sort((a: any, b: any) => a.order - b.order)[0];

    if (!firstStage) {
      throw new Error("No stages found in pipeline");
    }

    const deal = await storage.createDeal({
      name: config.dealName || `${lead.name} - ${lead.company || "Deal"}`,
      description: config.dealDescription || `Auto-converted from lead`,
      amount: config.amount || 0,
      pipelineId: defaultPipeline.id,
      stageId: firstStage.id,
      leadId: lead.id,
      ownerId: lead.ownerId || "admin-001",
      probability: firstStage.defaultProbability,
    });

    await storage.createActivity({
      leadId: lead.id,
      dealId: deal.id,
      type: "deal_created",
      description: `Deal "${deal.name}" auto-created by automation rule`,
      metadata: { ruleType: "auto_conversion", dealId: deal.id },
    });
  }

  /**
   * Action: Create task
   */
  private async createTask(lead: Lead, config: any): Promise<void> {
    const dueDate = config.daysFromNow
      ? new Date(Date.now() + config.daysFromNow * 24 * 60 * 60 * 1000)
      : undefined;

    await storage.createTask({
      leadId: lead.id,
      title: config.title || "Follow up",
      description: config.description || "",
      dueDate,
      priority: config.priority || "medium",
      status: "pending",
      assignedToUserId: lead.ownerId || undefined,
    });
  }

  /**
   * Action: Advance deal stage
   */
  private async advanceStage(deal: Deal, config: any): Promise<void> {
    const stages = await storage.getPipelineStages(deal.pipelineId);
    const currentStage = stages.find((s) => s.id === deal.stageId);
    
    if (!currentStage) return;

    const nextStage = stages
      .filter((s: any) => s.order > currentStage.order)
      .sort((a: any, b: any) => a.order - b.order)[0];

    if (nextStage) {
      await storage.updateDeal(deal.id, {
        stageId: nextStage.id,
        probability: nextStage.defaultProbability,
      });

      await storage.createDealStageHistory({
        dealId: deal.id,
        fromStageId: deal.stageId,
        toStageId: nextStage.id,
        probability: nextStage.defaultProbability,
        amount: deal.amount,
        movedById: undefined,
      });
    }
  }

  /**
   * Action: Assign lead
   */
  private async assignLead(lead: Lead, config: any): Promise<void> {
    if (config.userId) {
      await storage.updateLead(lead.id, {
        ownerId: config.userId,
      });

      await storage.createActivity({
        leadId: lead.id,
        type: "lead_assigned",
        description: `Lead auto-assigned to user`,
        metadata: { userId: config.userId, assignedBy: "automation" },
      });
    }
  }

  /**
   * Action: Send email
   */
  private async sendEmail(lead: Lead, config: any): Promise<void> {
    // This would integrate with the email sending system
    console.log(`Would send email to ${lead.email} with template: ${config.templateId}`);
    
    await storage.createActivity({
      leadId: lead.id,
      type: "email_queued",
      description: `Email queued for sending via automation`,
      metadata: { templateId: config.templateId },
    });
  }
}

export const automationEngine = new AutomationEngine();
