-- Check schema issue
-- Let's see what's causing the mixed table results

-- Check only public.users table structure
SELECT 
    'public.users structure' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'users' 
ORDER BY ordinal_position;

-- Check only auth.users table structure
SELECT 
    'auth.users structure' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'auth'
AND table_name = 'users' 
ORDER BY ordinal_position;

-- Check if there are any schema conflicts
SELECT 
    'Schema check' as status,
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'users';

-- Test basic user insertion with explicit schema
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'schema-test-' || extract(epoch from now()) || '@example.com';
BEGIN
    RAISE NOTICE 'Testing user insertion with explicit schema';
    RAISE NOTICE 'ID: %, Email: %', test_id, test_email;
    
    -- Test insertion with explicit schema
    INSERT INTO public.users (id, email, user_type, is_admin, created_at, updated_at)
    VALUES (test_id, test_email, 'registered', FALSE, NOW(), NOW());
    
    RAISE NOTICE '✅ SUCCESS: Explicit schema insertion worked!';
    
    -- Clean up
    DELETE FROM public.users WHERE id = test_id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;
