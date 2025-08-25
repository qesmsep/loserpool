-- Check current week and matchup data
-- Run this in Supabase SQL editor

-- 1. Check current week setting
SELECT 'Current Week Setting' as check_type, key, value 
FROM global_settings 
WHERE key = 'current_week';

-- 2. Check if the specific matchups exist and their week
SELECT 'Specific Matchups Check' as check_type,
       id,
       week,
       away_team,
       home_team,
       game_time
FROM matchups 
WHERE id IN (
  '068538df-bc68-40b7-9e9a-e78047359eb4',
  '5bc7de5f-c93e-4a23-9fba-dc00dad1ba9a',
  'e966135a-ecb6-4ea2-bc11-97bf53408288'
);

-- 3. Check user's picks and their team matchup IDs
SELECT 'User Picks Details' as check_type,
       pick_name,
       reg1_team_matchup_id,
       status,
       picks_count,
       created_at
FROM picks 
WHERE user_id = '2ab14ff0-f8be-49ec-b556-01a589111e81'
ORDER BY pick_name;

-- 4. Test the week column calculation for week 1
-- Week 1 should use reg1_team_matchup_id (since 1 <= 3 is false, and 1 <= 20 is true, so reg(1-3)_team_matchup_id = reg1_team_matchup_id)
SELECT 'Week Column Test' as check_type,
       'Week 1' as week,
       'reg1_team_matchup_id' as calculated_column,
       'This should match the picks data' as note;
