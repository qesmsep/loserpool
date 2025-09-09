-- Debug Current Default Pick State
-- Run this in Supabase SQL editor to check the actual current state

-- 1. Check current week setting
SELECT 'Current Week Setting' as check_type, key, value 
FROM global_settings 
WHERE key = 'current_week';

-- 2. Check all matchups for the current week with spreads
SELECT 'Current Week Matchups' as check_type,
       id,
       week,
       away_team,
       home_team,
       away_spread,
       home_spread,
       game_time,
       status
FROM matchups 
WHERE week = (SELECT value::int FROM global_settings WHERE key = 'current_week')
ORDER BY game_time;

-- 3. Find the matchup with the largest spread (most favored team)
WITH current_week_matchups AS (
  SELECT *,
         GREATEST(ABS(COALESCE(away_spread, 0)), ABS(COALESCE(home_spread, 0))) as max_spread
  FROM matchups 
  WHERE week = (SELECT value::int FROM global_settings WHERE key = 'current_week')
    AND status = 'scheduled'
    AND game_time > NOW()
)
SELECT 'Largest Spread Matchup' as check_type,
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
       END as favored_team,
       CASE 
         WHEN away_spread < 0 THEN ABS(away_spread)
         WHEN home_spread < 0 THEN ABS(home_spread)
         ELSE 0
       END as spread_magnitude
FROM current_week_matchups
WHERE max_spread = (SELECT MAX(max_spread) FROM current_week_matchups)
ORDER BY game_time
LIMIT 1;
