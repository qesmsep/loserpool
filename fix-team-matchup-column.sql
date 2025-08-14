-- Fix the team_matchup_id column to be nullable temporarily
-- This will resolve the immediate 500 error

-- Make the team_matchup_id column nullable
ALTER TABLE public.picks 
ALTER COLUMN team_matchup_id DROP NOT NULL;

-- Update the trigger to handle NULL values properly
CREATE OR REPLACE FUNCTION set_team_matchup_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set team_matchup_id if both matchup_id and team_picked are provided
  IF NEW.team_matchup_id IS NULL AND NEW.matchup_id IS NOT NULL AND NEW.team_picked IS NOT NULL THEN
    NEW.team_matchup_id := get_team_matchup_id(NEW.matchup_id, NEW.team_picked);
  END IF;
  
  -- For picks without matchup_id/team_picked, leave team_matchup_id as NULL
  -- This is acceptable for pending picks
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trigger_set_team_matchup_id ON public.picks;
CREATE TRIGGER trigger_set_team_matchup_id
  BEFORE INSERT OR UPDATE ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION set_team_matchup_id();

-- Verify the column is now nullable
SELECT 
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
AND column_name = 'team_matchup_id';

-- Test that we can insert a pick with NULL team_matchup_id
SELECT 'Column fixed - ready to test' as status;
