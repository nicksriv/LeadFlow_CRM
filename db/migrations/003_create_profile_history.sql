-- Migration: Create LinkedIn Profile History table
-- Purpose: Track all viewed profiles with search criteria for deduplication and history tracking

CREATE TABLE IF NOT EXISTS linkedin_profile_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,              -- LinkedIn profile ID (e.g., "john-doe-123")
    profile_url TEXT NOT NULL,
    name TEXT NOT NULL,
    headline TEXT,
    location TEXT,
    avatar TEXT,
    search_criteria TEXT NOT NULL,        -- JSON string: {"jobTitle":"VP","industry":"SaaS","location":"Mumbai"}
    search_key TEXT NOT NULL,             -- Human-readable: "VP • SaaS • Mumbai" for grouping
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one profile per user (no duplicates)
    UNIQUE(user_id, profile_id),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fast binary search lookups
CREATE INDEX IF NOT EXISTS idx_profile_history_user_profile 
ON linkedin_profile_history(user_id, profile_id);

-- Index for date range filtering
CREATE INDEX IF NOT EXISTS idx_profile_history_viewed_at 
ON linkedin_profile_history(user_id, viewed_at DESC);

-- Index for grouping by search criteria
CREATE INDEX IF NOT EXISTS idx_profile_history_search 
ON linkedin_profile_history(user_id, search_key, viewed_at DESC);

-- Index for sorted profile IDs (for binary search)
CREATE INDEX IF NOT EXISTS idx_profile_history_sorted_ids
ON linkedin_profile_history(user_id, profile_id ASC);
