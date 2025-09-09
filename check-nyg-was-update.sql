-- Check if the NYG vs WAS game was updated
SELECT 
  'NYG vs WAS Game Status:' as info,
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
  last_api_update,
  EXTRACT(EPOCH FROM (NOW() - last_api_update))/60 as minutes_since_update
FROM matchups 
WHERE (away_team = 'NYG' AND home_team = 'WAS') 
   OR (away_team = 'WAS' AND home_team = 'NYG')
ORDER BY game_time;
