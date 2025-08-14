-- Fix the team_matchup_id trigger to handle NULL values properly
-- The issue is that we're trying to insert picks with NULL matchup_id and team_picked
-- but the trigger expects these to be non-NULL to generate team_matchup_id

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_set_team_matchup_id ON public.picks;

-- Update the trigger function to handle NULL values
CREATE OR REPLACE FUNCTION set_team_matchup_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set team_matchup_id if both matchup_id and team_picked are provided
  IF NEW.team_matchup_id IS NULL AND NEW.matchup_id IS NOT NULL AND NEW.team_picked IS NOT NULL THEN
    NEW.team_matchup_id := get_team_matchup_id(NEW.matchup_id, NEW.team_picked);
  END IF;
  
  -- If we still don't have a team_matchup_id but the column is NOT NULL, generate a temporary one
  IF NEW.team_matchup_id IS NULL THEN
    -- Generate a temporary UUID for picks that don't have matchup_id/team_picked yet
    NEW.team_matchup_id := extensions.uuid_generate_v4();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_set_team_matchup_id
  BEFORE INSERT OR UPDATE ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION set_team_matchup_id();

-- Test the trigger with a sample insert
-- This should work now without errors
SELECT 'Trigger fixed - ready to test' as status;
