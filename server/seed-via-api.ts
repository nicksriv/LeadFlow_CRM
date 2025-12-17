/**
 * Seed Demo Data Via API
 * 
 * Seeds demo users by hitting the registration API endpoint
 * Run with: npx tsx server/seed-via-api.ts
 */

async function seedViaAPI() {
    const baseUrl = "http://localhost:5000";

    console.log("🌱 Seeding demo data via API...\n");

    const users = [
        {
            name: "Admin User",
            email: "admin@leadflow.com",
            password: "admin123",
            role: "admin"
        },
        {
            name: "Sarah Manager",
            email: "manager@leadflow.com",
            password: "manager123",
            role: "manager"
        },
        {
            name: "John Sales",
            email: "sales@leadflow.com",
            password: "sales123",
            role: "sales_rep"
        },
        {
            name: "Emma Sales",
            email: "sales2@leadflow.com",
            password: "sales123",
            role: "sales_rep"
        }
    ];

    for (const user of users) {
        try {
            const response = await fetch(`${baseUrl}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(user)
            });

            if (response.ok) {
                console.log(`✅ Created: ${user.email} (${user.role})`);
            } else {
                const error = await response.json();
                if (error.error?.includes("duplicate") || error.error?.includes("already exists")) {
                    console.log(`⚠️  Already exists: ${user.email}`);
                } else {
                    console.log(`❌ Failed: ${user.email} - ${error.error}`);
                }
            }
        } catch (error: any) {
            console.error(`❌ Error creating ${user.email}:`, error.message);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Demo Users Ready!");
    console.log("=".repeat(60));
    console.log("\n📋 Login Credentials:");
    console.log("\n1️⃣  ADMIN");
    console.log("   📧 admin@leadflow.com");
    console.log("   🔑 admin123");

    console.log("\n2️⃣  MANAGER");
    console.log("   📧 manager@leadflow.com");
    console.log("   🔑 manager123");

    console.log("\n3️⃣  SALES REP 1");
    console.log("   📧 sales@leadflow.com");
    console.log("   🔑 sales123");

    console.log("\n4️⃣  SALES REP 2");
    console.log("   📧 sales2@leadflow.com");
    console.log("   🔑 sales123");

    console.log("\n" + "=".repeat(60));
    console.log("💡 Note: Roles will be 'sales_rep' by default.");
    console.log("   Update roles in the database or via admin UI.");
    console.log("=".repeat(60) + "\n");
}

seedViaAPI().catch(console.error);
