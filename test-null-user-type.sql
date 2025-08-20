-- Test to see what happens with null user_type
-- This will help us understand why user_type is being set to null

-- Check if there are any triggers on the users table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users';

-- Check if there are any functions that might be called during insert
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%users%' 
AND routine_definition LIKE '%INSERT%';

-- Test: Try to insert with explicit null user_type
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result RECORD;
BEGIN
    INSERT INTO users (
        id, email, user_type
    ) VALUES (
        test_id, 
        'test-null@example.com',
        NULL
    ) RETURNING * INTO result;
    
    RAISE NOTICE 'SUCCESS (null user_type): Inserted user with ID %', result.id;
    RAISE NOTICE 'user_type = %', result.user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'FAILED (null user_type): %', SQLERRM;
END $$;

-- Test: Try to insert without specifying user_type (should use default)
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result RECORD;
BEGIN
    INSERT INTO users (
        id, email
    ) VALUES (
        test_id, 
        'test-default@example.com'
    ) RETURNING * INTO result;
    
    RAISE NOTICE 'SUCCESS (default user_type): Inserted user with ID %', result.id;
    RAISE NOTICE 'user_type = %', result.user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'FAILED (default user_type): %', SQLERRM;
END $$;
