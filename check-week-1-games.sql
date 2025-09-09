-- Check all Week 1 games in the database
SELECT 
  'Week 1 Games:' as info,
  id,
  week,
  away_team,
  home_team,
  status,
  away_score,
  home_score,
  winner,
  game_time,
  updated_at,
  last_api_update
FROM matchups 
WHERE week = 1
ORDER BY game_time;


