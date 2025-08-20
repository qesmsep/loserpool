-- Try signup now
-- Let's see the current state and test the signup

-- Check current state
SELECT 'Current users' as status, COUNT(*) as count FROM users;
SELECT 'Current auth users' as status, COUNT(*) as count FROM auth.users;

-- Check if any auth users are missing profiles
SELECT 'Auth users without profiles' as status, COUNT(*) as count 
FROM auth.users au 
LEFT JOIN users u ON au.id = u.id 
WHERE u.id IS NULL;

-- Show recent users
SELECT 'Recent users' as status, id, email, user_type, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Show recent auth users
SELECT 'Recent auth users' as status, id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Test the trigger one more time
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'try-signup-' || extract(epoch from now()) || '@example.com';
BEGIN
    RAISE NOTICE 'Testing trigger with ID: % and email: %', test_id, test_email;
    
    -- Create auth user to trigger the function
    INSERT INTO auth.users (id, email, created_at, updated_at, raw_user_meta_data)
    VALUES (test_id, test_email, NOW(), NOW(), '{}'::jsonb);
    
    RAISE NOTICE 'Auth user created, checking trigger...';
    
    -- Check if profile was created
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id) THEN
        RAISE NOTICE '✅ SUCCESS: Profile created!';
    ELSE
        RAISE NOTICE '❌ FAILURE: Profile not created';
    END IF;
    
    -- Clean up
    DELETE FROM auth.users WHERE id = test_id;
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
END $$;
