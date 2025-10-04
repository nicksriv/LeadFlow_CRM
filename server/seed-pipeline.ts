import { storage } from "./storage";

async function seedPipeline() {
  console.log("Checking for existing default pipeline...");
  
  const existingPipeline = await storage.getDefaultPipeline();
  if (existingPipeline) {
    console.log("Default pipeline already exists:", existingPipeline.name);
    return;
  }

  console.log("Creating default sales pipeline...");
  
  const pipeline = await storage.createPipeline({
    name: "Sales Pipeline",
    description: "Default sales pipeline for managing deals",
    isDefault: 1,
  });

  console.log("Created pipeline:", pipeline.name);

  const stages = [
    { name: "Lead", order: 0, defaultProbability: 10, color: "#6B7280" },
    { name: "Qualified", order: 1, defaultProbability: 20, color: "#3B82F6" },
    { name: "Proposal", order: 2, defaultProbability: 40, color: "#8B5CF6" },
    { name: "Negotiation", order: 3, defaultProbability: 60, color: "#F59E0B" },
    { name: "Closed Won", order: 4, defaultProbability: 100, color: "#10B981" },
    { name: "Closed Lost", order: 5, defaultProbability: 0, color: "#EF4444" },
  ];

  console.log("Creating pipeline stages...");
  
  for (const stage of stages) {
    const created = await storage.createStage({
      ...stage,
      pipelineId: pipeline.id,
    });
    console.log(`  ✓ Created stage: ${created.name} (${created.defaultProbability}%)`);
  }

  console.log("✅ Pipeline seeding complete!");
}

seedPipeline().catch(console.error);
