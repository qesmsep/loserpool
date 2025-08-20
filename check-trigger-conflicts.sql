-- Check trigger conflicts
-- Let's see what we've created and what's actually working

-- Check all trigger functions we've created
SELECT 
    'All trigger functions' as status,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%user%'
OR routine_name LIKE '%signup%'
ORDER BY routine_name;

-- Check which trigger is actually being called
SELECT 
    'Active trigger' as status,
    trigger_name,
    event_manipulation,
    action_statement,
    event_object_schema,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- Check current user count
SELECT 
    'Current users' as status,
    COUNT(*) as count
FROM public.users;

-- Check recent auth users
SELECT 
    'Recent auth users' as status,
    id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 3;

-- Check if any auth users are missing profiles
SELECT 
    'Auth users without profiles' as status,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- Test the trigger function that's actually being called
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'trigger-test-' || extract(epoch from now()) || '@example.com';
    test_user_type TEXT;
BEGIN
    RAISE NOTICE 'Testing trigger function';
    RAISE NOTICE 'ID: %, Email: %', test_id, test_email;
    
    -- Create a test auth user to trigger the function
    INSERT INTO auth.users (id, email, created_at, updated_at, raw_user_meta_data)
    VALUES (test_id, test_email, NOW(), NOW(), '{"first_name": "Test", "last_name": "User"}'::jsonb);
    
    RAISE NOTICE 'Auth user created, checking trigger...';
    
    -- Check if user profile was created
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id) THEN
        RAISE NOTICE '✅ SUCCESS: User profile created by trigger!';
        
        -- Show the created user
        SELECT user_type INTO test_user_type FROM users WHERE id = test_id;
        RAISE NOTICE 'User type: %', test_user_type;
    ELSE
        RAISE NOTICE '❌ FAILURE: User profile was NOT created by trigger';
    END IF;
    
    -- Clean up
    DELETE FROM auth.users WHERE id = test_id;
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;
