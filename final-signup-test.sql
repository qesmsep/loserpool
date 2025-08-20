-- Final signup test
-- Let's check if everything is working now

-- Check current state
SELECT 'Current users' as status, COUNT(*) as count FROM users;
SELECT 'Current auth users' as status, COUNT(*) as count FROM auth.users;
SELECT 'Auth users without profiles' as status, COUNT(*) as count 
FROM auth.users au LEFT JOIN users u ON au.id = u.id WHERE u.id IS NULL;

-- Test the trigger by simulating auth user creation
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'final-test-' || extract(epoch from now()) || '@example.com';
    test_user_type TEXT;
BEGIN
    RAISE NOTICE '=== FINAL SIGNUP TEST ===';
    RAISE NOTICE 'Test ID: %', test_id;
    RAISE NOTICE 'Test Email: %', test_email;
    
    -- Simulate auth user creation (this should trigger our function)
    INSERT INTO auth.users (id, email, created_at, updated_at, raw_user_meta_data)
    VALUES (test_id, test_email, NOW(), NOW(), '{}'::jsonb);
    
    RAISE NOTICE 'Auth user created successfully';
    
    -- Wait a moment for trigger to execute
    PERFORM pg_sleep(0.5);
    
    -- Check if profile was created
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id) THEN
        RAISE NOTICE '✅ SUCCESS: Profile created by trigger!';
        
        -- Show the created profile details
        SELECT user_type INTO test_user_type FROM users WHERE id = test_id;
        RAISE NOTICE 'User type: %', test_user_type;
        
        -- Show all profile fields
        SELECT * FROM users WHERE id = test_id;
        
    ELSE
        RAISE NOTICE '❌ FAILURE: Profile was NOT created by trigger';
    END IF;
    
    -- Clean up
    DELETE FROM auth.users WHERE id = test_id;
    DELETE FROM users WHERE id = test_id;
    RAISE NOTICE 'Test cleanup completed';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Final status check
SELECT 'Final user count' as status, COUNT(*) as count FROM users;
