/**
 * Seed Demo Data Script
 * 
 * Creates demo users with different roles and sample data for testing RBAC
 * 
 * Run with: npx tsx --env-file=.env server/seed-demo-data.ts
 * Or: NODE_OPTIONS='--env-file=.env' npx tsx server/seed-demo-data.ts
 */

// Import dotenv/config first to load environment variables
import "dotenv/config";

import { storage } from "./storage.js";
import AuthService from "./auth.js";

async function seedDemoData() {
    console.log("🌱 Seeding demo data...\n");

    try {
        // 1. Create Admin User
        console.log("Creating Admin user...");
        const admin = await AuthService.register(
            "admin@leadflow.com",
            "admin123",
            "Admin User"
        );

        // Update role to admin
        await storage.updateUser(admin.id, { role: "admin" });
        console.log("✅ Admin created: admin@leadflow.com / admin123");

        // 2. Create Manager User
        console.log("\nCreating Manager user...");
        const manager = await AuthService.register(
            "manager@leadflow.com",
            "manager123",
            "Sarah Manager"
        );

        await storage.updateUser(manager.id, { role: "manager" });
        console.log("✅ Manager created: manager@leadflow.com / manager123");

        // 3. Create Sales Rep User (reports to Manager)
        console.log("\nCreating Sales Rep user...");
        const salesRep = await AuthService.register(
            "sales@leadflow.com",
            "sales123",
            "John Sales"
        );

        await storage.updateUser(salesRep.id, {
            role: "sales_rep",
            managerId: manager.id  // Reports to manager
        });
        console.log("✅ Sales Rep created: sales@leadflow.com / sales123");
        console.log(`   Reports to: Sarah Manager`);

        // 4. Create another Sales Rep (also reports to Manager)
        console.log("\nCreating Sales Rep 2 user...");
        const salesRep2 = await AuthService.register(
            "sales2@leadflow.com",
            "sales123",
            "Emma Sales"
        );

        await storage.updateUser(salesRep2.id, {
            role: "sales_rep",
            managerId: manager.id
        });
        console.log("✅ Sales Rep 2 created: sales2@leadflow.com / sales123");
        console.log(`   Reports to: Sarah Manager`);

        // 5. Create sample leads for each user
        console.log("\n📊 Creating sample leads...");

        // Admin's leads
        await storage.createLead({
            name: "Admin Lead 1",
            email: "admin.lead1@example.com",
            company: "Big Corp",
            status: "cold",
            ownerId: admin.id,
        });

        await storage.createLead({
            name: "Admin Lead 2",
            email: "admin.lead2@example.com",
            company: "Enterprise Inc",
            status: "warm",
            ownerId: admin.id,
        });
        console.log("✅ Created 2 leads for Admin");

        // Manager's leads
        await storage.createLead({
            name: "Manager Lead 1",
            email: "manager.lead1@example.com",
            company: "Manager Corp",
            status: "hot",
            ownerId: manager.id,
        });

        await storage.createLead({
            name: "Manager Lead 2",
            email: "manager.lead2@example.com",
            company: "Manager LLC",
            status: "cold",
            ownerId: manager.id,
        });
        console.log("✅ Created 2 leads for Manager");

        // Sales Rep 1's leads
        await storage.createLead({
            name: "Sales Lead 1",
            email: "sales.lead1@example.com",
            company: "Small Business",
            status: "cold",
            ownerId: salesRep.id,
        });

        await storage.createLead({
            name: "Sales Lead 2",
            email: "sales.lead2@example.com",
            company: "Startup Inc",
            status: "warm",
            ownerId: salesRep.id,
        });
        console.log("✅ Created 2 leads for Sales Rep 1");

        // Sales Rep 2's leads
        await storage.createLead({
            name: "Emma's Lead 1",
            email: "emma.lead1@example.com",
            company: "Tech Startup",
            status: "hot",
            ownerId: salesRep2.id,
        });
        console.log("✅ Created 1 lead for Sales Rep 2");

        // 6. Fetch all created leads for adding related data
        console.log("\n📧 Creating sample conversations, tasks, and activities...");

        const allLeads = await storage.getLeads({ id: admin.id, role: 'admin', email: admin.email, name: admin.name });

        // Helper function to create conversations for a lead
        async function createConversationsForLead(leadId: string, count: number) {
            const subjects = [
                "Product Demo Request",
                "Follow-up: Pricing Discussion",
                "Re: Integration Questions",
                "Meeting Schedule",
                "Contract Review",
            ];

            const bodies = [
                "Hi, I'm interested in scheduling a product demo. What times work for your team next week?",
                "Thanks for the call today. As discussed, I'd like to review the pricing options for the enterprise plan.",
                "Following up on our conversation about API integration. Do you have documentation I can review?",
                "Let's schedule a 30-minute call to discuss implementation details. Are you available this Thursday?",
                "I've reviewed the contract. Could we discuss the terms in section 3.2?",
            ];

            for (let i = 0; i < count; i++) {
                await storage.createConversation({
                    leadId,
                    subject: subjects[i % subjects.length],
                    body: bodies[i % bodies.length],
                    sentAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000), // Days ago
                    isFromLead: i % 2 === 0, // Alternate between received and sent
                });
            }
        }

        // Helper function to create tasks for a lead
        async function createTasksForLead(leadId: string, count: number) {
            const titles = [
                "Follow up on product demo",
                "Send pricing proposal",
                "Schedule implementation call",
                "Review contract terms",
                "Send onboarding materials",
            ];

            const descriptions = [
                "Check if they're ready to move forward after the demo",
                "Prepare customized pricing based on their requirements",
                "Coordinate with technical team for implementation planning",
                "Address concerns from legal team",
                "Share getting started guide and training resources",
            ];

            const priorities = ["normal", "high", "urgent"] as const;
            const statuses = ["pending", "in_progress", "completed"] as const;

            for (let i = 0; i < count; i++) {
                await storage.createTask({
                    leadId,
                    title: titles[i % titles.length],
                    description: descriptions[i % descriptions.length],
                    priority: priorities[i % priorities.length],
                    status: statuses[i % statuses.length],
                    dueDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000), // Days from now
                });
            }
        }

        // Helper function to create activities for a lead  
        async function createActivitiesForLead(leadId: string, count: number) {
            const descriptions = [
                "Email sent: Product introduction",
                "Call completed: Discovery call",
                "Email received: Follow-up questions",
                "Meeting scheduled: Demo presentation",
                "Lead score updated: +15 points",
            ];

            for (let i = 0; i < count; i++) {
                await storage.createActivity({
                    leadId,
                    type: i % 2 === 0 ? "email" : "call",
                    description: descriptions[i % descriptions.length],
                });
            }
        }

        // Add data for each lead
        let conversationCount = 0;
        let taskCount = 0;
        let activityCount = 0;

        for (const lead of allLeads.slice(0, 7)) { // Only seed the 7 new leads
            // More data for hot leads, less for cold
            const dataAmount = lead.status === "hot" ? 3 : lead.status === "warm" ? 2 : 1;

            await createConversationsForLead(lead.id, dataAmount);
            conversationCount += dataAmount;

            await createTasksForLead(lead.id, dataAmount);
            taskCount += dataAmount;

            await createActivitiesForLead(lead.id, dataAmount);
            activityCount += dataAmount;
        }

        console.log(`✅ Created ${conversationCount} conversations`);
        console.log(`✅ Created ${taskCount} tasks`);
        console.log(`✅ Created ${activityCount} activities`);

        // Summary
        console.log("\n" + "=".repeat(60));
        console.log("🎉 Demo Data Created Successfully!");
        console.log("=".repeat(60));
        console.log("\n📋 Demo Accounts:");
        console.log("\n1️⃣  ADMIN (sees all data)");
        console.log("   Email: admin@leadflow.com");
        console.log("   Password: admin123");
        console.log("   Leads: 2 (will see ALL 7 leads)");

        console.log("\n2️⃣  MANAGER (sees own + team data)");
        console.log("   Email: manager@leadflow.com");
        console.log("   Password: manager123");
        console.log("   Leads: 2 (will see own 2 + team's 3 = 5 leads total)");
        console.log("   Team: John Sales, Emma Sales");

        console.log("\n3️⃣  SALES REP 1 (sees only own data)");
        console.log("   Email: sales@leadflow.com");
        console.log("   Password: sales123");
        console.log("   Leads: 2 (will see only own 2 leads)");
        console.log("   Manager: Sarah Manager");

        console.log("\n4️⃣  SALES REP 2 (sees only own data)");
        console.log("   Email: sales2@leadflow.com");
        console.log("   Password: sales123");
        console.log("   Leads: 1 (will see only own 1 lead)");
        console.log("   Manager: Sarah Manager");

        console.log("\n" + "=".repeat(60));
        console.log("🧪 Test RBAC:");
        console.log("- Login as each user to verify data isolation");
        console.log("- Admin should see all 7 leads");
        console.log("- Manager should see 5 leads (own + team)");
        console.log("- Sales reps should see only their own leads");
        console.log("=".repeat(60) + "\n");

    } catch (error: any) {
        console.error("\n❌ Error seeding data:", error.message);

        if (error.message.includes("duplicate key")) {
            console.log("\n💡 Tip: Users already exist. Delete existing users first or use different emails.");
        }

        process.exit(1);
    }
}

// Run the seed script
seedDemoData()
    .then(() => {
        console.log("✨ Seeding complete!\n");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
