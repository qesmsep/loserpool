-- Quick test to see what's happening
-- Let's test the exact scenario that's failing

-- Test 1: Insert with explicit 'registered'
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    RAISE NOTICE 'Test 1: Inserting with user_type = registered';
    
    INSERT INTO users (id, email, user_type, is_admin, created_at, updated_at)
    VALUES (test_id, 'test1@example.com', 'registered', FALSE, NOW(), NOW());
    
    RAISE NOTICE 'SUCCESS: registered works!';
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: %', SQLERRM;
END $$;

-- Test 2: Insert without user_type (should use default)
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    RAISE NOTICE 'Test 2: Inserting without user_type (should use default)';
    
    INSERT INTO users (id, email, is_admin, created_at, updated_at)
    VALUES (test_id, 'test2@example.com', FALSE, NOW(), NOW());
    
    RAISE NOTICE 'SUCCESS: default works!';
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: %', SQLERRM;
END $$;

-- Test 3: Check what the current handle_new_user_signup function does
SELECT 
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_signup';
