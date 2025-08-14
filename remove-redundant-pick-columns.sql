-- Remove redundant columns from picks table
-- These columns are no longer needed with the wide pick system

-- Drop the trigger first since it references team_matchup_id
DROP TRIGGER IF EXISTS trigger_set_team_matchup_id ON public.picks;

-- Drop the unique constraint on team_matchup_id
ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_team_matchup_id_unique;

-- Drop indexes that reference the columns we're removing
DROP INDEX IF EXISTS idx_picks_user_matchup;
DROP INDEX IF EXISTS idx_picks_user_week;
DROP INDEX IF EXISTS idx_picks_team_matchup_id;

-- Drop foreign key constraints
ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_matchup_id_fkey;

-- Drop check constraints
ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_selected_team_check;

-- Remove the redundant columns
ALTER TABLE public.picks DROP COLUMN IF EXISTS matchup_id;
ALTER TABLE public.picks DROP COLUMN IF EXISTS selected_team;
ALTER TABLE public.picks DROP COLUMN IF EXISTS is_random;
ALTER TABLE public.picks DROP COLUMN IF EXISTS team_picked;
ALTER TABLE public.picks DROP COLUMN IF EXISTS week;
ALTER TABLE public.picks DROP COLUMN IF EXISTS team_matchup_id;

-- Update the status check constraint to remove 'eliminated' (should be 'lost')
ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_status_check;
ALTER TABLE public.picks ADD CONSTRAINT picks_status_check CHECK (
  status = ANY (ARRAY['pending', 'active', 'lost', 'safe'])
);

-- Verify the new table structure
SELECT 
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
ORDER BY ordinal_position;

-- Show remaining constraints
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'picks';

-- Show remaining indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'picks';
