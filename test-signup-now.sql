-- Test if signup is working now
-- Let's check the current state and try a signup

-- Check current user count
SELECT 
    'Current user count' as status,
    COUNT(*) as count 
FROM users;

-- Check recent auth users
SELECT 
    'Recent auth users' as status,
    COUNT(*) as count 
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check if any auth users are missing profiles
SELECT 
    'Auth users without profiles' as status,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- Check the current trigger function (should have debug logging)
SELECT 
    'Current trigger function' as status,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_signup';

-- Now let's try a signup test
-- This will help us see if the trigger fires during actual signup
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'signup-test-' || extract(epoch from now()) || '@example.com';
    test_user_type TEXT;
BEGIN
    RAISE NOTICE 'Testing signup process...';
    RAISE NOTICE 'Test email: %', test_email;
    
    -- Simulate what happens during signup
    -- First, create an auth user (this is what Supabase does)
    INSERT INTO auth.users (id, email, created_at, updated_at, raw_user_meta_data)
    VALUES (test_id, test_email, NOW(), NOW(), '{}'::jsonb);
    
    RAISE NOTICE 'Auth user created, checking if trigger fired...';
    
    -- Wait a moment for trigger to execute
    PERFORM pg_sleep(1);
    
    -- Check if profile was created
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id) THEN
        RAISE NOTICE 'SUCCESS: Profile created by trigger!';
        
        -- Show the created profile
        SELECT user_type INTO test_user_type FROM users WHERE id = test_id;
        RAISE NOTICE 'User type: %', test_user_type;
    ELSE
        RAISE NOTICE 'FAILURE: Profile was NOT created by trigger';
    END IF;
    
    -- Clean up
    DELETE FROM auth.users WHERE id = test_id;
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: %', SQLERRM;
    RAISE NOTICE 'This might be expected due to Supabase restrictions';
END $$;
