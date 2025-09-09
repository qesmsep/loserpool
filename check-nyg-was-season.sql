-- Check the season info for NYG vs WAS game
SELECT 
  'NYG vs WAS Season Info:' as info,
  id,
  week,
  season,
  away_team,
  home_team,
  status,
  game_time,
  updated_at,
  last_api_update
FROM matchups 
WHERE (away_team = 'NYG' AND home_team = 'WAS') 
   OR (away_team = 'WAS' AND home_team = 'NYG')
ORDER BY game_time;


