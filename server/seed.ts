import "dotenv/config";
import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
    console.log("🌱 Starting database seeding...");

    // 1. Seed Users
    console.log("Creating users...");
    const users = [
        {
            name: "Admin User",
            email: "admin@leadflow.com",
            role: "admin",
            isActive: 1,
        },
        {
            name: "Sales Manager",
            email: "manager@leadflow.com",
            role: "sales_manager",
            isActive: 1,
        },
        {
            name: "Sales Rep 1",
            email: "rep1@leadflow.com",
            role: "sales_rep",
            isActive: 1,
        },
        {
            name: "Sales Rep 2",
            email: "rep2@leadflow.com",
            role: "sales_rep",
            isActive: 1,
        },
    ];

    const createdUsers = [];
    for (const user of users) {
        const existing = await storage.getUser(user.email); // Note: storage.getUser takes ID, not email. We need to check differently or just try insert.
        // Since storage doesn't have getUserByEmail, we'll just list all and check.
        const allUsers = await storage.getUsers();
        const found = allUsers.find(u => u.email === user.email);

        if (!found) {
            const created = await storage.createUser(user);
            createdUsers.push(created);
            console.log(`  ✓ Created user: ${user.name}`);
        } else {
            createdUsers.push(found);
            console.log(`  ✓ User already exists: ${user.name}`);
        }
    }

    // 2. Seed Pipeline & Stages (Reusing logic from seed-pipeline.ts)
    console.log("Creating pipeline...");
    let pipeline = await storage.getDefaultPipeline();
    if (!pipeline) {
        pipeline = await storage.createPipeline({
            name: "Sales Pipeline",
            description: "Default sales pipeline",
            isDefault: 1,
            ownerId: createdUsers[0].id,
        });

        const stages = [
            { name: "Lead", order: 0, defaultProbability: 10, color: "#6B7280" },
            { name: "Qualified", order: 1, defaultProbability: 20, color: "#3B82F6" },
            { name: "Proposal", order: 2, defaultProbability: 40, color: "#8B5CF6" },
            { name: "Negotiation", order: 3, defaultProbability: 60, color: "#F59E0B" },
            { name: "Closed Won", order: 4, defaultProbability: 100, color: "#10B981" },
            { name: "Closed Lost", order: 5, defaultProbability: 0, color: "#EF4444" },
        ];

        for (const stage of stages) {
            await storage.createStage({ ...stage, pipelineId: pipeline.id });
        }
        console.log("  ✓ Created default pipeline and stages");
    } else {
        console.log("  ✓ Default pipeline already exists");
    }

    const stages = await storage.getStages(pipeline.id);

    // 3. Seed Leads
    console.log("Creating leads...");
    const leadsData = [
        {
            name: "John Smith",
            firstName: "John",
            lastName: "Smith",
            email: "john.smith@acme.com",
            phone: "+1-555-0101",
            company: "Acme Corp",
            position: "CTO",
            status: "hot",
            score: 85,
            ownerId: createdUsers[2].id, // Rep 1
            industry: "Technology",
            city: "San Francisco",
            state: "CA",
            country: "USA",
        },
        {
            name: "Sarah Johnson",
            firstName: "Sarah",
            lastName: "Johnson",
            email: "sarah.j@globex.com",
            phone: "+1-555-0102",
            company: "Globex Corporation",
            position: "VP of Sales",
            status: "warm",
            score: 60,
            ownerId: createdUsers[3].id, // Rep 2
            industry: "Manufacturing",
            city: "Chicago",
            state: "IL",
            country: "USA",
        },
        {
            name: "Michael Brown",
            firstName: "Michael",
            lastName: "Brown",
            email: "m.brown@startup.io",
            phone: "+1-555-0103",
            company: "StartupIO",
            position: "Founder",
            status: "cold",
            score: 25,
            ownerId: createdUsers[2].id, // Rep 1
            industry: "Technology",
            city: "Austin",
            state: "TX",
            country: "USA",
        },
    ];

    const createdLeads = [];
    for (const lead of leadsData) {
        const allLeads = await storage.getLeads();
        const found = allLeads.find(l => l.email === lead.email);

        if (!found) {
            const created = await storage.createLead(lead as any);
            createdLeads.push(created);
            console.log(`  ✓ Created lead: ${lead.name}`);
        } else {
            createdLeads.push(found);
            console.log(`  ✓ Lead already exists: ${lead.name}`);
        }
    }

    // 4. Seed Deals (Reusing logic from seed-deals.ts)
    console.log("Creating deals...");
    const dealsData = [
        {
            name: "Acme Corp Enterprise License",
            amount: 50000,
            stageId: stages[2].id, // Proposal
            pipelineId: pipeline.id,
            ownerId: createdUsers[2].id,
            leadId: createdLeads[0].id,
            expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
            name: "Globex Pilot Project",
            amount: 15000,
            stageId: stages[1].id, // Qualified
            pipelineId: pipeline.id,
            ownerId: createdUsers[3].id,
            leadId: createdLeads[1].id,
            expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        },
    ];

    for (const deal of dealsData) {
        const allDeals = await storage.getDeals({});
        const found = allDeals.find(d => d.name === deal.name);

        if (!found) {
            await storage.createDeal(deal as any);
            console.log(`  ✓ Created deal: ${deal.name}`);
        } else {
            console.log(`  ✓ Deal already exists: ${deal.name}`);
        }
    }

    console.log("✅ Seeding complete!");
    process.exit(0);
}

seed().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
