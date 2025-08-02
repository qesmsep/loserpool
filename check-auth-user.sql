-- Check auth user details
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'tim@828.life';

-- Check if user exists in auth.users
SELECT 
  COUNT(*) as auth_user_count,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_count
FROM auth.users 
WHERE email = 'tim@828.life';

-- Check public.users table
SELECT * FROM public.users WHERE email = 'tim@828.life'; 