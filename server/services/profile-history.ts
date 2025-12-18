import { db } from '../db.js';
import { linkedInProfileHistory, type InsertLinkedInProfileHistory, type LinkedInProfileHistory } from '../../shared/schema.js';
import { eq, and, gte, lte, asc, desc, sql } from 'drizzle-orm';

interface SearchCriteria {
    jobTitle?: string;
    industry?: string;
    keywords?: string; // Location
    company?: string;
}

interface ProfileResult {
    id: string;
    name: string;
    url: string;
    avatar?: string | null;
    headline?: string;
    location?: string;
    summary?: string;
    currentCompany?: string;
    activity?: string;
}

interface GroupedHistory {
    searchKey: string;
    searchCriteria: SearchCriteria;
    profiles: LinkedInProfileHistory[];
    viewedAt: Date;
    count: number;
}

export class ProfileHistoryService {
    /**
     * Get all viewed profile IDs for a user, sorted ascending for binary search
     * Returns sorted array of profile IDs
     */
    async getViewedProfileIds(userId: string): Promise<string[]> {
        const profiles = await db
            .select({ profileId: linkedInProfileHistory.profileId })
            .from(linkedInProfileHistory)
            .where(eq(linkedInProfileHistory.userId, userId))
            .orderBy(asc(linkedInProfileHistory.profileId));

        return profiles.map(p => p.profileId);
    }

    /**
     * Binary search to check if profile was already viewed
     * O(log n) complexity
     */
    hasViewedProfile(profileId: string, sortedProfileIds: string[]): boolean {
        let left = 0;
        let right = sortedProfileIds.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midValue = sortedProfileIds[mid];

            if (midValue === profileId) {
                return true; // Found
            }

            if (midValue < profileId) {
                left = mid + 1; // Search right half
            } else {
                right = mid - 1; // Search left half
            }
        }

        return false; // Not found
    }

    /**
     * Build search key from criteria for grouping
     * Example: "VP • SaaS • Mumbai"
     */
    private buildSearchKey(criteria: SearchCriteria): string {
        const parts: string[] = [];

        if (criteria.jobTitle) parts.push(criteria.jobTitle);
        if (criteria.industry) parts.push(criteria.industry);
        if (criteria.keywords) parts.push(criteria.keywords); // Location
        if (criteria.company) parts.push(criteria.company);

        return parts.join(' • ') || 'Unknown Search';
    }

    /**
     * Save a single profile to history
     */
    async saveProfile(
        userId: string,
        profile: ProfileResult,
        searchCriteria: SearchCriteria
    ): Promise<void> {
        const searchKey = this.buildSearchKey(searchCriteria);

        try {
            await db.insert(linkedInProfileHistory).values({
                userId,
                profileId: profile.id,
                profileUrl: profile.url,
                name: profile.name,
                headline: profile.headline || null,
                location: profile.location || null,
                avatar: profile.avatar || null,
                searchCriteria: searchCriteria as any, // JSONB
                searchKey,
            }).onConflictDoNothing(); // Ignore if already exists
        } catch (error) {
            console.error('[Profile History] Error saving profile:', error);
            // Don't throw - this is non-critical
        }
    }

    /**
     * Batch save multiple profiles to history
     * More efficient than individual saves
     */
    async saveBatch(
        userId: string,
        profiles: ProfileResult[],
        searchCriteria: SearchCriteria
    ): Promise<void> {
        if (profiles.length === 0) return;

        const searchKey = this.buildSearchKey(searchCriteria);

        const values = profiles.map(profile => ({
            userId,
            profileId: profile.id,
            profileUrl: profile.url,
            name: profile.name,
            headline: profile.headline || null,
            location: profile.location || null,
            avatar: profile.avatar || null,
            searchCriteria: searchCriteria as any, // JSONB
            searchKey,
        }));

        try {
            await db.insert(linkedInProfileHistory)
                .values(values)
                .onConflictDoNothing(); // Skip duplicates

            console.log(`[Profile History] Saved ${values.length} profiles to history (${searchKey})`);
        } catch (error) {
            console.error('[Profile History] Error batch saving profiles:', error);
            // Don't throw - this is non-critical
        }
    }

    /**
     * Get history grouped by search criteria with date filtering
     * Returns searches in descending order by latest viewed_at
     */
    async getHistoryGrouped(
        userId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<GroupedHistory[]> {
        let query = db
            .select()
            .from(linkedInProfileHistory)
            .where(eq(linkedInProfileHistory.userId, userId));

        // Apply date filters
        if (startDate) {
            query = query.where(gte(linkedInProfileHistory.viewedAt, startDate));
        }
        if (endDate) {
            query = query.where(lte(linkedInProfileHistory.viewedAt, endDate));
        }

        const profiles = await query.orderBy(desc(linkedInProfileHistory.viewedAt));

        // Group by search key
        const grouped = new Map<string, GroupedHistory>();

        for (const profile of profiles) {
            const key = profile.searchKey;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    searchKey: key,
                    searchCriteria: profile.searchCriteria as SearchCriteria,
                    profiles: [],
                    viewedAt: profile.viewedAt,
                    count: 0,
                });
            }

            const group = grouped.get(key)!;
            group.profiles.push(profile);
            group.count++;

            // Keep the latest viewedAt for the group
            if (profile.viewedAt > group.viewedAt) {
                group.viewedAt = profile.viewedAt;
            }
        }

        // Convert to array and sort by viewedAt descending
        return Array.from(grouped.values())
            .sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime());
    }

    /**
     * Get statistics about profile history
     */
    async getStats(userId: string): Promise<{
        total: number;
        uniqueSearches: number;
        lastViewed?: Date;
    }> {
        const stats = await db
            .select({
                total: sql<number>`count(*)`,
                uniqueSearches: sql<number>`count(distinct search_key)`,
                lastViewed: sql<Date>`max(viewed_at)`,
            })
            .from(linkedInProfileHistory)
            .where(eq(linkedInProfileHistory.userId, userId));

        return {
            total: Number(stats[0].total) || 0,
            uniqueSearches: Number(stats[0].uniqueSearches) || 0,
            lastViewed: stats[0].lastViewed || undefined,
        };
    }

    /**
     * Delete old history entries (optional cleanup)
     */
    async deleteOlderThan(userId: string, days: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await db
            .delete(linkedInProfileHistory)
            .where(
                and(
                    eq(linkedInProfileHistory.userId, userId),
                    lte(linkedInProfileHistory.viewedAt, cutoffDate)
                )
            );

        return result.rowCount || 0;
    }
}

// Export singleton instance
export const profileHistoryService = new ProfileHistoryService();
