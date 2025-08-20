-- Test real signup simulation
-- Let's see if the trigger fires during actual auth user creation

-- First, let's check if there are any recent auth users
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if any of these auth users have corresponding profiles
SELECT 
    au.id,
    au.email,
    au.created_at,
    CASE WHEN u.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_profile,
    u.user_type
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
ORDER BY au.created_at DESC 
LIMIT 10;

-- Let's try to manually insert an auth user to see if the trigger fires
-- Note: This might not work due to Supabase auth restrictions, but worth trying
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'manual-auth-test-' || extract(epoch from now()) || '@example.com';
BEGIN
    RAISE NOTICE 'Attempting to manually insert auth user to test trigger';
    RAISE NOTICE 'ID: %, Email: %', test_id, test_email;
    
    -- Try to insert into auth.users (this might fail due to Supabase restrictions)
    INSERT INTO auth.users (id, email, created_at, updated_at)
    VALUES (test_id, test_email, NOW(), NOW());
    
    RAISE NOTICE 'SUCCESS: Auth user created manually!';
    
    -- Check if profile was created
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id) THEN
        RAISE NOTICE 'SUCCESS: Profile was created by trigger!';
    ELSE
        RAISE NOTICE 'FAILURE: Profile was NOT created by trigger';
    END IF;
    
    -- Clean up
    DELETE FROM auth.users WHERE id = test_id;
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: %', SQLERRM;
    RAISE NOTICE 'This is expected - Supabase restricts direct auth.users insertion';
END $$;

-- Check the trigger status again
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing,
    event_object_schema,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
