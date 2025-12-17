import 'dotenv/config';
import { db } from './server/db';
import { scrapedProfiles } from './shared/schema';
import { sql } from 'drizzle-orm';

async function cleanupDuplicates() {
    console.log('Starting duplicate profile cleanup...');

    // SQL to delete duplicates, keeping only the most recent one per URL
    const result = await db.execute(sql`
        DELETE FROM scraped_profiles
        WHERE id IN (
            SELECT id
            FROM (
                SELECT 
                    id,
                    url,
                    ROW_NUMBER() OVER (
                        PARTITION BY 
                            LOWER(TRIM(REGEXP_REPLACE(url, '\\?.*$', ''))),  -- Normalize URL
                            user_id
                        ORDER BY scraped_at DESC  -- Keep most recent
                    ) as rn
                FROM scraped_profiles
            ) ranked
            WHERE rn > 1  -- Delete all except the first (most recent)
        )
    `);

    console.log('✅ Cleanup complete!');
    console.log('Result:', result);

    // Show remaining profiles
    const remaining = await db.select().from(scrapedProfiles);
    console.log(`\nRemaining profiles: ${remaining.length}`);
    console.log('\nProfiles:');
    remaining.forEach(p => {
        console.log(`  - ${p.name} (${p.url})`);
    });

    process.exit(0);
}

cleanupDuplicates().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
