-- Debug Trigger and Manual Fix
-- Run this in Supabase SQL Editor

-- Check if trigger exists
SELECT 'Trigger exists:' as status, trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if function exists
SELECT 'Function exists:' as status, routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Check recent auth users
SELECT 'Recent auth users:' as status, id, email, created_at, raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if any user profiles exist
SELECT 'User profiles:' as status, COUNT(*) as count FROM users;

-- Show recent user profiles
SELECT 'Recent user profiles:' as status, id, email, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Manual fix: Create user profiles for any auth users that don't have profiles
INSERT INTO users (id, email, username, is_admin)
SELECT 
  au.id,
  au.email,
  NULL as username,
  FALSE as is_admin
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Show how many profiles were created
SELECT 'Profiles created manually:' as status, COUNT(*) as count 
FROM users 
WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Show all users now
SELECT 'All users after fix:' as status, id, email, username, is_admin, created_at 
FROM users 
ORDER BY created_at DESC; 