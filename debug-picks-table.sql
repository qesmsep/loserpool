-- Debug script to check picks table structure and data
-- Run this in Supabase SQL Editor

-- Check if pick_name column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
ORDER BY ordinal_position;

-- Check all picks in the table
SELECT 
  id,
  user_id,
  matchup_id,
  team_picked,
  picks_count,
  status,
  pick_name,
  week,
  created_at,
  updated_at
FROM picks
ORDER BY created_at DESC
LIMIT 20;

-- Check picks for a specific user (replace with actual user_id)
-- SELECT 
--   id,
--   user_id,
--   matchup_id,
--   team_picked,
--   picks_count,
--   status,
--   pick_name,
--   week,
--   created_at
-- FROM picks
-- WHERE user_id = 'your-user-id-here'
-- ORDER BY created_at DESC;

-- Check if there are any picks without pick_name
SELECT COUNT(*) as picks_without_name
FROM picks 
WHERE pick_name IS NULL OR pick_name = '';

-- Check status distribution
SELECT status, COUNT(*) as count
FROM picks
GROUP BY status
ORDER BY status;
