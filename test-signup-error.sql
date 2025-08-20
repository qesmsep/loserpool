-- Test signup error
-- Let's see what's causing the 500 error

-- Check if there are any recent failed signups
SELECT 
    'Recent auth users' as status,
    id,
    email,
    created_at,
    raw_user_meta_data
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check if any recent auth users are missing profiles
SELECT 
    'Recent auth users without profiles' as status,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
AND au.created_at > NOW() - INTERVAL '1 hour'
ORDER BY au.created_at DESC;

-- Test the exact user insertion that the signup page does
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'signup-test-' || extract(epoch from now()) || '@example.com';
    test_user_type TEXT;
BEGIN
    RAISE NOTICE 'Testing exact signup user insertion';
    RAISE NOTICE 'ID: %, Email: %', test_id, test_email;
    
    -- This is the exact insert that the signup page does
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
    
    RAISE NOTICE '✅ SUCCESS: Manual user insertion worked!';
    
    -- Check what was inserted
    SELECT user_type INTO test_user_type FROM users WHERE id = test_id;
    RAISE NOTICE 'User type: %', test_user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR in manual insertion: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Check RLS policies again
SELECT 
    'RLS policies' as status,
    policyname,
    cmd,
    permissive,
    roles,
    with_check
FROM pg_policies 
WHERE tablename = 'users';
