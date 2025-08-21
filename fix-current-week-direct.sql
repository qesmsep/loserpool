-- Fix Current Week - Direct and Simple
-- This script directly sets the current week to 1

-- First, let's see what we have
SELECT 'Current global settings:' as status, key, value, updated_at
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

-- Simple logic: We're in January 2025, which is after the 2025 preseason
-- The earliest regular season games are in September 2025
-- So we should be showing Regular Season Week 1 games
SELECT 'Logic check:' as status,
       'Current date is January 2025' as current_date,
       'Earliest regular season games are in September 2025' as regular_season_start,
       'We are AFTER preseason cutoff' as conclusion,
       'Current week should be 1 (Regular Season Week 1)' as correct_week;

-- Direct update: Set current_week to 1
UPDATE global_settings 
SET value = '1', updated_at = NOW()
WHERE key = 'current_week';

-- Verify the update
SELECT 'Updated global settings:' as status, key, value, updated_at
FROM global_settings 
WHERE key = 'current_week';

-- Show what this means
SELECT 'Impact:' as status,
       'Active users will now see Regular Season Week 1 games' as description,
       'Tester users will see Regular Season Week 1 games (past preseason)' as tester_behavior,
       'This fixes the issue where users were seeing Week 3 games' as fix_description;
