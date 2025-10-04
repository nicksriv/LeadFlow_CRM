import { storage } from "./storage";

async function seedDeals() {
  console.log("Checking for existing deals...");
  
  const existingDeals = await storage.getDeals({});
  if (existingDeals.length > 0) {
    console.log(`${existingDeals.length} deals already exist. Skipping seed.`);
    return;
  }

  const pipeline = await storage.getDefaultPipeline();
  if (!pipeline) {
    console.error("No default pipeline found. Run seed-pipeline.ts first.");
    return;
  }

  const stages = await storage.getStages(pipeline.id);
  if (stages.length === 0) {
    console.error("No stages found. Run seed-pipeline.ts first.");
    return;
  }

  // Get leads and users for associations
  const leads = await storage.getLeads();
  const users = await storage.getUsers();

  const sampleDeals = [
    {
      name: "Enterprise Software License",
      pipelineId: pipeline.id,
      stageId: stages[2].id, // Proposal stage
      amount: 150000,
      probability: 40,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      ownerId: users[0]?.id || "admin-001",
      leadId: leads[0]?.id || null,
      description: "Large enterprise deal for annual software licensing",
      status: "open",
    },
    {
      name: "Marketing Automation Platform",
      pipelineId: pipeline.id,
      stageId: stages[1].id, // Qualified stage
      amount: 75000,
      probability: 20,
      expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      ownerId: users[1]?.id || users[0]?.id || "admin-001",
      leadId: leads[1]?.id || null,
      description: "Mid-market opportunity for marketing automation",
      status: "open",
    },
    {
      name: "CRM Implementation",
      pipelineId: pipeline.id,
      stageId: stages[3].id, // Negotiation stage
      amount: 200000,
      probability: 60,
      expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      ownerId: users[0]?.id || "admin-001",
      leadId: leads[2]?.id || null,
      description: "Complete CRM implementation and training package",
      status: "open",
    },
    {
      name: "Cloud Migration Services",
      pipelineId: pipeline.id,
      stageId: stages[0].id, // Lead stage
      amount: 50000,
      probability: 10,
      expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      ownerId: users[2]?.id || users[0]?.id || "admin-001",
      leadId: null,
      description: "Cloud infrastructure migration for SMB",
      status: "open",
    },
    {
      name: "Analytics Dashboard",
      pipelineId: pipeline.id,
      stageId: stages[1].id, // Qualified stage
      amount: 35000,
      probability: 20,
      expectedCloseDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
      ownerId: users[1]?.id || users[0]?.id || "admin-001",
      leadId: null,
      description: "Custom analytics and reporting dashboard",
      status: "open",
    },
    {
      name: "Mobile App Development",
      pipelineId: pipeline.id,
      stageId: stages[2].id, // Proposal stage
      amount: 120000,
      probability: 40,
      expectedCloseDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      ownerId: users[0]?.id || "admin-001",
      leadId: null,
      description: "Native mobile app for iOS and Android",
      status: "open",
    },
  ];

  console.log("Creating sample deals...");
  
  for (const deal of sampleDeals) {
    const created = await storage.createDeal(deal);
    const stage = stages.find(s => s.id === created.stageId);
    console.log(`  ✓ Created deal: ${created.name} ($${created.amount.toLocaleString()}) in ${stage?.name}`);
  }

  console.log("✅ Deal seeding complete!");
}

seedDeals().catch(console.error);
