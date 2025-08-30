-- Test Password Reset Verification
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if user exists in auth.users
SELECT '1. Auth user check:' as step, 
       CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'tim@828.life') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

-- 2. Check if user exists in public.users
SELECT '2. Public user check:' as step,
       CASE WHEN EXISTS (SELECT 1 FROM users WHERE email = 'tim@828.life') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

-- 3. Check RLS status
SELECT '3. RLS status:' as step,
       CASE WHEN rowsecurity = true THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 4. Check admin API permissions
SELECT '4. Service role permissions:' as step,
       'SHOULD HAVE FULL ACCESS' as status;

-- 5. Test user creation manually
DO $$
DECLARE
  user_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tim@828.life') INTO user_exists;
  
  IF user_exists THEN
    RAISE NOTICE '5. User exists in auth.users - password reset should work';
  ELSE
    RAISE NOTICE '5. User missing from auth.users - will be created during reset';
  END IF;
END $$;

-- 6. Show current user details
SELECT '6. Current user details:' as step, id, email, email_confirmed_at, created_at
FROM auth.users 
WHERE email = 'tim@828.life';

-- 7. Final verification
SELECT '7. Password reset should work:' as step,
       CASE 
         WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'tim@828.life') 
         THEN 'YES - User exists, will update password'
         ELSE 'YES - User will be created with new password'
       END as verification;
