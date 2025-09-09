-- Debug Game Updates - Check which games are not updating properly
-- Run this in Supabase SQL Editor

-- Check all matchups and their current status
SELECT 
  'Current Matchups Status:' as info,
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
  CASE 
    WHEN status = 'final' AND winner IS NULL THEN 'FINAL BUT NO WINNER'
    WHEN status = 'final' AND winner IS NOT NULL THEN 'FINAL WITH WINNER'
    WHEN status = 'live' THEN 'LIVE GAME'
    WHEN status = 'scheduled' AND game_time < NOW() THEN 'SHOULD BE LIVE/FINAL'
    WHEN status = 'scheduled' AND game_time > NOW() THEN 'FUTURE GAME'
    ELSE 'UNKNOWN STATUS'
  END as status_analysis
FROM matchups 
ORDER BY week, game_time;

-- Check for games that should be final but aren't marked as such
SELECT 
  'Games that should be final but are not:' as issue,
  week,
  away_team,
  home_team,
  status,
  game_time,
  EXTRACT(EPOCH FROM (NOW() - game_time))/3600 as hours_since_game_time
FROM matchups 
WHERE game_time < NOW() - INTERVAL '3 hours' 
  AND status != 'final'
ORDER BY game_time;

-- Check for games with final status but no winner
SELECT 
  'Final games without winner:' as issue,
  week,
  away_team,
  home_team,
  status,
  away_score,
  home_score,
  winner,
  game_time
FROM matchups 
WHERE status = 'final' 
  AND winner IS NULL
ORDER BY game_time;

-- Check recent API updates
SELECT 
  'Recent API Updates:' as info,
  week,
  away_team,
  home_team,
  status,
  last_api_update,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - last_api_update))/60 as minutes_since_api_update
FROM matchups 
WHERE last_api_update IS NOT NULL
ORDER BY last_api_update DESC
LIMIT 10;

-- Check for games that haven't been updated recently
SELECT 
  'Games not updated recently:' as issue,
  week,
  away_team,
  home_team,
  status,
  updated_at,
  last_api_update,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update
FROM matchups 
WHERE updated_at < NOW() - INTERVAL '1 hour'
  AND game_time < NOW() + INTERVAL '1 hour' -- Only check games that should be happening soon or have happened
ORDER BY updated_at;


