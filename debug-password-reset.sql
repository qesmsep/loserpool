-- Debug Password Reset Issue
-- Run this in Supabase SQL Editor

-- Check if user exists in auth.users
SELECT 'Auth user check:' as status, id, email, email_confirmed_at, created_at, updated_at
FROM auth.users 
WHERE email = 'tim@828.life';

-- Check if user exists in public.users
SELECT 'Public user check:' as status, id, email, created_at, updated_at
FROM users 
WHERE email = 'tim@828.life';

-- Check user's auth status
SELECT 'User auth status:' as status,
       CASE 
         WHEN email_confirmed_at IS NOT NULL THEN 'EMAIL_CONFIRMED'
         ELSE 'EMAIL_NOT_CONFIRMED'
       END as email_status,
       CASE 
         WHEN last_sign_in_at IS NOT NULL THEN 'HAS_SIGNED_IN'
         ELSE 'NEVER_SIGNED_IN'
       END as sign_in_status
FROM auth.users 
WHERE email = 'tim@828.life';

-- Check if there are any auth issues
SELECT 'Auth issues check:' as status,
       CASE 
         WHEN email_confirmed_at IS NULL THEN 'EMAIL_NOT_CONFIRMED'
         WHEN last_sign_in_at IS NULL THEN 'NEVER_SIGNED_IN'
         ELSE 'NO_ISSUES'
       END as potential_issue
FROM auth.users 
WHERE email = 'tim@828.life';

-- Try to manually confirm the user's email
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'tim@828.life'
AND email_confirmed_at IS NULL;

-- Verify the update
SELECT 'After email confirmation:' as status, id, email, email_confirmed_at, updated_at
FROM auth.users 
WHERE email = 'tim@828.life';

-- Check if user profile exists and create if missing
INSERT INTO users (id, email, username, is_admin)
SELECT 
  au.id,
  au.email,
  NULL as username,
  FALSE as is_admin
FROM auth.users au
WHERE au.email = 'tim@828.life'
ON CONFLICT (id) DO NOTHING;

-- Final status check
SELECT 'Final status:' as status,
       CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'tim@828.life') 
            THEN 'EXISTS_IN_AUTH' 
            ELSE 'MISSING_FROM_AUTH' 
       END as auth_status,
       CASE WHEN EXISTS (SELECT 1 FROM users WHERE email = 'tim@828.life') 
            THEN 'EXISTS_IN_USERS' 
            ELSE 'MISSING_FROM_USERS' 
       END as users_status;
