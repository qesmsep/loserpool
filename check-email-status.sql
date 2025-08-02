-- Check Email Status
-- Run this in Supabase SQL Editor

-- Check recent users and their email confirmation status
SELECT 'Recent users email status:' as status,
       id,
       email,
       email_confirmed_at,
       created_at,
       CASE 
         WHEN email_confirmed_at IS NOT NULL THEN 'CONFIRMED'
         WHEN email_confirmed_at IS NULL THEN 'NOT CONFIRMED'
         ELSE 'UNKNOWN'
       END as confirmation_status
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Count confirmed vs unconfirmed users
SELECT 'Email confirmation summary:' as status,
       COUNT(*) as total_users,
       COUNT(email_confirmed_at) as confirmed_users,
       COUNT(*) - COUNT(email_confirmed_at) as unconfirmed_users,
       ROUND((COUNT(email_confirmed_at)::float / COUNT(*) * 100), 2) as confirmation_rate
FROM auth.users;

-- Show users that need confirmation
SELECT 'Users needing confirmation:' as status,
       id,
       email,
       created_at,
       EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_since_signup
FROM auth.users 
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- Check if any emails were sent (this might not be available in SQL)
-- You can check this in the Supabase Dashboard > Logs 