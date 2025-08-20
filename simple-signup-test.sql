-- Simple signup test
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

-- Check if any auth users are missing profiles
SELECT 
    'Auth users without profiles' as status,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
AND au.created_at > NOW() - INTERVAL '1 hour';

-- Test manual user insertion (the fallback in signup page)
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'simple-test-' || extract(epoch from now()) || '@example.com';
    test_user_type TEXT;
BEGIN
    RAISE NOTICE 'Testing manual user insertion (signup fallback)';
    RAISE NOTICE 'ID: %, Email: %', test_id, test_email;
    
    -- This is the exact insert from the signup page
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
