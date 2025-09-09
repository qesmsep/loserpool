-- Fix Current Week and Default Pick
-- This script updates the current week to 2 and checks the actual default pick

-- 1. Check current week setting
SELECT 'Current Week Setting' as check_type, key, value 
FROM global_settings 
WHERE key = 'current_week';

-- 2. Update current week to 2 (Regular Season Week 2)
UPDATE global_settings 
SET value = '2', updated_at = NOW()
WHERE key = 'current_week';

-- 3. Verify the update
SELECT 'Updated Week Setting' as check_type, key, value, updated_at
FROM global_settings 
WHERE key = 'current_week';

-- 4. Check all Week 2 matchups with their spreads
SELECT 'Week 2 Matchups' as check_type,
       id,
       week,
       away_team,
       home_team,
       away_spread,
       home_spread,
       game_time,
       status,
       CASE 
         WHEN away_spread < 0 THEN CONCAT(away_team, ' (favored by ', ABS(away_spread), ')')
         WHEN home_spread < 0 THEN CONCAT(home_team, ' (favored by ', ABS(home_spread), ')')
         ELSE 'No clear favorite'
       END as favored_team_info
FROM matchups 
WHERE week = 2
ORDER BY game_time;

-- 5. Find the matchup with the largest spread (most favored team)
WITH week2_matchups AS (
  SELECT *,
         GREATEST(ABS(COALESCE(away_spread, 0)), ABS(COALESCE(home_spread, 0))) as max_spread
  FROM matchups 
  WHERE week = 2
    AND status = 'scheduled'
    AND game_time > NOW()
)
SELECT 'Default Pick for Week 2' as check_type,
       id,
       week,
       away_team,
       home_team,
       away_spread,
       home_spread,
       max_spread,
       CASE 
         WHEN away_spread < 0 THEN away_team
         WHEN home_spread < 0 THEN home_team
         ELSE 'No clear favorite'
       END as default_pick_team,
       CASE 
         WHEN away_spread < 0 THEN ABS(away_spread)
         WHEN home_spread < 0 THEN ABS(home_spread)
         ELSE 0
       END as spread_magnitude,
       game_time
FROM week2_matchups
WHERE max_spread = (SELECT MAX(max_spread) FROM week2_matchups)
ORDER BY game_time
LIMIT 1;

-- 6. Check if Cleveland Browns are favored in any Week 2 matchup
SELECT 'Cleveland Browns Week 2 Status' as check_type,
       id,
       week,
       away_team,
       home_team,
       away_spread,
       home_spread,
       CASE 
         WHEN away_team = 'Cleveland Browns' AND away_spread < 0 THEN 'Cleveland Browns are favored (away)'
         WHEN home_team = 'Cleveland Browns' AND home_spread < 0 THEN 'Cleveland Browns are favored (home)'
         WHEN away_team = 'Cleveland Browns' AND away_spread > 0 THEN 'Cleveland Browns are underdogs (away)'
         WHEN home_team = 'Cleveland Browns' AND home_spread > 0 THEN 'Cleveland Browns are underdogs (home)'
         ELSE 'Cleveland Browns not in this matchup'
       END as cleveland_status
FROM matchups 
WHERE week = 2
  AND (away_team = 'Cleveland Browns' OR home_team = 'Cleveland Browns');
