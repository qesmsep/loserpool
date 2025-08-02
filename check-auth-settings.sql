-- Check Authentication Settings
-- Run this in Supabase SQL Editor

-- Check if email confirmation is required
-- Note: This is typically configured in the Supabase dashboard, not via SQL

-- Check recent auth users and their confirmation status
SELECT 'Recent auth users:' as status, 
       id, 
       email, 
       email_confirmed_at,
       created_at,
       CASE 
         WHEN email_confirmed_at IS NOT NULL THEN 'CONFIRMED'
         ELSE 'NOT CONFIRMED'
       END as confirmation_status
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if any users have confirmed emails
SELECT 'Email confirmation summary:' as status,
       COUNT(*) as total_users,
       COUNT(email_confirmed_at) as confirmed_users,
       COUNT(*) - COUNT(email_confirmed_at) as unconfirmed_users
FROM auth.users;

-- Show users that might need confirmation
SELECT 'Users needing confirmation:' as status, id, email, created_at
FROM auth.users 
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC; 