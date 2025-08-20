-- Test insertion directly
-- This will help us see if the issue is with the trigger or the table

-- Test direct insertion
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_user_type TEXT;
BEGIN
    RAISE NOTICE 'Testing direct insertion with user_type = registered';
    
    INSERT INTO users (id, email, user_type, is_admin, created_at, updated_at)
    VALUES (test_id, 'direct-test@example.com', 'registered', FALSE, NOW(), NOW());
    
    RAISE NOTICE 'SUCCESS: Direct insertion worked!';
    
    -- Check what was actually inserted
    SELECT user_type INTO test_user_type FROM users WHERE id = test_id;
    RAISE NOTICE 'User type in database: %', test_user_type;
    
    DELETE FROM users WHERE id = test_id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in direct insertion: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Now let's test the trigger function manually
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_user RECORD;
BEGIN
    RAISE NOTICE 'Testing trigger function manually';
    
    -- Create a test auth user record
    test_user.id := test_id;
    test_user.email := 'trigger-test@example.com';
    test_user.raw_user_meta_data := '{}'::jsonb;
    
    -- Call the trigger function directly
    PERFORM handle_new_user_signup(test_user);
    
    RAISE NOTICE 'Trigger function call completed';
    
    -- Check if user was created
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id) THEN
        RAISE NOTICE 'SUCCESS: User created by trigger!';
        DELETE FROM users WHERE id = test_id;
    ELSE
        RAISE NOTICE 'FAILURE: User not created by trigger';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in trigger test: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;
