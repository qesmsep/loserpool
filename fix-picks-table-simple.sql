-- Fix picks table to work with existing pick_name text column
-- This migration adapts the multi-select solution to your current structure

-- First, let's check the current state
SELECT 
  'Current picks table structure:' as info,
  column_name,
  is_nullable,
  data_type,
  column_default
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
  p.status
FROM public.picks p
LIMIT 5;

-- Check how many picks have pick_name vs null
SELECT 
  'Pick naming analysis:' as info,
  COUNT(*) as total_picks,
  COUNT(pick_name) as picks_with_names,
  COUNT(CASE WHEN pick_name IS NULL THEN 1 END) as picks_without_names
FROM public.picks;

-- Check for any data inconsistencies between selected_team and team_picked
SELECT 
  'Team selection consistency:' as info,
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

-- Update team_picked based on selected_team if needed
UPDATE public.picks 
SET team_picked = CASE 
  WHEN public.picks.selected_team = 'away' THEN m.away_team
  WHEN public.picks.selected_team = 'home' THEN m.home_team
  ELSE public.picks.team_picked
END
FROM public.matchups m
WHERE public.picks.matchup_id = m.id
  AND public.picks.selected_team IS NOT NULL
  AND public.picks.team_picked IS NULL;

-- Generate default pick names for picks that don't have them
-- This will create pick names like "Pick 1", "Pick 2", etc. for each user
WITH numbered_picks AS (
  SELECT 
    p.id,
    p.user_id,
    ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY p.created_at) as pick_number
  FROM public.picks p
  WHERE p.pick_name IS NULL
)
UPDATE public.picks 
SET pick_name = 'Pick ' || np.pick_number
FROM numbered_picks np
WHERE public.picks.id = np.id;

-- Verify the updates
SELECT 
  'After migration verification:' as info,
  COUNT(*) as total_picks,
  COUNT(pick_name) as picks_with_names,
  COUNT(team_picked) as picks_with_team_names
FROM public.picks;

-- Show sample of updated data
SELECT 
  'Sample updated picks:' as info,
  p.id,
  p.user_id,
  p.team_picked,
  p.pick_name,
  p.picks_count,
  p.status
FROM public.picks p
LIMIT 10;
