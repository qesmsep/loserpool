-- Test script to debug purchase flow issues
-- Run this to check the current state of the database

-- 1. Check if the user exists
SELECT 'User Check' as test, id, email, user_type FROM users WHERE email = 'tim@skylineandco.com';

-- 2. Check user's existing purchases
SELECT 'User Purchases' as test, id, user_id, stripe_session_id, amount_paid, picks_count, status, created_at 
FROM purchases 
WHERE user_id = (SELECT id FROM users WHERE email = 'tim@skylineandco.com')
ORDER BY created_at DESC;

-- 3. Check for any pending purchases
SELECT 'Pending Purchases' as test, id, user_id, stripe_session_id, amount_paid, picks_count, status, created_at 
FROM purchases 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 4. Check for any completed purchases
SELECT 'Completed Purchases' as test, id, user_id, stripe_session_id, amount_paid, picks_count, status, created_at 
FROM purchases 
WHERE status = 'completed'
ORDER BY created_at DESC;

-- 5. Check table structure
SELECT 'Table Structure' as test, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'purchases' 
ORDER BY ordinal_position;

-- 6. Check constraints
SELECT 'Constraints' as test, constraint_name, constraint_type, table_name
FROM information_schema.table_constraints 
WHERE table_name = 'purchases';

-- 7. Check for any recent purchase attempts (last 24 hours)
SELECT 'Recent Purchases' as test, id, user_id, stripe_session_id, amount_paid, picks_count, status, created_at 
FROM purchases 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 8. Check global settings
SELECT 'Global Settings' as test, key, value FROM global_settings WHERE key IN ('pick_price', 'max_total_entries', 'entries_per_user');

-- 9. Check total picks purchased
SELECT 'Total Picks Purchased' as test, 
       COUNT(*) as total_purchases,
       SUM(picks_count) as total_picks,
       SUM(amount_paid) as total_amount
FROM purchases 
WHERE status = 'completed';

-- 10. Check for any duplicate stripe_session_ids
SELECT 'Duplicate Session IDs' as test, stripe_session_id, COUNT(*) as count
FROM purchases 
WHERE stripe_session_id IS NOT NULL
GROUP BY stripe_session_id 
HAVING COUNT(*) > 1;
