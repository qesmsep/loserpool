-- Check Preseason Week 3 Games
-- Run this in Supabase SQL Editor

-- Check all preseason games by week
SELECT 'All preseason games:' as status,
       season,
       COUNT(*) as game_count,
       MIN(game_time) as earliest_game,
       MAX(game_time) as latest_game,
       MIN(EXTRACT(DATE FROM game_time)) as earliest_date,
       MAX(EXTRACT(DATE FROM game_time)) as latest_date
FROM matchups 
WHERE season LIKE 'PRE%'
GROUP BY season
ORDER BY season;

-- Check what PRE3 games exist
SELECT 'PRE3 games:' as status,
       id,
       home_team,
       away_team,
       game_time,
       venue,
       broadcast_network,
       status
FROM matchups 
WHERE season = 'PRE3'
ORDER BY game_time;

-- Check what the user should be seeing as a tester
SELECT 'User status check:' as status,
       u.id,
       u.email,
       u.user_type,
       u.is_admin,
       'Should see PRE3 games as tester' as expected_behavior;

-- Check current global settings
SELECT 'Global settings:' as status,
       key,
       value,
       updated_at
FROM global_settings 
WHERE key = 'current_week';

-- Check what season filter the user should get
SELECT 'Season detection test:' as status,
       CASE 
         WHEN NOW() < '2025-08-26'::date THEN 'PRE' 
         ELSE 'REG' 
       END as current_season,
       '3' as current_week,
       CASE 
         WHEN NOW() < '2025-08-26'::date THEN 'PRE3' 
         ELSE 'REG3' 
       END as expected_season_filter;
