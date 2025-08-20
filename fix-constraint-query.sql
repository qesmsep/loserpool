-- Fix the constraint query and check the correct function
-- The trigger is calling handle_new_user_signup(), not handle_new_user()

-- Check the handle_new_user_signup function (the one actually being called)
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_signup';

-- Check the constraint correctly
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'users_user_type_check';

-- Check the user_type column definition
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'user_type';

-- Test the handle_new_user_signup function directly
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test-' || extract(epoch from now()) || '@example.com';
    test_user RECORD;
BEGIN
    -- Create a test auth user record
    test_user.id := test_id;
    test_user.email := test_email;
    test_user.raw_user_meta_data := '{}'::jsonb;
    
    RAISE NOTICE 'Testing handle_new_user_signup with ID: % and email: %', test_user.id, test_user.email;
    
    -- Call the function directly
    PERFORM handle_new_user_signup(test_user);
    
    RAISE NOTICE 'Function call completed';
    
    -- Check if user was created
    IF EXISTS (SELECT 1 FROM users WHERE id = test_user.id) THEN
        RAISE NOTICE 'User profile created successfully!';
        
        -- Show the created user
        SELECT * INTO test_user FROM users WHERE id = test_user.id;
        RAISE NOTICE 'Created user: ID=%, email=%, user_type=%, is_admin=%', 
            test_user.id, test_user.email, test_user.user_type, test_user.is_admin;
    ELSE
        RAISE NOTICE 'User profile was NOT created';
    END IF;
    
    -- Clean up
    DELETE FROM users WHERE id = test_user.id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in function test: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;
