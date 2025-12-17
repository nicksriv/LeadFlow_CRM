import { db } from './server/db.js';
import { leads } from './shared/schema.js';
import { eq, isNull } from 'drizzle-orm';

/**
 * Fix orphaned leads from LinkedIn outreach by assigning them to the admin user
 */
async function fixOrphanedLeads() {
    console.log('🔍 Searching for orphaned leads (leads with no owner)...');

    const adminUserId = 'e18bc970-c710-4ef6-a903-73bfdbc99e02';

    // Find all leads without an owner
    const orphanedLeads = await db
        .select()
        .from(leads)
        .where(isNull(leads.ownerId));

    console.log(`📊 Found ${orphanedLeads.length} orphaned lead(s)`);

    if (orphanedLeads.length === 0) {
        console.log('✅ No orphaned leads found. All leads have owners!');
        return;
    }

    // Display orphaned leads
    console.log('\n📋 Orphaned leads:');
    orphanedLeads.forEach((lead, index) => {
        console.log(`  ${index + 1}. ${lead.name} (${lead.email}) - ID: ${lead.id}`);
    });

    // Update all orphaned leads to be owned by admin
    console.log(`\n🔧 Assigning all orphaned leads to admin user (${adminUserId})...`);

    const result = await db
        .update(leads)
        .set({ ownerId: adminUserId })
        .where(isNull(leads.ownerId))
        .returning();

    console.log(`✅ Successfully assigned ${result.length} lead(s) to admin user!`);

    // Display updated leads
    console.log('\n📋 Updated leads:');
    result.forEach((lead, index) => {
        console.log(`  ${index + 1}. ${lead.name} - Owner: ${lead.ownerId}`);
    });

    process.exit(0);
}

fixOrphanedLeads().catch((error) => {
    console.error('❌ Error fixing orphaned leads:', error);
    process.exit(1);
});
