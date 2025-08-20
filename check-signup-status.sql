-- Check signup status
-- Let's see if our fixes are working

-- Check current counts
SELECT 'Current users' as status, COUNT(*) as count FROM users;
SELECT 'Current auth users' as status, COUNT(*) as count FROM auth.users;

-- Check if any auth users are missing profiles
SELECT 'Auth users without profiles' as status, COUNT(*) as count 
FROM auth.users au 
LEFT JOIN users u ON au.id = u.id 
WHERE u.id IS NULL;

-- Show recent users from public.users table
SELECT 'Recent users (public.users)' as status, id, email, user_type, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Show the mapping between auth users and public users
SELECT 
    'User mapping' as status,
    au.id as auth_id,
    au.email as auth_email,
    au.created_at as auth_created,
    CASE WHEN u.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_profile,
    u.user_type,
    u.created_at as profile_created
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
ORDER BY au.created_at DESC
LIMIT 5;

-- Test the trigger one more time
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'status-test-' || extract(epoch from now()) || '@example.com';
    test_user_type TEXT;
BEGIN
    RAISE NOTICE 'Testing trigger with ID: % and email: %', test_id, test_email;
    
    -- Create auth user to trigger the function
    INSERT INTO auth.users (id, email, created_at, updated_at, raw_user_meta_data)
    VALUES (test_id, test_email, NOW(), NOW(), '{}'::jsonb);
    
    RAISE NOTICE 'Auth user created, checking trigger...';
    
    -- Check if profile was created
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id) THEN
        RAISE NOTICE '✅ SUCCESS: Profile created!';
        
        -- Show the created profile
        SELECT user_type INTO test_user_type FROM users WHERE id = test_id;
        RAISE NOTICE 'User type: %', test_user_type;
    ELSE
        RAISE NOTICE '❌ FAILURE: Profile not created';
    END IF;
    
    -- Clean up
    DELETE FROM auth.users WHERE id = test_id;
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
END $$;
