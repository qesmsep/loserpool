-- Fix Picks Table Constraints
-- This allows NULL values for matchup_id and team_picked when picks are pending

-- Drop the existing foreign key constraint
ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_matchup_id_fkey;

-- Make matchup_id nullable (since pending picks don't have a matchup yet)
ALTER TABLE public.picks ALTER COLUMN matchup_id DROP NOT NULL;

-- Make team_picked nullable (since pending picks don't have a team picked yet)
ALTER TABLE public.picks ALTER COLUMN team_picked DROP NOT NULL;

-- Re-add the foreign key constraint with proper NULL handling
ALTER TABLE public.picks 
ADD CONSTRAINT picks_matchup_id_fkey 
FOREIGN KEY (matchup_id) REFERENCES matchups (id) ON DELETE CASCADE;

-- Update the status check constraint to include 'pending'
-- (This should already be correct, but let's make sure)
ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_status_check;

ALTER TABLE public.picks 
ADD CONSTRAINT picks_status_check 
CHECK (status IN ('pending', 'active', 'eliminated', 'safe'));

-- Verify the changes
SELECT 
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
AND column_name IN ('matchup_id', 'team_picked', 'status')
ORDER BY column_name;
