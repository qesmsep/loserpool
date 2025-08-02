-- Check and Fix User Profile Creation
-- Run this in Supabase SQL Editor

-- First, let's see what auth users exist
SELECT 'Auth users found:' as status, COUNT(*) as count FROM auth.users;

-- Show the most recent auth users
SELECT 'Recent auth users:' as status, id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if any user profiles exist
SELECT 'User profiles found:' as status, COUNT(*) as count FROM users;

-- Show recent user profiles
SELECT 'Recent user profiles:' as status, id, email, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if the trigger exists and is working
SELECT 'Trigger status:' as status, trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Now let's manually create user profiles for any auth users that don't have profiles
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
SELECT 'Profiles created:' as status, COUNT(*) as count 
FROM users 
WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Show all users now
SELECT 'All users after fix:' as status, id, email, username, is_admin, created_at 
FROM users 
ORDER BY created_at DESC;

-- Make the most recent user admin (replace with your email)
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'your-email@example.com' 
AND id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1); 