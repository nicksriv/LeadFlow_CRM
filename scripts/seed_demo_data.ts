
import { db, pool } from "../server/db";
import {
    users, leads, pipelines, pipelineStages, deals, conversations,
    activities, scrapedProfiles, leadScores, tasks,
    type InsertUser, type InsertLead, type InsertPipeline,
    type InsertPipelineStage, type InsertDeal, type InsertConversation,
    type InsertActivity, type InsertScrapedProfile, type InsertTask
} from "../shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt} `;
}

const DEMO_USER_EMAIL = "demo@leadflow.com";

async function seed() {
    console.log("🌱 Starting database seeding...");

    try {
        // 1. Create Demo User
        console.log("Creating demo user...");
        const existingUser = await db.select().from(users).where(eq(users.email, DEMO_USER_EMAIL));

        let userId: string;

        if (existingUser.length === 0) {
            const [user] = await db.insert(users).values({
                name: "Demo User",
                email: DEMO_USER_EMAIL,
                role: "admin",
                isActive: 1,
            }).returning();
            userId = user.id;
            console.log("✅ Demo user created");
        } else {
            userId = existingUser[0].id;
            console.log("ℹ️ Demo user already exists");
        }

        // 2. Create Pipeline & Stages
        console.log("Creating pipeline...");
        const existingPipeline = await db.select().from(pipelines).where(eq(pipelines.name, "Sales Pipeline"));
        let pipelineId: string;

        if (existingPipeline.length === 0) {
            const [pipeline] = await db.insert(pipelines).values({
                name: "Sales Pipeline",
                description: "Standard B2B Sales Process",
                isDefault: 1,
                ownerId: userId,
            }).returning();
            pipelineId = pipeline.id;

            // Create Stages
            const stages = [
                { name: "Discovery", order: 1, defaultProbability: 10 },
                { name: "Qualification", order: 2, defaultProbability: 30 },
                { name: "Proposal", order: 3, defaultProbability: 60 },
                { name: "Negotiation", order: 4, defaultProbability: 80 },
                { name: "Closed Won", order: 5, defaultProbability: 100 },
                { name: "Closed Lost", order: 6, defaultProbability: 0 },
            ];

            for (const stage of stages) {
                await db.insert(pipelineStages).values({
                    pipelineId,
                    name: stage.name,
                    order: stage.order,
                    defaultProbability: stage.defaultProbability,
                });
            }
            console.log("✅ Pipeline and stages created");
        } else {
            pipelineId = existingPipeline[0].id;
            console.log("ℹ️ Pipeline already exists");
        }

        // Get stages for deal creation
        const stages = await db.select().from(pipelineStages).where(eq(pipelineStages.pipelineId, pipelineId));
        const stageMap = new Map(stages.map(s => [s.name, s.id]));

        // 3. Create Leads
        console.log("Creating leads...");
        const industries = ["Technology", "Finance", "Healthcare", "Retail", "Manufacturing"];
        const statuses = ["cold", "warm", "hot"] as const;

        const demoLeads = [
            { name: "Sarah Johnson", company: "TechFlow Solutions", title: "CTO" },
            { name: "Michael Chen", company: "DataStream Inc", title: "VP of Engineering" },
            { name: "Emily Davis", company: "CloudScale Systems", title: "Director of IT" },
            { name: "David Wilson", company: "FinTech Innovations", title: "Head of Product" },
            { name: "Jessica Martinez", company: "HealthCare Plus", title: "Operations Manager" },
            { name: "Robert Taylor", company: "Global Manufacturing", title: "Plant Manager" },
            { name: "Jennifer Anderson", company: "Retail Dynamics", title: "Marketing Director" },
            { name: "William Thomas", company: "SecureNet", title: "CISO" },
            { name: "Elizabeth Jackson", company: "EduTech Global", title: "CEO" },
            { name: "James White", company: "GreenEnergy Corp", title: "Sustainability Director" },
            { name: "Patricia Harris", company: "Logistics Pro", title: "Supply Chain Manager" },
            { name: "Thomas Martin", company: "BuildRight Construction", title: "Project Manager" },
            { name: "Linda Thompson", company: "Creative Agency", title: "Creative Director" },
            { name: "Barbara Garcia", company: "FoodServices Ltd", title: "Procurement Manager" },
            { name: "Richard Martinez", company: "AutoParts Inc", title: "Sales Director" },
        ];

        const createdLeads = [];

        for (const leadData of demoLeads) {
            const [lead] = await db.insert(leads).values({
                name: leadData.name,
                email: `${leadData.name.toLowerCase().replace(' ', '.')} @${leadData.company.toLowerCase().replace(' ', '')}.com`,
                company: leadData.company,
                position: leadData.title,
                industry: industries[Math.floor(Math.random() * industries.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)],
                score: Math.floor(Math.random() * 100),
                ownerId: userId,
                city: "San Francisco",
                country: "USA",
                linkedinUrl: `https://linkedin.com/in/${leadData.name.toLowerCase().replace(' ', '-')}`,
                source: "LinkedIn",
            } as any).returning();
            createdLeads.push(lead);
        }
        console.log(`✅ ${createdLeads.length} leads created`);

        // 4. Create Deals
        console.log("Creating deals...");
        const dealLeads = createdLeads.slice(0, 10); // Create deals for first 10 leads

        for (const lead of dealLeads) {
            const stageName = Array.from(stageMap.keys())[Math.floor(Math.random() * (stages.length - 2))]; // Exclude closed stages mostly
            const stageId = stageMap.get(stageName)!;
            const amount = Math.floor(Math.random() * 50000) + 5000;

            await db.insert(deals).values({
                name: `${lead.company} Contract`,
                amount,
                pipelineId,
                stageId,
                leadId: lead.id,
                ownerId: userId,
                status: "open",
                probability: stages.find(s => s.id === stageId)?.defaultProbability || 50,
                expectedCloseDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Next 30 days
            });
        }
        console.log("✅ Deals created");

        // 5. Create Conversations (Inbox)
        console.log("Creating conversations...");
        const inboxLeads = createdLeads.slice(0, 5);

        for (const lead of inboxLeads) {
            // Incoming email
            await db.insert(conversations).values({
                leadId: lead.id,
                subject: `Re: Partnership Opportunity with ${lead.company}`,
                body: `Hi Demo User,\n\nThanks for reaching out. I'd be interested in learning more about your services. Do you have time for a call next week?\n\nBest,\n${lead.name}`,
                fromEmail: lead.email,
                toEmail: DEMO_USER_EMAIL,
                sentAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
                isFromLead: 1,
            });

            // Outgoing reply
            await db.insert(conversations).values({
                leadId: lead.id,
                subject: `Re: Partnership Opportunity with ${lead.company}`,
                body: `Hi ${lead.name.split(' ')[0]},\n\nGreat to hear from you! How does Tuesday at 2pm work?\n\nBest,\nDemo User`,
                fromEmail: DEMO_USER_EMAIL,
                toEmail: lead.email,
                sentAt: new Date(),
                isFromLead: 0,
            });
        }
        console.log("✅ Conversations created");

        // 6. Create Tasks
        console.log("Creating tasks...");
        const taskLeads = createdLeads.slice(5, 10);

        for (const lead of taskLeads) {
            await db.insert(tasks).values({
                leadId: lead.id,
                title: `Follow up with ${lead.name}`,
                description: "Check in regarding the proposal sent last week.",
                dueDate: new Date(Date.now() + Math.random() * 5 * 24 * 60 * 60 * 1000),
                priority: "high",
                status: "pending",
                assignedToUserId: userId,
            });
        }
        console.log("✅ Tasks created");

        // 7. Create Scraped Profiles (Archives)
        console.log("Creating scraped profiles...");
        const scrapedData = [
            { name: "Alice Cooper", headline: "Senior Developer at Google", location: "Mountain View, CA" },
            { name: "Bob Marley", headline: "Musician & Entrepreneur", location: "Kingston, Jamaica" },
            { name: "Charlie Brown", headline: "Product Manager at Facebook", location: "Menlo Park, CA" },
            { name: "Diana Prince", headline: "Curator at Louvre Museum", location: "Paris, France" },
            { name: "Evan Wright", headline: "Journalist at Rolling Stone", location: "New York, NY" },
        ];

        for (const profile of scrapedData) {
            try {
                await db.insert(scrapedProfiles).values({
                    name: profile.name,
                    headline: profile.headline,
                    location: profile.location,
                    url: `https://linkedin.com/in/${profile.name.toLowerCase().replace(' ', '-')}`,
                    avatar: `https://ui-avatars.com/api/?name=${profile.name.replace(' ', '+')}&background=random`,
                });
            } catch (e) {
                // Ignore duplicates
            }
        }
        console.log("✅ Scraped profiles created");

        console.log("🎉 Database seeding completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
}

seed();
