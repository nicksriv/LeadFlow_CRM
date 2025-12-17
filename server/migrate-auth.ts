import { pool } from './db';

const migrationSQL = `
-- Clean up existing linkedin_sessions with invalid user_id first
UPDATE linkedin_sessions SET user_id = NULL WHERE user_id = 'default';

-- Add password_hash to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add foreign key for sessions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sessions_user_id_users_id_fk'
  ) THEN
    ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_users_id_fk 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id to scraped_profiles (nullable for migration)
ALTER TABLE scraped_profiles ADD COLUMN IF NOT EXISTS user_id VARCHAR;
ALTER TABLE scraped_profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE scraped_profiles ADD COLUMN IF NOT EXISTS email_confidence INTEGER;
ALTER TABLE scraped_profiles ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE scraped_profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT ARRAY[]::text[];

-- Add foreign key for scraped_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'scraped_profiles_user_id_users_id_fk'
  ) THEN
    ALTER TABLE scraped_profiles ADD CONSTRAINT scraped_profiles_user_id_users_id_fk 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop old unique constraint on scraped_profiles.url
ALTER TABLE scraped_profiles DROP CONSTRAINT IF EXISTS scraped_profiles_url_unique;

-- Update linkedin_sessions user_id to be nullable and add foreign key
ALTER TABLE linkedin_sessions ALTER COLUMN user_id DROP DEFAULT;

-- Add foreign key for linkedin_sessions if not exists  
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'linkedin_sessions_user_id_users_id_fk'
  ) THEN
    ALTER TABLE linkedin_sessions ADD CONSTRAINT linkedin_sessions_user_id_users_id_fk 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
`;

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('[Migration] Starting auth migration...');
        await client.query(migrationSQL);
        console.log('[Migration] ✅ Auth migration completed successfully');
    } catch (error) {
        console.error('[Migration] ❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
