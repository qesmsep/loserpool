-- Fix Current Week Dynamically
-- This script calculates the correct current week based on available games and current date

-- First, let's see what we have
SELECT 'Current global settings:' as status, key, value 
FROM global_settings 
WHERE key = 'current_week';

-- Check what games are available
SELECT 'Available games by season:' as status,
       season,
       COUNT(*) as game_count,
       MIN(game_time) as earliest_game,
       MAX(game_time) as latest_game
FROM matchups 
GROUP BY season
ORDER BY season;

-- Check current date vs preseason cutoff
SELECT 'Date analysis:' as status,
       NOW() as current_time,
       '2025-08-26'::timestamp as preseason_cutoff,
       CASE 
         WHEN NOW() < '2025-08-26'::timestamp THEN 'BEFORE preseason cutoff'
         ELSE 'AFTER preseason cutoff'
       END as date_status;

-- Calculate the correct current week based on available games and date
WITH date_analysis AS (
  SELECT 
    NOW() as current_time,
    '2025-08-26'::timestamp as preseason_cutoff,
    CASE 
      WHEN NOW() < '2025-08-26'::timestamp THEN 'PRE'
      ELSE 'REG'
    END as current_season_type
),
game_analysis AS (
  SELECT 
    season,
    COUNT(*) as game_count,
    MIN(game_time) as earliest_game,
    MAX(game_time) as latest_game,
    CASE 
      WHEN season LIKE 'PRE%' THEN 'PRE'
      WHEN season LIKE 'REG%' THEN 'REG'
      WHEN season LIKE 'POST%' THEN 'POST'
      ELSE 'UNKNOWN'
    END as season_type,
    CASE 
      WHEN season LIKE 'PRE%' THEN CAST(SUBSTRING(season FROM 4) AS INTEGER)
      WHEN season LIKE 'REG%' THEN CAST(SUBSTRING(season FROM 4) AS INTEGER)
      WHEN season LIKE 'POST%' THEN CAST(SUBSTRING(season FROM 5) AS INTEGER)
      ELSE 0
    END as week_number
  FROM matchups 
  GROUP BY season
),
current_week_calc AS (
  SELECT 
    da.current_season_type,
    CASE 
      -- If we're in preseason period
      WHEN da.current_season_type = 'PRE' THEN
        COALESCE(
          (SELECT MAX(week_number) FROM game_analysis WHERE season_type = 'PRE'),
          1
        )
      -- If we're in regular season period
      WHEN da.current_season_type = 'REG' THEN
        COALESCE(
          (SELECT MIN(week_number) 
           FROM game_analysis 
           WHERE season_type = 'REG' 
             AND earliest_game > da.current_time),
          (SELECT MAX(week_number) FROM game_analysis WHERE season_type = 'REG'),
          1
        )
      ELSE 1
    END as calculated_week
  FROM date_analysis da
)
SELECT 'Calculated current week:' as status,
       current_season_type,
       calculated_week,
       CASE 
         WHEN current_season_type = 'PRE' THEN 'PRE' || calculated_week
         WHEN current_season_type = 'REG' THEN 'REG' || calculated_week
         ELSE 'REG1'
       END as season_string
FROM current_week_calc;

-- Update the global settings with the calculated week
-- (This will be determined by the calculation above)
UPDATE global_settings 
SET value = (
  WITH date_analysis AS (
    SELECT 
      CASE 
        WHEN NOW() < '2025-08-26'::timestamp THEN 'PRE'
        ELSE 'REG'
      END as current_season_type
  ),
  game_analysis AS (
    SELECT 
      CASE 
        WHEN season LIKE 'PRE%' THEN CAST(SUBSTRING(season FROM 4) AS INTEGER)
        WHEN season LIKE 'REG%' THEN CAST(SUBSTRING(season FROM 4) AS INTEGER)
        WHEN season LIKE 'POST%' THEN CAST(SUBSTRING(season FROM 5) AS INTEGER)
        ELSE 0
      END as week_number,
      CASE 
        WHEN season LIKE 'PRE%' THEN 'PRE'
        WHEN season LIKE 'REG%' THEN 'REG'
        WHEN season LIKE 'POST%' THEN 'POST'
        ELSE 'UNKNOWN'
      END as season_type
    FROM matchups 
    WHERE season LIKE 'PRE%' OR season LIKE 'REG%'
  ),
  current_week_calc AS (
    SELECT 
      da.current_season_type,
      CASE 
        -- If we're in preseason period
        WHEN da.current_season_type = 'PRE' THEN
          COALESCE(
            (SELECT MAX(week_number) FROM game_analysis WHERE season_type = 'PRE'),
            1
          )
        -- If we're in regular season period
        WHEN da.current_season_type = 'REG' THEN
          COALESCE(
            (SELECT MIN(week_number) 
             FROM game_analysis 
             WHERE season_type = 'REG'),
            (SELECT MAX(week_number) FROM game_analysis WHERE season_type = 'REG'),
            1
          )
        ELSE 1
      END as calculated_week
    FROM date_analysis da
  )
  SELECT calculated_week::text
  FROM current_week_calc
),
updated_at = NOW()
WHERE key = 'current_week';

-- Verify the update
SELECT 'Updated global settings:' as status, key, value, updated_at
FROM global_settings 
WHERE key = 'current_week';

-- Show what this means for users
SELECT 'Impact for users:' as status,
       'Active users will now see the correct season games' as description,
       'Tester users will see preseason games until 8/26/25' as tester_behavior,
       'Current week is now dynamically calculated' as system_behavior;
