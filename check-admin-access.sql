-- Check admin access to users table
-- This will help us understand why the admin page only shows 1 user

-- First, let's see what users exist
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

-- Check current RLS policies
SELECT 
    'Current RLS policies' as status,
    policyname,
    cmd,
    permissive,
    roles,
    with_check,
    condition
FROM pg_policies 
WHERE tablename = 'users';

-- Test admin access using service role (bypasses RLS)
-- This simulates what the admin API should be able to see
DO $$
DECLARE
    user_record RECORD;
    admin_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Testing admin access to users table...';
    
    FOR user_record IN SELECT id, email, username, is_admin, user_type FROM users ORDER BY created_at DESC
    LOOP
        admin_count := admin_count + 1;
        RAISE NOTICE 'User %: % (%%) - Admin: % - Type: %', 
            admin_count, 
            user_record.email, 
            COALESCE(user_record.username, 'no username'), 
            user_record.is_admin, 
            user_record.user_type;
    END LOOP;
    
    RAISE NOTICE 'Total users accessible: %', admin_count;
END $$;

-- Check if there are any users with is_admin = true
SELECT 
    'Admin users' as status,
    id,
    email,
    username,
    is_admin,
    user_type
FROM users 
WHERE is_admin = true;
