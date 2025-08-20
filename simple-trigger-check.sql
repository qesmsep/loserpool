-- Simple trigger check and debug
-- This will help us understand why signup is failing

-- Check if any triggers exist on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- Check if handle_new_user function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Check recent auth users
SELECT 
    id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if any user profiles exist
SELECT 
    COUNT(*) as total_users
FROM users;

-- Check recent user profiles
SELECT 
    id,
    email,
    user_type,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check for auth users without profiles
SELECT 
    COUNT(*) as auth_users_without_profiles
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;
