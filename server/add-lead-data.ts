/**
 * Add Related Data to Existing Leads
 * 
 * Adds conversations, tasks, and activities to existing demo leads
 * 
 * Run with: npx tsx --env-file=.env server/add-lead-data.ts
 */

// Import dotenv/config first to load environment variables
import "dotenv/config";

import { storage } from "./storage.js";

async function addLeadData() {
    console.log("📧 Adding conversations, tasks, and activities to existing leads...\n");

    try {
        // Get all leads (using admin context to see everything)
        const adminUser = { id: "admin", role: "admin" as const, email: "admin@example.com", name: "Admin" };
        const allLeads = await storage.getLeads(adminUser);

        if (allLeads.length === 0) {
            console.log("❌ No leads found. Run seed-demo-data.ts first!");
            process.exit(1);
        }

        console.log(`Found ${allLeads.length} leads\n`);

        // Helper function to create conversations for a lead
        async function createConversationsForLead(leadId: string, leadEmail: string, count: number) {
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
                const isFromLead = i % 2 === 0;
                await storage.createConversation({
                    leadId,
                    subject: subjects[i % subjects.length],
                    body: bodies[i % bodies.length],
                    fromEmail: isFromLead ? leadEmail : "sales@leadflow.com",
                    toEmail: isFromLead ? "sales@leadflow.com" : leadEmail,
                    sentAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000), // Days ago
                    isFromLead: isFromLead ? 1 : 0, // Alternate between received (1) and sent (0)
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

        for (const lead of allLeads) {
            // More data for hot leads, less for cold
            const dataAmount = lead.status === "hot" ? 3 : lead.status === "warm" ? 2 : 1;

            console.log(`Adding data for "${lead.name}" (${lead.status})...`);

            await createConversationsForLead(lead.id, lead.email, dataAmount);
            conversationCount += dataAmount;

            await createTasksForLead(lead.id, dataAmount);
            taskCount += dataAmount;

            await createActivitiesForLead(lead.id, dataAmount);
            activityCount += dataAmount;
        }

        console.log(`\n✅ Created ${conversationCount} conversations`);
        console.log(`✅ Created ${taskCount} tasks`);
        console.log(`✅ Created ${activityCount} activities`);

        console.log("\n" + "=".repeat(60));
        console.log("🎉 Lead Data Added Successfully!");
        console.log("=".repeat(60));
        console.log("\n💡 Now refresh your browser and click on any lead to see:");
        console.log("   - Email conversations");
        console.log("   - Follow-up tasks");
        console.log("   - Activity timeline");
        console.log("=".repeat(60) + "\n");

    } catch (error: any) {
        console.error("\n❌ Error adding data:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the script
addLeadData()
    .then(() => {
        console.log("✨ Complete!\n");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
