-- Deep dive check for conflicts and signup verification
-- Let's see what we've modified and what's currently working

-- 1. Check current trigger function
SELECT 
    'Current trigger function' as status,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user', 'handle_new_user_signup');

-- 2. Check which trigger is actually being called
SELECT 
    'Active triggers' as status,
    trigger_name,
    event_manipulation,
    action_statement,
    event_object_schema,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- 3. Check the users table structure
SELECT 
    'Users table structure' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'users' 
ORDER BY ordinal_position;

-- 4. Check current user count and recent activity
SELECT 
    'Current users' as status,
    COUNT(*) as count
FROM public.users;

SELECT 
    'Recent auth users' as status,
    id,
    email,
    created_at,
    raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check if any auth users are missing profiles
SELECT 
    'Auth users without profiles' as status,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- 6. Test the current trigger function
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'deep-dive-test-' || extract(epoch from now()) || '@example.com';
    test_user RECORD;
BEGIN
    RAISE NOTICE 'Testing current trigger function';
    RAISE NOTICE 'ID: %, Email: %', test_id, test_email;
    
    -- Create a test auth user to trigger the function
    test_user.id := test_id;
    test_user.email := test_email;
    test_user.raw_user_meta_data := '{"first_name": "Test", "last_name": "User", "phone": "123-456-7890", "username": "testuser"}'::jsonb;
    
    -- Call the trigger function directly
    PERFORM handle_new_user_signup(test_user);
    
    RAISE NOTICE 'Trigger function called';
    
    -- Check if user was created
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id) THEN
        RAISE NOTICE '✅ SUCCESS: User profile created!';
        
        -- Show the created user
        SELECT * INTO test_user FROM users WHERE id = test_id;
        RAISE NOTICE 'User details: ID=%, email=%, user_type=%, is_admin=%', 
            test_user.id, test_user.email, test_user.user_type, test_user.is_admin;
    ELSE
        RAISE NOTICE '❌ FAILURE: User profile was NOT created';
    END IF;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- 7. Check RLS policies
SELECT 
    'RLS policies' as status,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'users';
