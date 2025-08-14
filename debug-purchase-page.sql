-- Debug script to check purchase page values
-- This will help identify why the plus/minus buttons might be disabled

-- Check global settings
SELECT 
  'Global Settings' as check_type,
  key,
  value
FROM global_settings 
WHERE key IN ('pick_price', 'max_total_entries', 'entries_per_user')
ORDER BY key;

-- Check total picks purchased
SELECT 
  'Total Picks Purchased' as check_type,
  COUNT(*) as total_purchases,
  SUM(picks_count) as total_picks
FROM purchases 
WHERE status = 'completed';

-- Check user picks (replace with actual user ID if needed)
SELECT 
  'User Picks' as check_type,
  user_id,
  COUNT(*) as total_purchases,
  SUM(picks_count) as total_picks
FROM purchases 
WHERE status = 'completed'
GROUP BY user_id
ORDER BY total_picks DESC
LIMIT 5;

-- Check if there are any users with max picks
SELECT 
  'Users with Max Picks' as check_type,
  user_id,
  SUM(picks_count) as total_picks
FROM purchases 
WHERE status = 'completed'
GROUP BY user_id
HAVING SUM(picks_count) >= 10  -- Assuming max is 10
ORDER BY total_picks DESC;

-- Check pool capacity
SELECT 
  'Pool Capacity Check' as check_type,
  (SELECT value FROM global_settings WHERE key = 'max_total_entries') as max_entries,
  (SELECT SUM(picks_count) FROM purchases WHERE status = 'completed') as total_purchased,
  (SELECT value FROM global_settings WHERE key = 'max_total_entries')::int - 
  (SELECT COALESCE(SUM(picks_count), 0) FROM purchases WHERE status = 'completed') as remaining_capacity;
