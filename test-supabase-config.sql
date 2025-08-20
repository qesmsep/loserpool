-- Test Supabase configuration
-- Let's check what might be causing the signup to fail

-- Check if there are any recent errors or issues
SELECT 
    'Recent auth activity' as status,
    COUNT(*) as count
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check the current trigger function (should have debug logging)
SELECT 
    'Current trigger function' as status,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_signup';

-- Check if there are any constraints that might be causing issues
SELECT 
    'Table constraints' as status,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass;

-- Check the users table structure
SELECT 
    'Users table structure' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('id', 'email', 'user_type', 'is_admin', 'created_at', 'updated_at')
ORDER BY ordinal_position;

-- Test a simple user insertion to make sure everything works
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'config-test-' || extract(epoch from now()) || '@example.com';
BEGIN
    RAISE NOTICE 'Testing basic user insertion';
    RAISE NOTICE 'ID: %, Email: %', test_id, test_email;
    
    -- Test basic insertion
    INSERT INTO users (id, email, user_type, is_admin, created_at, updated_at)
    VALUES (test_id, test_email, 'registered', FALSE, NOW(), NOW());
    
    RAISE NOTICE '✅ SUCCESS: Basic insertion worked!';
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;
