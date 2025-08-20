-- Test different user_type values to find what's allowed
-- This will help us identify the correct values for the constraint

-- First, let's see the constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname = 'users_user_type_check';

-- Test different user_type values
-- We'll try various combinations to see what works

-- Test 1: Try without user_type (let it use default)
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result RECORD;
BEGIN
    INSERT INTO users (id, email, is_admin, created_at, updated_at)
    VALUES (test_id, 'test1@example.com', false, NOW(), NOW())
    RETURNING * INTO result;
    
    RAISE NOTICE 'Test 1 (no user_type): SUCCESS - user_type = %', result.user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test 1 (no user_type): FAILED - %', SQLERRM;
END $$;

-- Test 2: Try 'pending'
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result RECORD;
BEGIN
    INSERT INTO users (id, email, user_type, is_admin, created_at, updated_at)
    VALUES (test_id, 'test2@example.com', 'pending', false, NOW(), NOW())
    RETURNING * INTO result;
    
    RAISE NOTICE 'Test 2 (pending): SUCCESS - user_type = %', result.user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test 2 (pending): FAILED - %', SQLERRM;
END $$;

-- Test 3: Try 'active'
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result RECORD;
BEGIN
    INSERT INTO users (id, email, user_type, is_admin, created_at, updated_at)
    VALUES (test_id, 'test3@example.com', 'active', false, NOW(), NOW())
    RETURNING * INTO result;
    
    RAISE NOTICE 'Test 3 (active): SUCCESS - user_type = %', result.user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test 3 (active): FAILED - %', SQLERRM;
END $$;

-- Test 4: Try 'tester'
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result RECORD;
BEGIN
    INSERT INTO users (id, email, user_type, is_admin, created_at, updated_at)
    VALUES (test_id, 'test4@example.com', 'tester', false, NOW(), NOW())
    RETURNING * INTO result;
    
    RAISE NOTICE 'Test 4 (tester): SUCCESS - user_type = %', result.user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test 4 (tester): FAILED - %', SQLERRM;
END $$;

-- Test 5: Try 'eliminated'
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result RECORD;
BEGIN
    INSERT INTO users (id, email, user_type, is_admin, created_at, updated_at)
    VALUES (test_id, 'test5@example.com', 'eliminated', false, NOW(), NOW())
    RETURNING * INTO result;
    
    RAISE NOTICE 'Test 5 (eliminated): SUCCESS - user_type = %', result.user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test 5 (eliminated): FAILED - %', SQLERRM;
END $$;

-- Test 6: Try NULL
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result RECORD;
BEGIN
    INSERT INTO users (id, email, user_type, is_admin, created_at, updated_at)
    VALUES (test_id, 'test6@example.com', NULL, false, NOW(), NOW())
    RETURNING * INTO result;
    
    RAISE NOTICE 'Test 6 (NULL): SUCCESS - user_type = %', result.user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test 6 (NULL): FAILED - %', SQLERRM;
END $$;

-- Show what values currently exist in the database
SELECT DISTINCT user_type, COUNT(*) as count
FROM users 
WHERE user_type IS NOT NULL
GROUP BY user_type
ORDER BY user_type;
