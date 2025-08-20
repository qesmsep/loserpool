-- Simple constraint test
-- Let's isolate the exact issue

-- First, let's see the exact constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'users_user_type_check';

-- Test inserting with different user_type values
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test-' || extract(epoch from now()) || '@example.com';
BEGIN
    RAISE NOTICE 'Testing user_type = registered';
    
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
    
    RAISE NOTICE 'SUCCESS: registered works!';
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR with registered: %', SQLERRM;
END $$;

-- Test with NULL user_type (should use default)
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test-null-' || extract(epoch from now()) || '@example.com';
BEGIN
    RAISE NOTICE 'Testing user_type = NULL (should use default)';
    
    INSERT INTO users (
        id,
        email,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        test_id,
        test_email,
        FALSE,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'SUCCESS: NULL (default) works!';
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR with NULL (default): %', SQLERRM;
END $$;

-- Test with empty string
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test-empty-' || extract(epoch from now()) || '@example.com';
BEGIN
    RAISE NOTICE 'Testing user_type = empty string';
    
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
        '',
        FALSE,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'SUCCESS: empty string works!';
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR with empty string: %', SQLERRM;
END $$;
