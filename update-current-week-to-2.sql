-- Update Current Week to Regular Season Week 2
-- Following the logic from the auto-advance-week cron job

-- 1. Check current setting
SELECT 'Current setting:' as status, key, value 
FROM global_settings 
WHERE key = 'current_week';

-- 2. Update to Week 2 (Regular Season Week 2)
UPDATE global_settings 
SET value = '2', updated_at = NOW()
WHERE key = 'current_week';

-- 3. Verify the change
SELECT 'Updated setting:' as status, key, value, updated_at
FROM global_settings 
WHERE key = 'current_week';

-- 4. Check Week 2 matchups and their spreads
SELECT 'Week 2 Matchups with Spreads' as check_type,
       id,
       week,
       away_team,
       home_team,
       away_spread,
       home_spread,
       game_time,
       status
FROM matchups 
WHERE week = 2
ORDER BY game_time;

-- 5. Find the matchup with the largest spread (most favored team) for Week 2
WITH week2_matchups AS (
  SELECT *,
         GREATEST(ABS(COALESCE(away_spread, 0)), ABS(COALESCE(home_spread, 0))) as max_spread
  FROM matchups 
  WHERE week = 2
    AND status = 'scheduled'
    AND game_time > NOW()
)
SELECT 'Largest Spread Matchup for Week 2' as check_type,
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
FROM week2_matchups
WHERE max_spread = (SELECT MAX(max_spread) FROM week2_matchups)
ORDER BY game_time
LIMIT 1;
