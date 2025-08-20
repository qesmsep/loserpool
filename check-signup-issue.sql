-- Check signup issue specifically
-- Let's see what's happening during signup

-- Check the current handle_new_user function
SELECT 
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Check if there are any triggers on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- Test inserting a user directly to see the exact error
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test-' || extract(epoch from now()) || '@example.com';
BEGIN
    RAISE NOTICE 'Testing user insertion with ID: % and email: %', test_id, test_email;
    
    -- Try to insert a user with minimal data
    INSERT INTO users (
        id,
        email,
        user_type,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        test_id,
        test_email,
        'registered',
        FALSE,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'User insertion successful!';
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting user: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;
