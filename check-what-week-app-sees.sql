-- Check what week the app is currently detecting
-- This shows what matchups exist and what the app will query for

-- 1. Check all matchups by season to see what's available
SELECT 
  season,
  week,
  COUNT(*) as game_count,
  MIN(game_time) as earliest_game,
  MAX(game_time) as latest_game,
  COUNT(CASE WHEN status != 'final' THEN 1 END) as non_final_count
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

-- 2. Check what the app will query for (current week detection logic)
-- The app looks for the earliest week with non-final games
SELECT 
  season,
  week,
  COUNT(*) as total_games,
  COUNT(CASE WHEN status != 'final' THEN 1 END) as non_final_games,
  MIN(game_time) as earliest_game
FROM matchups
WHERE status != 'final'
GROUP BY season, week
ORDER BY 
  CASE 
    WHEN season LIKE 'PRE%' THEN 1
    WHEN season LIKE 'REG%' THEN 2
    WHEN season LIKE 'POST%' THEN 3
    ELSE 4
  END,
  season,
  week
LIMIT 1;

-- 3. Show recent matchups (last 7 days)
SELECT 
  season,
  week,
  away_team,
  home_team,
  game_time,
  status
FROM matchups
WHERE game_time >= NOW() - INTERVAL '7 days'
ORDER BY game_time ASC;

-- 4. Check if we have playoff matchups
SELECT 
  season,
  week,
  COUNT(*) as count
FROM matchups
WHERE season LIKE 'POST%'
GROUP BY season, week
ORDER BY season, week;

