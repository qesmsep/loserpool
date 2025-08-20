-- Add User Type Field
-- Run this in Supabase SQL Editor

-- Add user_type column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'regular' 
CHECK (user_type IN ('tester', 'regular'));

-- Update existing users to be regular users (default)
UPDATE users 
SET user_type = 'regular' 
WHERE user_type IS NULL;

-- Make sure admins are also testers by default
UPDATE users 
SET user_type = 'tester' 
WHERE is_admin = TRUE;

-- Show the updated structure
SELECT 'Users with types:' as status, id, email, username, is_admin, user_type, created_at 
FROM users 
ORDER BY created_at DESC;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
