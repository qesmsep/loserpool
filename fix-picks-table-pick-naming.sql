-- Fix picks table structure and pick naming integration
-- This migration consolidates the team columns and properly integrates pick names

-- First, let's check the current state
SELECT 
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
ORDER BY ordinal_position;

-- Step 1: Add the pick_name_id column if it doesn't exist
ALTER TABLE public.picks 
ADD COLUMN IF NOT EXISTS pick_name_id UUID REFERENCES public.pick_names(id) ON DELETE SET NULL;

-- Step 2: Create index for pick_name_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_picks_pick_name_id ON public.picks(pick_name_id);

-- Step 3: Migrate existing pick_name text data to pick_names table
-- This will create pick names for any existing picks that have pick_name text
INSERT INTO public.pick_names (user_id, name, description)
SELECT DISTINCT 
  p.user_id,
  COALESCE(p.pick_name, 'Pick ' || ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY p.created_at)),
  'Migrated pick name'
FROM public.picks p
WHERE p.pick_name IS NOT NULL
  AND p.pick_name_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.pick_names pn 
    WHERE pn.user_id = p.user_id 
    AND pn.name = p.pick_name
  )
ON CONFLICT (user_id, name) DO NOTHING;

-- Step 4: Update picks table to link to pick_names
UPDATE public.picks 
SET pick_name_id = pn.id
FROM public.pick_names pn
WHERE public.picks.user_id = pn.user_id 
  AND public.picks.pick_name = pn.name
  AND public.picks.pick_name_id IS NULL;

-- Step 5: Clean up - remove the old pick_name text column
-- (We'll do this after confirming the migration worked)
-- ALTER TABLE public.picks DROP COLUMN IF EXISTS pick_name;

-- Step 6: Ensure we have the proper team_picked column
-- The team_picked column should contain the actual team name
-- If selected_team is 'away', use away_team from matchups
-- If selected_team is 'home', use home_team from matchups
UPDATE public.picks 
SET team_picked = CASE 
  WHEN p.selected_team = 'away' THEN m.away_team
  WHEN p.selected_team = 'home' THEN m.home_team
  ELSE p.team_picked
END
FROM public.matchups m
WHERE public.picks.matchup_id = m.id
  AND public.picks.selected_team IS NOT NULL
  AND public.picks.team_picked IS NULL;

-- Step 7: Remove the selected_team column constraint since we're using team_picked
-- (This will be done after confirming the migration)

-- Verify the migration
SELECT 
  'Picks with pick_name_id' as check_type,
  COUNT(*) as count
FROM public.picks 
WHERE pick_name_id IS NOT NULL

UNION ALL

SELECT 
  'Picks with team_picked' as check_type,
  COUNT(*) as count
FROM public.picks 
WHERE team_picked IS NOT NULL

UNION ALL

SELECT 
  'Total picks' as check_type,
  COUNT(*) as count
FROM public.picks;

-- Show sample of migrated data
SELECT 
  p.id,
  p.user_id,
  p.team_picked,
  p.pick_name_id,
  pn.name as pick_name,
  p.picks_count,
  p.status
FROM public.picks p
LEFT JOIN public.pick_names pn ON p.pick_name_id = pn.id
LIMIT 10;
