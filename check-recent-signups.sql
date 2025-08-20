-- Check recent signup activity
-- This will help us understand what's happening during signup

-- Check recent auth users (last 24 hours)
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check recent user profiles (last 24 hours)
SELECT 
    id,
    email,
    user_type,
    created_at
FROM users 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check if there are any auth users created in the last hour without profiles
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
AND au.created_at > NOW() - INTERVAL '1 hour'
ORDER BY au.created_at DESC;

-- Check the current user_type constraint
SELECT 
    constraint_name,
    constraint_definition
FROM information_schema.check_constraints
WHERE constraint_name = 'users_user_type_check';
