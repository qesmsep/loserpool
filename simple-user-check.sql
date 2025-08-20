-- Simple user check
-- Let's see what users exist and why admin page might not show all

-- Check all users in the database
SELECT 
    'All users in database' as status,
    id,
    email,
    username,
    first_name,
    last_name,
    is_admin,
    user_type,
    created_at
FROM users 
ORDER BY created_at DESC;

-- Check auth users
SELECT 
    'Auth users' as status,
    id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at DESC;

-- Check if any auth users are missing profiles
SELECT 
    'Auth users without profiles' as status,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- Check RLS policies for users table
SELECT 
    'RLS policies' as status,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'users';

-- Count total users
SELECT 
    'Total users count' as status,
    COUNT(*) as count
FROM users;
