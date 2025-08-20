-- Debug signup process
-- Let's see what's happening

-- Check recent auth users
SELECT 
    'Recent auth users' as status,
    id,
    email,
    created_at
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Test manual user insertion
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'debug-test-' || extract(epoch from now()) || '@example.com';
    test_user_type TEXT;
BEGIN
    RAISE NOTICE 'Testing manual user insertion';
    RAISE NOTICE 'ID: %, Email: %', test_id, test_email;
    
    -- Test the exact insert from signup page
    INSERT INTO users (
        id,
        email,
        phone,
        first_name,
        last_name,
        username,
        is_admin,
        user_type,
        default_week,
        needs_password_change,
        created_at,
        updated_at
    ) VALUES (
        test_id,
        test_email,
        NULL,
        'Test',
        'User',
        'testuser',
        FALSE,
        'registered',
        1,
        FALSE,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ SUCCESS: Manual insertion worked!';
    
    -- Check what was inserted
    SELECT user_type INTO test_user_type FROM users WHERE id = test_id;
    RAISE NOTICE 'User type: %', test_user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Check if there are any recent signup attempts
SELECT 
    'Recent signup attempts' as status,
    COUNT(*) as count
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '30 minutes';
