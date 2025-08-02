-- Verify Users Script
-- Run this in Supabase SQL Editor to check if users exist

-- Check all users in the users table
SELECT 'Users in public.users:' as table_name, COUNT(*) as count FROM users;

-- Show all user details
SELECT id, email, username, is_admin, created_at 
FROM users 
ORDER BY created_at DESC;

-- Check auth users
SELECT 'Auth users:' as table_name, COUNT(*) as count FROM auth.users;

-- Show recent auth users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if your specific user exists
SELECT 'Your user exists:' as status, 
       CASE WHEN EXISTS (SELECT 1 FROM users WHERE id = '04777ec2-60f9-45db-ae99-5b0e3bbc111e') 
            THEN 'YES' 
            ELSE 'NO' 
       END as user_profile_exists,
       CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = '04777ec2-60f9-45db-ae99-5b0e3bbc111e') 
            THEN 'YES' 
            ELSE 'NO' 
       END as auth_user_exists; 