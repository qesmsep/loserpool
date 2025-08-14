-- Test script for the new wide pick system
-- This demonstrates how picks are tracked through each week

-- First, let's see the new table structure
SELECT 
  'Table Structure' as test_type,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
AND column_name LIKE '%_team_matchup_id'
ORDER BY column_name;

-- Example: Let's say we have a pick that progresses through weeks
-- Week 1: Pick 1 is assigned to Cowboys @ Eagles (REG1)
-- Week 2: Pick 1 survives and is assigned to Cowboys @ Giants (REG2)  
-- Week 3: Pick 1 survives and is assigned to Eagles @ Cowboys (REG3)

-- This would result in a single pick record with:
-- reg1_team_matchup_id = md5(week1_matchup_id + 'Cowboys')
-- reg2_team_matchup_id = md5(week2_matchup_id + 'Cowboys')
-- reg3_team_matchup_id = md5(week3_matchup_id + 'Eagles')

-- Show how to query a pick's complete journey
SELECT 
  'Example Pick Journey' as description,
  'Pick 1' as pick_name,
  'REG1' as week,
  'Cowboys @ Eagles' as game,
  'Cowboys' as team_picked,
  'md5(week1_matchup_id + Cowboys)' as team_matchup_id
UNION ALL
SELECT 
  'Example Pick Journey',
  'Pick 1', 
  'REG2',
  'Cowboys @ Giants',
  'Cowboys',
  'md5(week2_matchup_id + Cowboys)'
UNION ALL
SELECT 
  'Example Pick Journey',
  'Pick 1',
  'REG3', 
  'Eagles @ Cowboys',
  'Eagles',
  'md5(week3_matchup_id + Eagles)';

-- Test the assign_pick_to_week function
-- (This would be called when a user allocates a pick to a specific week)
SELECT 
  'Function Test' as test_type,
  'assign_pick_to_week(pick_id, reg1_team_matchup_id, matchup_id, Cowboys)' as function_call,
  'Updates reg1_team_matchup_id column for the specified pick' as result;

-- Test the get_pick_wide_history function
-- (This would be called to get a pick's complete journey)
SELECT 
  'Function Test' as test_type,
  'get_pick_wide_history(pick_id)' as function_call,
  'Returns all week columns for the specified pick' as result;

-- Show how to query picks for a specific week
SELECT 
  'Query Example' as test_type,
  'SELECT * FROM picks WHERE reg1_team_matchup_id IS NOT NULL' as query,
  'Gets all picks assigned to REG1 week' as description;

-- Show how to query picks for a specific user across all weeks
SELECT 
  'Query Example' as test_type,
  'SELECT * FROM picks WHERE user_id = user_uuid' as query,
  'Gets all picks for a user with their week-by-week assignments' as description;

-- Benefits of this system:
-- 1. Each pick has a single record with all week assignments
-- 2. Easy to see which picks are assigned to which weeks
-- 3. Easy to query picks for specific weeks
-- 4. Easy to see a pick's complete journey
-- 5. No need for multiple records per pick
-- 6. Clear week-by-week tracking
