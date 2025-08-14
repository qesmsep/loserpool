-- Test script to check pick identification system
-- Run this to understand the current state of your picks and pick names

-- Check current picks table structure
SELECT 
  'Current picks table columns:' as info,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
ORDER BY ordinal_position;

-- Check if pick_names table exists
SELECT 
  'pick_names table exists:' as info,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pick_names'
  ) as exists;

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
  p.pick_name_id,
  p.status
FROM public.picks p
LIMIT 5;

-- Check pick_names data if table exists
SELECT 
  'Sample pick_names data:' as info,
  pn.id,
  pn.user_id,
  pn.name,
  pn.description,
  pn.is_active
FROM public.pick_names pn
LIMIT 5;

-- Check how many picks have pick_name_id vs pick_name text
SELECT 
  'Pick naming analysis:' as info,
  COUNT(*) as total_picks,
  COUNT(pick_name_id) as picks_with_name_id,
  COUNT(pick_name) as picks_with_name_text,
  COUNT(CASE WHEN pick_name_id IS NULL AND pick_name IS NULL THEN 1 END) as picks_without_names
FROM public.picks;

-- Check user pick distribution
SELECT 
  'User pick distribution:' as info,
  u.email,
  COUNT(p.id) as total_picks,
  COUNT(p.pick_name_id) as named_picks,
  COUNT(p.pick_name) as text_named_picks
FROM public.users u
LEFT JOIN public.picks p ON u.id = p.user_id
GROUP BY u.id, u.email
ORDER BY total_picks DESC
LIMIT 10;

-- Check for any data inconsistencies
SELECT 
  'Data consistency check:' as info,
  CASE 
    WHEN pick_name_id IS NOT NULL AND pick_name IS NOT NULL 
    THEN 'Has both name_id and name_text'
    WHEN pick_name_id IS NOT NULL 
    THEN 'Has name_id only'
    WHEN pick_name IS NOT NULL 
    THEN 'Has name_text only'
    ELSE 'No naming'
  END as naming_status,
  COUNT(*) as count
FROM public.picks
GROUP BY 
  CASE 
    WHEN pick_name_id IS NOT NULL AND pick_name IS NOT NULL 
    THEN 'Has both name_id and name_text'
    WHEN pick_name_id IS NOT NULL 
    THEN 'Has name_id only'
    WHEN pick_name IS NOT NULL 
    THEN 'Has name_text only'
    ELSE 'No naming'
  END;

-- Show what the migration would do
SELECT 
  'Migration preview - picks that would get pick_name_id:' as info,
  p.id,
  p.user_id,
  p.pick_name,
  'Would link to pick_names table' as action
FROM public.picks p
WHERE p.pick_name IS NOT NULL 
  AND p.pick_name_id IS NULL
LIMIT 5;
