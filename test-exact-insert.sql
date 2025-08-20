-- Test exact insert structure based on existing data
-- This will help us identify what fields are required

-- First, let's see the exact structure of an existing user
SELECT 
    id, email, username, is_admin, invited_by, created_at, updated_at, 
    first_name, last_name, phone, needs_password_change, user_type, default_week
FROM users 
LIMIT 1;

-- Now try to insert with the exact same structure
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result RECORD;
BEGIN
    INSERT INTO users (
        id, email, username, is_admin, invited_by, created_at, updated_at,
        first_name, last_name, phone, needs_password_change, user_type, default_week
    ) VALUES (
        test_id, 
        'test-exact@example.com',
        'testuser',
        false,
        null,
        NOW(),
        NOW(),
        'Test',
        'User',
        null,
        false,
        'registered',
        1
    ) RETURNING * INTO result;
    
    RAISE NOTICE 'SUCCESS: Inserted user with ID %', result.id;
    RAISE NOTICE 'user_type = %', result.user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'FAILED: %', SQLERRM;
END $$;

-- Alternative: Try with minimal required fields only
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result RECORD;
BEGIN
    INSERT INTO users (
        id, email, user_type
    ) VALUES (
        test_id, 
        'test-minimal@example.com',
        'registered'
    ) RETURNING * INTO result;
    
    RAISE NOTICE 'SUCCESS (minimal): Inserted user with ID %', result.id;
    RAISE NOTICE 'user_type = %', result.user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'FAILED (minimal): %', SQLERRM;
END $$;
