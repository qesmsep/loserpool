-- Debug specific game: NY Giants vs Washington Commanders
-- Run this in Supabase SQL Editor

-- Check the specific game that's not updating
SELECT 
  'NY Giants vs Washington Commanders Game:' as info,
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
  quarter_info,
  broadcast_info,
  venue,
  weather_forecast,
  temperature,
  wind_speed,
  away_spread,
  home_spread,
  over_under,
  CASE 
    WHEN status = 'final' AND winner IS NULL THEN 'FINAL BUT NO WINNER - THIS IS THE PROBLEM'
    WHEN status = 'final' AND winner IS NOT NULL THEN 'FINAL WITH WINNER - OK'
    WHEN status = 'live' THEN 'LIVE GAME'
    WHEN status = 'scheduled' AND game_time < NOW() THEN 'SHOULD BE LIVE/FINAL'
    WHEN status = 'scheduled' AND game_time > NOW() THEN 'FUTURE GAME'
    ELSE 'UNKNOWN STATUS'
  END as status_analysis
FROM matchups 
WHERE (away_team = 'NYG' AND home_team = 'WAS') 
   OR (away_team = 'WAS' AND home_team = 'NYG')
ORDER BY game_time;

-- Check if there are any picks for this specific game
-- First, let's see what the picks table structure looks like
SELECT 
  'Picks table structure:' as info,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'picks' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Let's first see what columns actually exist in the picks table
-- Then we can check for picks related to the NYG vs WAS game
SELECT 
  'Sample picks data:' as info,
  p.id as pick_id,
  p.user_id,
  p.status as pick_status,
  p.picks_count,
  p.created_at,
  p.updated_at
FROM picks p
LIMIT 5;
