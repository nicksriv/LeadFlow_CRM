import 'dotenv/config';
import { db } from '../server/db.js';
import { linkedInProfileHistory } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

async function checkHistory() {
    try {
        // Get total count
        const totalCount = await db.select({
            count: sql<number>`count(*)`
        }).from(linkedInProfileHistory);

        console.log(`\n=== PROFILE HISTORY CHECK ===`);
        console.log(`Total profiles in history: ${totalCount[0].count}`);

        // Get grouped by search criteria
        const grouped = await db.select({
            searchKey: linkedInProfileHistory.searchKey,
            count: sql<number>`count(*)`,
            latestView: sql<Date>`max(viewed_at)`
        })
            .from(linkedInProfileHistory)
            .groupBy(linkedInProfileHistory.searchKey)
            .orderBy(sql`max(viewed_at) DESC`);

        console.log(`\nSearches performed:`);
        grouped.forEach((group, idx) => {
            console.log(`  ${idx + 1}. "${group.searchKey}" - ${group.count} profiles (latest: ${group.latestView})`);
        });

        console.log(`\n=== END OF CHECK ===\n`);
        process.exit(0);
    } catch (error) {
        console.error('Error checking history:', error);
        process.exit(1);
    }
}

checkHistory();
