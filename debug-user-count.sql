-- Debug User Count Issue
-- Run this in Supabase SQL Editor to see what's happening with user counts

-- 1. Check total count using different methods
SELECT 'Method 1 - COUNT(*):' as method, COUNT(*) as total_users FROM users;

SELECT 'Method 2 - COUNT(id):' as method, COUNT(id) as total_users FROM users;

-- 2. Show all users with their details
SELECT 'All users:' as status, id, email, username, user_type, is_admin, created_at
FROM users 
ORDER BY created_at DESC;

-- 3. Check if there are any auth users without profiles
SELECT 'Auth users without profiles:' as status, COUNT(*) as count
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- 4. Check if there are any user profiles without auth users
SELECT 'User profiles without auth users:' as status, COUNT(*) as count
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;

-- 5. Show the most recent auth users
SELECT 'Recent auth users:' as status, id, email, created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Check if RLS is affecting the count
SELECT 'RLS status:' as status, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- 7. Test a simple count query as the admin user would see it
SELECT 'Admin count test:' as status, COUNT(*) as total_users 
FROM users;
