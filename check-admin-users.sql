-- Check Admin Users and Create Admin if Needed
-- Run this in Supabase SQL Editor

-- Check current users and their admin status
SELECT 'Current users:' as status, id, email, username, is_admin, created_at 
FROM users 
ORDER BY created_at DESC;

-- Check if there are any admin users
SELECT 'Admin users count:' as status, COUNT(*) as count 
FROM users 
WHERE is_admin = TRUE;

-- If no admin users exist, make the user with email 'tim@skylineandco.com' an admin
-- (Replace with your actual email)
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'tim@skylineandco.com' 
AND is_admin = FALSE;

-- Verify the admin update
SELECT 'User after admin update:' as status, id, email, username, is_admin, created_at 
FROM users 
WHERE email = 'tim@skylineandco.com';

-- Show final admin users
SELECT 'Final admin users:' as status, id, email, username, is_admin, created_at 
FROM users 
WHERE is_admin = TRUE;
