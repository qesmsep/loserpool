-- Final debug
-- Let's see what's happening with the signup

-- Check public.users table structure
SELECT 
    'public.users columns' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'users' 
ORDER BY ordinal_position;

-- Test user insertion with explicit schema
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'final-debug-' || extract(epoch from now()) || '@example.com';
BEGIN
    RAISE NOTICE 'Testing user insertion with explicit schema';
    RAISE NOTICE 'ID: %, Email: %', test_id, test_email;
    
    -- Test insertion with explicit schema
    INSERT INTO public.users (id, email, user_type, is_admin, created_at, updated_at)
    VALUES (test_id, test_email, 'registered', FALSE, NOW(), NOW());
    
    RAISE NOTICE '✅ SUCCESS: User insertion worked!';
    
    -- Clean up
    DELETE FROM public.users WHERE id = test_id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Check current user count
SELECT 'Current users' as status, COUNT(*) as count FROM public.users;
