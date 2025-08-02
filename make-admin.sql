-- Make User Admin and Check State
-- Run this in Supabase SQL Editor

-- Show current users
SELECT 'Current users:' as status, id, email, username, is_admin, created_at 
FROM users 
ORDER BY created_at DESC;

-- Make the existing user admin
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'tim@828.life';

-- Verify the update
SELECT 'User after admin update:' as status, id, email, username, is_admin, created_at 
FROM users 
WHERE email = 'tim@828.life';

-- Show recent auth users
SELECT 'Recent auth users:' as status, id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if the new auth user has a profile
SELECT 'New auth user profile:' as status, 
       CASE WHEN EXISTS (SELECT 1 FROM users WHERE id = '3ce251c7-1289-4fc9-adca-2e845ab78914') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as profile_status; 