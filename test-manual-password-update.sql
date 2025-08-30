-- Test Manual Password Update
-- Run this in Supabase SQL Editor

-- First, let's check the current state
SELECT 'Current user state:' as status, id, email, email_confirmed_at, last_sign_in_at
FROM auth.users 
WHERE email = 'tim@828.life';

-- Try to manually update the password using admin functions
-- This simulates what our admin API does
DO $$
DECLARE
  user_id uuid;
  update_result jsonb;
BEGIN
  -- Get the user ID
  SELECT id INTO user_id FROM auth.users WHERE email = 'tim@828.life';
  
  IF user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user: %', user_id;
    
    -- Try to update the password (this is what the admin API does)
    -- Note: This is a simulation - actual password update requires the admin API
    RAISE NOTICE 'User exists and can be updated via admin API';
  ELSE
    RAISE NOTICE 'User not found in auth.users';
  END IF;
END $$;

-- Check if there are any constraints or issues
SELECT 'Database constraints:' as status,
       constraint_name,
       constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
AND table_schema = 'auth';

-- Check if the user has any special flags or settings
SELECT 'User flags:' as status,
       CASE WHEN email_confirmed_at IS NOT NULL THEN 'EMAIL_CONFIRMED' ELSE 'EMAIL_NOT_CONFIRMED' END as email_status,
       CASE WHEN last_sign_in_at IS NOT NULL THEN 'HAS_SIGNED_IN' ELSE 'NEVER_SIGNED_IN' END as sign_in_status,
       CASE WHEN banned_until IS NOT NULL THEN 'BANNED' ELSE 'NOT_BANNED' END as ban_status
FROM auth.users 
WHERE email = 'tim@828.life';
