-- Comprehensive Database Diagnostic for Signup Issue
-- Run this in Supabase SQL Editor to identify the problem

-- 1. Check if users table has all required columns
SELECT 'Users table columns:' as status, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check user_type constraint
SELECT 'User type constraint:' as status, conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname LIKE '%user_type%';

-- 3. Check if trigger exists and is working
SELECT 'Trigger status:' as status, trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 4. Check trigger function definition
SELECT 'Trigger function:' as status, routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- 5. Check recent auth users
SELECT 'Recent auth users:' as status, id, email, created_at, raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 3;

-- 6. Check recent user profiles
SELECT 'Recent user profiles:' as status, id, email, user_type, is_admin, created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 3;

-- 7. Test the trigger function manually (this won't create a real user)
DO $$
DECLARE
  test_meta jsonb;
  test_result boolean;
BEGIN
  test_meta := '{"phone": "1234567890", "first_name": "Test", "last_name": "User", "username": "testuser"}'::jsonb;
  
  -- Test if the function can be called (this is just a syntax check)
  SELECT handle_new_user() IS NOT NULL INTO test_result;
  
  RAISE NOTICE 'Trigger function test: %', CASE WHEN test_result THEN 'PASSED' ELSE 'FAILED' END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Trigger function test FAILED: %', SQLERRM;
END $$;

-- 8. Check for any missing columns that might cause insertion failures
SELECT 'Missing columns check:' as status,
       CASE 
         WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_type') 
         THEN 'user_type column missing'
         WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'default_week') 
         THEN 'default_week column missing'
         WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') 
         THEN 'phone column missing'
         WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') 
         THEN 'first_name column missing'
         WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') 
         THEN 'last_name column missing'
         ELSE 'All required columns exist'
       END as result;
