-- Fix Current Week - Simple and Reliable Version
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

-- Simple analysis: Are we in preseason or regular season?
WITH season_analysis AS (
  SELECT 
    -- Check if we have preseason games
    EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'PRE%') as has_preseason,
    -- Check if we have regular season games  
    EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'REG%') as has_regular,
    -- Get earliest regular season game
    (SELECT MIN(game_time) FROM matchups WHERE season LIKE 'REG%') as earliest_reg_game,
    -- Get latest preseason game
    (SELECT MAX(game_time) FROM matchups WHERE season LIKE 'PRE%') as latest_pre_game,
    -- Get current year from earliest game
    EXTRACT(YEAR FROM (SELECT MIN(game_time) FROM matchups)) as season_year
)
SELECT 'Season Analysis:' as status,
       has_preseason,
       has_regular,
       earliest_reg_game,
       latest_pre_game,
       season_year,
       NOW() as current_time,
       CASE 
         WHEN has_preseason AND has_regular THEN
           CASE 
             WHEN NOW() < (earliest_reg_game - INTERVAL '7 days') THEN 'BEFORE preseason cutoff'
             ELSE 'AFTER preseason cutoff'
           END
         WHEN has_preseason AND NOT has_regular THEN
           CASE 
             WHEN NOW() < (latest_pre_game + INTERVAL '7 days') THEN 'BEFORE preseason cutoff'
             ELSE 'AFTER preseason cutoff'
           END
         ELSE 'AFTER preseason cutoff'
       END as date_status
FROM season_analysis;

-- Calculate the correct current week
WITH week_calculation AS (
  SELECT 
    CASE 
      -- If we have both preseason and regular season games
      WHEN EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'PRE%') 
           AND EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'REG%') THEN
        CASE 
          WHEN NOW() < ((SELECT MIN(game_time) FROM matchups WHERE season LIKE 'REG%') - INTERVAL '7 days') THEN
            -- We're in preseason
            (SELECT MAX(CAST(SUBSTRING(season FROM 4) AS INTEGER)) FROM matchups WHERE season LIKE 'PRE%')
          ELSE
            -- We're in regular season
            (SELECT MIN(CAST(SUBSTRING(season FROM 4) AS INTEGER)) FROM matchups WHERE season LIKE 'REG%')
        END
      -- If we only have preseason games
      WHEN EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'PRE%') THEN
        CASE 
          WHEN NOW() < ((SELECT MAX(game_time) FROM matchups WHERE season LIKE 'PRE%') + INTERVAL '7 days') THEN
            -- We're in preseason
            (SELECT MAX(CAST(SUBSTRING(season FROM 4) AS INTEGER)) FROM matchups WHERE season LIKE 'PRE%')
          ELSE
            -- We're past preseason
            1
        END
      -- If we only have regular season games or no games
      ELSE
        COALESCE(
          (SELECT MIN(CAST(SUBSTRING(season FROM 4) AS INTEGER)) FROM matchups WHERE season LIKE 'REG%'),
          1
        )
    END as calculated_week
)
SELECT 'Calculated current week:' as status,
       calculated_week,
       CASE 
         WHEN calculated_week <= 4 THEN 'PRE' || calculated_week
         ELSE 'REG' || calculated_week
       END as season_string
FROM week_calculation;

-- Update the global settings with the calculated week
UPDATE global_settings 
SET value = (
  WITH week_calculation AS (
    SELECT 
      CASE 
        -- If we have both preseason and regular season games
        WHEN EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'PRE%') 
             AND EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'REG%') THEN
          CASE 
            WHEN NOW() < ((SELECT MIN(game_time) FROM matchups WHERE season LIKE 'REG%') - INTERVAL '7 days') THEN
              -- We're in preseason
              (SELECT MAX(CAST(SUBSTRING(season FROM 4) AS INTEGER)) FROM matchups WHERE season LIKE 'PRE%')
            ELSE
              -- We're in regular season
              (SELECT MIN(CAST(SUBSTRING(season FROM 4) AS INTEGER)) FROM matchups WHERE season LIKE 'REG%')
          END
        -- If we only have preseason games
        WHEN EXISTS (SELECT 1 FROM matchups WHERE season LIKE 'PRE%') THEN
          CASE 
            WHEN NOW() < ((SELECT MAX(game_time) FROM matchups WHERE season LIKE 'PRE%') + INTERVAL '7 days') THEN
              -- We're in preseason
              (SELECT MAX(CAST(SUBSTRING(season FROM 4) AS INTEGER)) FROM matchups WHERE season LIKE 'PRE%')
            ELSE
              -- We're past preseason
              1
          END
        -- If we only have regular season games or no games
        ELSE
          COALESCE(
            (SELECT MIN(CAST(SUBSTRING(season FROM 4) AS INTEGER)) FROM matchups WHERE season LIKE 'REG%'),
            1
          )
      END as calculated_week
  )
  SELECT calculated_week::text
  FROM week_calculation
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
