-- Check current matchups in the database
-- This script checks what matchups exist and what the current week detection thinks

-- First, check what matchups exist
SELECT 
  season,
  week,
  COUNT(*) as matchup_count,
  MIN(game_time) as earliest_game,
  MAX(game_time) as latest_game
FROM matchups
GROUP BY season, week
ORDER BY 
  CASE 
    WHEN season LIKE 'PRE%' THEN 1
    WHEN season LIKE 'REG%' THEN 2
    WHEN season LIKE 'POST%' THEN 3
    ELSE 4
  END,
  season,
  week;

-- Check the current week setting
SELECT key, value as current_week_value
FROM global_settings
WHERE key = 'current_week';

-- Check recent matchups (last 30 days)
SELECT 
  id,
  season,
  week,
  away_team,
  home_team,
  game_time,
  status,
  created_at
FROM matchups
WHERE game_time >= NOW() - INTERVAL '30 days'
ORDER BY game_time ASC
LIMIT 50;

