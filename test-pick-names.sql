-- Test script to check if pick_names functionality is working
-- Run this in Supabase SQL Editor after running the migration

-- Check if pick_names table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'pick_names'
) as table_exists;

-- Check if pick_names table has any data
SELECT COUNT(*) as total_pick_names FROM pick_names;

-- Check if any users have pick names
SELECT 
  u.email,
  COUNT(pn.id) as pick_names_count
FROM users u
LEFT JOIN pick_names pn ON u.id = pn.user_id
GROUP BY u.id, u.email
HAVING COUNT(pn.id) > 0
ORDER BY pick_names_count DESC;

-- Check if picks table has pick_name_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks' 
AND column_name = 'pick_name_id';
