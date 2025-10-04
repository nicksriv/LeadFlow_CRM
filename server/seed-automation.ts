import { storage } from "./storage";

async function seedAutomation() {
  console.log("Checking for existing automation rules...");
  
  const existingRules = await storage.getAutomationRules();
  if (existingRules.length > 0) {
    console.log(`Found ${existingRules.length} existing automation rules. Skipping seed.`);
    return;
  }

  console.log("Creating default automation rules...");

  // Rule 1: Auto-convert hot leads to deals
  const rule1 = await storage.createAutomationRule({
    name: "Auto-Convert Hot Leads",
    description: "Automatically convert leads to deals when they reach Hot status (score ≥ 80)",
    triggerType: "score_changed",
    triggerConditions: {
      minScore: 80,
      status: "hot",
    },
    actionType: "convert_to_deal",
    actionConfig: {
      dealName: null,
      dealDescription: "Auto-converted from hot lead",
      amount: 5000,
    },
    isActive: 1,
  });
  console.log(`  ✓ Created: ${rule1.name}`);

  // Rule 2: Create follow-up task for warm leads
  const rule2 = await storage.createAutomationRule({
    name: "Follow-up Task for Warm Leads",
    description: "Create a follow-up task when a lead becomes warm",
    triggerType: "score_changed",
    triggerConditions: {
      minScore: 34,
      maxScore: 66,
      status: "warm",
    },
    actionType: "create_task",
    actionConfig: {
      title: "Follow up with warm lead",
      description: "Lead is showing interest. Schedule a call to discuss their needs.",
      daysFromNow: 2,
      priority: "high",
    },
    isActive: 1,
  });
  console.log(`  ✓ Created: ${rule2.name}`);

  // Rule 3: Alert on pricing inquiry
  const rule3 = await storage.createAutomationRule({
    name: "Pricing Inquiry Alert",
    description: "Create urgent task when lead mentions pricing",
    triggerType: "conversation_received",
    triggerConditions: {
      isFromLead: 1,
      keywords: ["price", "pricing", "cost", "quote", "budget"],
    },
    actionType: "create_task",
    actionConfig: {
      title: "URGENT: Pricing inquiry received",
      description: "Lead has asked about pricing. Respond with a quote within 24 hours.",
      daysFromNow: 1,
      priority: "urgent",
    },
    isActive: 1,
  });
  console.log(`  ✓ Created: ${rule3.name}`);

  // Rule 4: Create deal on buying signal
  const rule4 = await storage.createAutomationRule({
    name: "Auto-Deal on Buying Signal",
    description: "Auto-create deal when lead mentions ready to buy or purchase",
    triggerType: "conversation_received",
    triggerConditions: {
      isFromLead: 1,
      keywords: ["ready to buy", "purchase", "place an order", "move forward", "sign up"],
      minScore: 50,
    },
    actionType: "convert_to_deal",
    actionConfig: {
      dealName: null,
      dealDescription: "Auto-created: Lead expressed buying intent",
      amount: 10000,
    },
    isActive: 1,
  });
  console.log(`  ✓ Created: ${rule4.name}`);

  // Rule 5: Re-engagement task for cold leads
  const rule5 = await storage.createAutomationRule({
    name: "Re-engagement for Cold Leads",
    description: "Create re-engagement task when lead drops to cold",
    triggerType: "score_changed",
    triggerConditions: {
      maxScore: 33,
      status: "cold",
      scoreChange: "decrease",
    },
    actionType: "create_task",
    actionConfig: {
      title: "Re-engage cold lead",
      description: "Lead engagement has dropped. Consider sending a value-add email or special offer.",
      daysFromNow: 7,
      priority: "low",
    },
    isActive: 0,
  });
  console.log(`  ✓ Created: ${rule5.name} (inactive)`);

  console.log("✅ Automation rules seeding complete!");
  console.log(`
📋 Created automation rules:
   1. Auto-Convert Hot Leads (Active) - Score ≥ 80 → Create Deal
   2. Follow-up Task for Warm Leads (Active) - Score 34-66 → Create Task
   3. Pricing Inquiry Alert (Active) - Keywords detected → Create Urgent Task
   4. Auto-Deal on Buying Signal (Active) - Buying keywords + Score ≥ 50 → Create Deal
   5. Re-engagement for Cold Leads (Inactive) - Score ≤ 33 → Create Task
  `);
}

seedAutomation().catch(console.error);
