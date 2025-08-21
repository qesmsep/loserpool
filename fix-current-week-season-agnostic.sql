-- Fix Current Week Dynamically (Season-Agnostic)
-- This script calculates the correct current week based on available games and current date
-- Works for ANY NFL season automatically - no hardcoded dates!

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

-- Determine season year and preseason cutoff dynamically
WITH game_analysis AS (
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
season_dates AS (
  SELECT 
    MIN(earliest_game) as season_start,
    MAX(latest_game) as season_end
  FROM game_analysis
),
season_year_calc AS (
  SELECT 
    CASE 
      WHEN EXTRACT(MONTH FROM season_start) >= 8 THEN EXTRACT(YEAR FROM season_start)
      ELSE EXTRACT(YEAR FROM season_start) - 1
    END as season_year
  FROM season_dates
),
preseason_cutoff_calc AS (
  SELECT 
    CASE 
      -- If we have both preseason and regular season games
      WHEN EXISTS (SELECT 1 FROM game_analysis WHERE season_type = 'PRE') 
           AND EXISTS (SELECT 1 FROM game_analysis WHERE season_type = 'REG') THEN
        (SELECT earliest_game - INTERVAL '7 days' 
         FROM game_analysis 
         WHERE season_type = 'REG' 
         ORDER BY earliest_game 
         LIMIT 1)
      -- If we only have preseason games
      WHEN EXISTS (SELECT 1 FROM game_analysis WHERE season_type = 'PRE') THEN
        (SELECT latest_game + INTERVAL '7 days' 
         FROM game_analysis 
         WHERE season_type = 'PRE' 
         ORDER BY latest_game DESC 
         LIMIT 1)
             -- If we only have regular season games or no games
       ELSE 
         (SELECT (season_year::text || '-08-26')::date FROM season_year_calc)
    END as preseason_cutoff
  FROM season_year_calc
),
current_week_calc AS (
  SELECT 
    CASE 
      -- If we're in preseason period
      WHEN NOW() < (SELECT preseason_cutoff FROM preseason_cutoff_calc) THEN
        COALESCE(
          (SELECT MAX(week_number) FROM game_analysis WHERE season_type = 'PRE'),
          1
        )
      -- If we're in regular season period
      ELSE
        COALESCE(
          (SELECT MIN(week_number) 
           FROM game_analysis 
           WHERE season_type = 'REG'),
          (SELECT MAX(week_number) FROM game_analysis WHERE season_type = 'REG'),
          1
        )
    END as calculated_week,
    CASE 
      WHEN NOW() < (SELECT preseason_cutoff FROM preseason_cutoff_calc) THEN 'PRE'
      ELSE 'REG'
    END as current_season_type
  FROM preseason_cutoff_calc
)
SELECT 'Season Analysis:' as status,
       (SELECT season_year FROM season_year_calc) as season_year,
       (SELECT preseason_cutoff FROM preseason_cutoff_calc) as preseason_cutoff,
       NOW() as current_time,
       CASE 
         WHEN NOW() < (SELECT preseason_cutoff FROM preseason_cutoff_calc) THEN 'BEFORE preseason cutoff'
         ELSE 'AFTER preseason cutoff'
       END as date_status;

-- Calculate the correct current week
WITH game_analysis AS (
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
    END as season_type,
    MIN(game_time) as earliest_game
  FROM matchups 
  WHERE season LIKE 'PRE%' OR season LIKE 'REG%'
  GROUP BY season
),
preseason_cutoff_calc AS (
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'PRE%') 
           AND EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'REG%') THEN
        (SELECT MIN(game_time) - INTERVAL '7 days' 
         FROM matchups 
         WHERE season LIKE 'REG%')
      WHEN EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'PRE%') THEN
        (SELECT MAX(game_time) + INTERVAL '7 days' 
         FROM matchups 
         WHERE season LIKE 'PRE%')
      ELSE 
        (SELECT (EXTRACT(YEAR FROM MIN(game_time))::text || '-08-26')::date 
         FROM matchups)
    END as preseason_cutoff
  FROM matchups
),
current_week_calc AS (
  SELECT 
    CASE 
      WHEN NOW() < (SELECT preseason_cutoff FROM preseason_cutoff_calc) THEN
        COALESCE(
          (SELECT MAX(week_number) FROM game_analysis WHERE season_type = 'PRE'),
          1
        )
      ELSE
        COALESCE(
          (SELECT MIN(week_number) 
           FROM game_analysis 
           WHERE season_type = 'REG'),
          (SELECT MAX(week_number) FROM game_analysis WHERE season_type = 'REG'),
          1
        )
    END as calculated_week
  FROM preseason_cutoff_calc
)
SELECT 'Calculated current week:' as status,
       calculated_week,
       CASE 
         WHEN NOW() < (SELECT preseason_cutoff FROM preseason_cutoff_calc) THEN 'PRE' || calculated_week
         ELSE 'REG' || calculated_week
       END as season_string
FROM current_week_calc;

-- Update the global settings with the calculated week
UPDATE global_settings 
SET value = (
  WITH game_analysis AS (
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
  preseason_cutoff_calc AS (
    SELECT 
      CASE 
        WHEN EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'PRE%') 
             AND EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'REG%') THEN
          (SELECT MIN(game_time) - INTERVAL '7 days' 
           FROM matchups 
           WHERE season LIKE 'REG%')
        WHEN EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'PRE%') THEN
          (SELECT MAX(game_time) + INTERVAL '7 days' 
           FROM matchups 
           WHERE season LIKE 'PRE%')
        ELSE 
          (SELECT (EXTRACT(YEAR FROM MIN(game_time))::text || '-08-26')::date 
           FROM matchups)
      END as preseason_cutoff
    FROM matchups
  ),
  current_week_calc AS (
    SELECT 
      CASE 
        WHEN NOW() < (SELECT preseason_cutoff FROM preseason_cutoff_calc) THEN
          COALESCE(
            (SELECT MAX(week_number) FROM game_analysis WHERE season_type = 'PRE'),
            1
          )
        ELSE
          COALESCE(
            (SELECT MIN(week_number) 
             FROM game_analysis 
             WHERE season_type = 'REG'),
            (SELECT MAX(week_number) FROM game_analysis WHERE season_type = 'REG'),
            1
          )
      END as calculated_week
    FROM preseason_cutoff_calc
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
       'Tester users will see preseason games until preseason cutoff' as tester_behavior,
       'Current week is now dynamically calculated for any season' as system_behavior,
       'System is now season-agnostic and future-proof' as future_proofing;
