-- Test the signup fix
-- Let's verify the UPSERT trigger is working

-- Test the trigger function directly
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test-signup-' || extract(epoch from now()) || '@example.com';
    test_user RECORD;
    test_user_type TEXT;
BEGIN
    RAISE NOTICE 'Testing signup fix with UPSERT trigger';
    RAISE NOTICE 'ID: %, Email: %', test_id, test_email;
    
    -- Create a test auth user
    test_user.id := test_id;
    test_user.email := test_email;
    test_user.raw_user_meta_data := '{}'::jsonb;
    
    -- Call the trigger function
    PERFORM handle_new_user_signup(test_user);
    
    RAISE NOTICE '✅ First insert successful';
    
    -- Check what was created
    SELECT user_type INTO test_user_type FROM users WHERE email = test_email;
    RAISE NOTICE 'User type: %', test_user_type;
    
    -- Try to insert the same email again (should update instead of error)
    test_user.id := gen_random_uuid();
    PERFORM handle_new_user_signup(test_user);
    
    RAISE NOTICE '✅ Second insert (same email) successful - no error!';
    
    -- Check the final state
    SELECT user_type INTO test_user_type FROM users WHERE email = test_email;
    RAISE NOTICE 'Final user type: %', test_user_type;
    
    -- Clean up
    DELETE FROM users WHERE email = test_email;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Check current user count
SELECT 'Current users' as status, COUNT(*) as count FROM users;
