-- Fix matchup weeks for picks that are showing as pending
-- Run this in Supabase SQL editor

-- 1. Check what matchups exist with the IDs from the picks
SELECT 'Matchups from Picks' as check_type,
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

-- 2. Update these matchups to week 1 if they exist but are not set to week 1
UPDATE matchups 
SET week = 1 
WHERE id IN (
  '068538df-bc68-40b7-9e9a-e78047359eb4',
  '5bc7de5f-c93e-4a23-9fba-dc00dad1ba9a',
  'e966135a-ecb6-4ea2-bc11-97bf53408288'
)
AND week != 1;

-- 3. Check if the matchups exist at all, if not create them
-- First, let's see what teams are being picked
SELECT 'Teams from Picks' as check_type,
       DISTINCT 
       CASE 
         WHEN reg1_team_matchup_id LIKE '%_CLE' THEN 'Cleveland Browns'
         WHEN reg1_team_matchup_id LIKE '%_DEN' THEN 'Denver Broncos'
         WHEN reg1_team_matchup_id LIKE '%_WAS' THEN 'Washington Commanders'
         ELSE 'Unknown'
       END as team_picked
FROM picks 
WHERE user_id = '2ab14ff0-f8be-49ec-b556-01a589111e81'
AND reg1_team_matchup_id IS NOT NULL;

-- 4. If matchups don't exist, we need to create them
-- This would require knowing the opponent teams and game times
-- For now, let's just check what we have
SELECT 'All Matchups Week 1' as check_type,
       COUNT(*) as count
FROM matchups 
WHERE week = 1;

-- 5. Show all matchups for week 1
SELECT 'Week 1 Matchups' as check_type,
       id,
       away_team,
       home_team,
       game_time,
       status
FROM matchups 
WHERE week = 1
ORDER BY game_time;
