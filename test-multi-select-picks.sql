-- Test script for multi-select pick allocation
-- This script helps verify that the multi-select functionality works correctly

-- Check current state of picks and pick_names
SELECT 
  'Current database state:' as info,
  COUNT(*) as total_picks,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT matchup_id) as unique_matchups
FROM public.picks;

-- Check pick_names table
SELECT 
  'Pick names by user:' as info,
  pn.user_id,
  u.email,
  COUNT(pn.id) as total_pick_names,
  COUNT(CASE WHEN pn.is_active = true THEN 1 END) as active_pick_names
FROM public.pick_names pn
JOIN public.users u ON pn.user_id = u.id
GROUP BY pn.user_id, u.email
ORDER BY total_pick_names DESC;

-- Check which pick names are allocated vs available
SELECT 
  'Pick name allocation status:' as info,
  pn.user_id,
  u.email,
  pn.name as pick_name,
  CASE 
    WHEN p.id IS NOT NULL THEN 'Allocated'
    ELSE 'Available'
  END as status,
  CASE 
    WHEN p.id IS NOT NULL THEN p.team_picked
    ELSE NULL
  END as allocated_to_team
FROM public.pick_names pn
JOIN public.users u ON pn.user_id = u.id
LEFT JOIN public.picks p ON pn.id = p.pick_name_id
WHERE pn.is_active = true
ORDER BY pn.user_id, pn.name;

-- Test the get_available_pick_names function
SELECT 
  'Testing get_available_pick_names function:' as info,
  pn.id,
  pn.name,
  pn.description
FROM public.pick_names pn
WHERE pn.user_id = (
  SELECT id FROM public.users LIMIT 1
)
AND pn.is_active = TRUE
AND pn.id NOT IN (
  SELECT p.pick_name_id 
  FROM public.picks p 
  WHERE p.user_id = pn.user_id 
  AND p.pick_name_id IS NOT NULL
)
ORDER BY pn.name;

-- Check for any data inconsistencies
SELECT 
  'Data consistency check:' as info,
  CASE 
    WHEN p.pick_name_id IS NOT NULL AND p.pick_name IS NOT NULL 
    THEN 'Has both name_id and name_text'
    WHEN p.pick_name_id IS NOT NULL 
    THEN 'Has name_id only'
    WHEN p.pick_name IS NOT NULL 
    THEN 'Has name_text only'
    ELSE 'No naming'
  END as naming_status,
  COUNT(*) as count
FROM public.picks p
GROUP BY 
  CASE 
    WHEN p.pick_name_id IS NOT NULL AND p.pick_name IS NOT NULL 
    THEN 'Has both name_id and name_text'
    WHEN p.pick_name_id IS NOT NULL 
    THEN 'Has name_id only'
    WHEN p.pick_name IS NOT NULL 
    THEN 'Has name_text only'
    ELSE 'No naming'
  END;

-- Show sample user with multiple picks for testing
SELECT 
  'Sample user for testing multi-select:' as info,
  u.id as user_id,
  u.email,
  COUNT(pn.id) as total_pick_names,
  COUNT(CASE WHEN p.id IS NULL THEN 1 END) as available_picks
FROM public.users u
JOIN public.pick_names pn ON u.id = pn.user_id
LEFT JOIN public.picks p ON pn.id = p.pick_name_id
WHERE pn.is_active = true
GROUP BY u.id, u.email
HAVING COUNT(pn.id) > 1
ORDER BY available_picks DESC
LIMIT 3;

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

-- Verify the multi-select allocation would work
SELECT 
  'Multi-select allocation test:' as info,
  'User would be able to allocate multiple picks to a team' as test_description,
  COUNT(pn.id) as available_picks_for_user,
  m.away_team as sample_team
FROM public.pick_names pn
CROSS JOIN (
  SELECT m.id, m.away_team 
  FROM public.matchups m 
  WHERE m.week = (SELECT COALESCE(CAST(value AS INTEGER), 1) FROM public.global_settings WHERE key = 'current_week')
  LIMIT 1
) m
WHERE pn.user_id = (
  SELECT u.id FROM public.users u 
  JOIN public.pick_names pn2 ON u.id = pn2.user_id 
  WHERE pn2.is_active = true 
  GROUP BY u.id 
  HAVING COUNT(pn2.id) > 1 
  LIMIT 1
)
AND pn.is_active = TRUE
AND pn.id NOT IN (
  SELECT p.pick_name_id 
  FROM public.picks p 
  WHERE p.user_id = pn.user_id 
  AND p.pick_name_id IS NOT NULL
);
