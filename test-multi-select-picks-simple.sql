-- Test script for multi-select pick allocation (Simple Structure)
-- This script works with the existing pick_name text column

-- Check current state of picks table
SELECT 
  'Current picks table structure:' as info,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
ORDER BY ordinal_position;

-- Check current picks data
SELECT 
  'Sample picks data:' as info,
  p.id,
  p.user_id,
  p.matchup_id,
  p.team_picked,
  p.selected_team,
  p.picks_count,
  p.pick_name,
  p.status,
  p.week
FROM public.picks p
LIMIT 5;

-- Check how many picks have pick_name vs null
SELECT 
  'Pick naming analysis:' as info,
  COUNT(*) as total_picks,
  COUNT(pick_name) as picks_with_names,
  COUNT(CASE WHEN pick_name IS NULL THEN 1 END) as picks_without_names
FROM public.picks;

-- Check user pick distribution
SELECT 
  'User pick distribution:' as info,
  u.email,
  COUNT(p.id) as total_picks,
  COUNT(p.pick_name) as named_picks
FROM public.users u
LEFT JOIN public.picks p ON u.id = p.user_id
GROUP BY u.id, u.email
ORDER BY total_picks DESC
LIMIT 10;

-- Check for any data inconsistencies
SELECT 
  'Data consistency check:' as info,
  CASE 
    WHEN selected_team IS NOT NULL AND team_picked IS NOT NULL 
    THEN 'Has both selected_team and team_picked'
    WHEN selected_team IS NOT NULL 
    THEN 'Has selected_team only'
    WHEN team_picked IS NOT NULL 
    THEN 'Has team_picked only'
    ELSE 'No team selection'
  END as team_status,
  COUNT(*) as count
FROM public.picks
GROUP BY 
  CASE 
    WHEN selected_team IS NOT NULL AND team_picked IS NOT NULL 
    THEN 'Has both selected_team and team_picked'
    WHEN selected_team IS NOT NULL 
    THEN 'Has selected_team only'
    WHEN team_picked IS NOT NULL 
    THEN 'Has team_picked only'
    ELSE 'No team selection'
  END;

-- Show what pick names are currently in use
SELECT 
  'Current pick names in use:' as info,
  pick_name,
  COUNT(*) as usage_count
FROM public.picks
WHERE pick_name IS NOT NULL
GROUP BY pick_name
ORDER BY pick_name;

-- Check current week matchups for testing
SELECT 
  'Current week matchups for testing:' as info,
  m.id as matchup_id,
  m.week,
  m.away_team,
  m.home_team,
  m.game_time,
  m.status
FROM public.matchups m
WHERE m.week = (
  SELECT COALESCE(CAST(value AS INTEGER), 1) 
  FROM public.global_settings 
  WHERE key = 'current_week'
)
ORDER BY m.game_time;

-- Check user purchases to understand available picks
SELECT 
  'User purchases and available picks:' as info,
  u.email,
  COALESCE(SUM(purchases.picks_count), 0) as total_purchased,
  COUNT(p.id) as picks_allocated,
  COALESCE(SUM(purchases.picks_count), 0) - COUNT(p.id) as picks_remaining
FROM public.users u
LEFT JOIN public.purchases purchases ON u.id = purchases.user_id AND purchases.status = 'completed'
LEFT JOIN public.picks p ON u.id = p.user_id
GROUP BY u.id, u.email
HAVING COALESCE(SUM(purchases.picks_count), 0) > 0
ORDER BY picks_remaining DESC
LIMIT 5;

-- Test the available picks logic
SELECT 
  'Available picks test for first user:' as info,
  'User would have these pick names available' as test_description,
  'Pick ' || generate_series(1, 10) as available_pick_name
FROM generate_series(1, 10)
WHERE 'Pick ' || generate_series(1, 10) NOT IN (
  SELECT DISTINCT pick_name 
  FROM public.picks p
  JOIN public.users u ON p.user_id = u.id
  WHERE p.pick_name IS NOT NULL
  AND u.id = (SELECT id FROM public.users LIMIT 1)
  AND p.week = (SELECT COALESCE(CAST(value AS INTEGER), 1) FROM public.global_settings WHERE key = 'current_week')
);

-- Verify the multi-select allocation would work
SELECT 
  'Multi-select allocation test:' as info,
  'User would be able to allocate multiple picks to a team' as test_description,
  COUNT(*) as available_picks_for_user,
  m.away_team as sample_team
FROM (
  SELECT 'Pick ' || generate_series(1, 10) as pick_name
) available_picks
CROSS JOIN (
  SELECT m.id, m.away_team 
  FROM public.matchups m 
  WHERE m.week = (SELECT COALESCE(CAST(value AS INTEGER), 1) FROM public.global_settings WHERE key = 'current_week')
  LIMIT 1
) m
WHERE available_picks.pick_name NOT IN (
  SELECT DISTINCT pick_name 
  FROM public.picks p
  JOIN public.users u ON p.user_id = u.id
  WHERE p.pick_name IS NOT NULL
  AND u.id = (SELECT id FROM public.users LIMIT 1)
  AND p.week = (SELECT COALESCE(CAST(value AS INTEGER), 1) FROM public.global_settings WHERE key = 'current_week')
);
