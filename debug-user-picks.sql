-- Debug script to check user picks issue
-- Run this in Supabase SQL editor

-- 1. Check current week setting
SELECT 'Current Week Setting' as check_type, key, value 
FROM global_settings 
WHERE key = 'current_week';

-- 2. Check if matchups exist for week 1
SELECT 'Week 1 Matchups' as check_type, COUNT(*) as count 
FROM matchups 
WHERE week = 1;

-- 3. Check specific matchup IDs from the picks
SELECT 'Specific Matchup Check' as check_type, 
       '068538df-bc68-40b7-9e9a-e78047359eb4' as matchup_id,
       EXISTS(SELECT 1 FROM matchups WHERE id = '068538df-bc68-40b7-9e9a-e78047359eb4') as exists;

SELECT 'Specific Matchup Check' as check_type, 
       '5bc7de5f-c93e-4a23-9fba-dc00dad1ba9a' as matchup_id,
       EXISTS(SELECT 1 FROM matchups WHERE id = '5bc7de5f-c93e-4a23-9fba-dc00dad1ba9a') as exists;

SELECT 'Specific Matchup Check' as check_type, 
       'e966135a-ecb6-4ea2-bc11-97bf53408288' as matchup_id,
       EXISTS(SELECT 1 FROM matchups WHERE id = 'e966135a-ecb6-4ea2-bc11-97bf53408288') as exists;

-- 4. Check user's picks for the specific user
SELECT 'User Picks' as check_type, 
       pick_name,
       reg1_team_matchup_id,
       status,
       picks_count
FROM picks 
WHERE user_id = '2ab14ff0-f8be-49ec-b556-01a589111e81'
ORDER BY pick_name;

-- 5. Check all matchups for week 1
SELECT 'Week 1 Matchup Details' as check_type,
       id,
       away_team,
       home_team,
       game_time,
       status
FROM matchups 
WHERE week = 1
ORDER BY game_time;

-- 6. Check if there are any matchups with UUID-style IDs
SELECT 'UUID Matchups Check' as check_type,
       COUNT(*) as count
FROM matchups 
WHERE id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 7. Show all matchups with UUID-style IDs
SELECT 'UUID Matchups' as check_type,
       id,
       week,
       away_team,
       home_team,
       game_time
FROM matchups 
WHERE id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ORDER BY week, game_time;
