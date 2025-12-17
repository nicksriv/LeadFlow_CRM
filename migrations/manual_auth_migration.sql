-- Clean up existing linkedin_sessions with invalid user_id
UPDATE linkedin_sessions SET user_id = NULL WHERE user_id = 'default';

-- Add password_hash column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Make scraped_profiles.user_id nullable (will be populated later)
ALTER TABLE scraped_profiles ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE;

-- Update linkedin_sessions to add user_id foreign key (nullable for backwards compat)
ALTER TABLE linkedin_sessions DROP CONSTRAINT IF EXISTS linkedin_sessions_user_id_users_id_fk;
ALTER TABLE linkedin_sessions ADD CONSTRAINT linkedin_sessions_user_id_users_id_fk 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
