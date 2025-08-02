-- Test Signup Process
-- Run this in Supabase SQL Editor to check the signup process

-- Check if any auth users exist at all
SELECT 'Total auth users:' as status, COUNT(*) as count FROM auth.users;

-- Check if any user profiles exist
SELECT 'Total user profiles:' as status, COUNT(*) as count FROM users;

-- Show the most recent auth users (if any)
SELECT 'Recent auth users:' as status, id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 3;

-- Show the most recent user profiles (if any)
SELECT 'Recent user profiles:' as status, id, email, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 3;

-- Check if triggers are working
SELECT 'Triggers:' as status, trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%';

-- Check RLS status
SELECT 'RLS status:' as status, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users'; 