-- Comprehensive fix for all purchase APIs
-- This ensures the team_matchup_id system works with all purchase methods

-- Step 1: Make sure team_matchup_id is nullable
ALTER TABLE public.picks 
ALTER COLUMN team_matchup_id DROP NOT NULL;

-- Step 2: Update the trigger to handle NULL values properly
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

-- Step 3: Drop and recreate the trigger
DROP TRIGGER IF EXISTS trigger_set_team_matchup_id ON public.picks;
CREATE TRIGGER trigger_set_team_matchup_id
  BEFORE INSERT OR UPDATE ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION set_team_matchup_id();

-- Step 4: Test the trigger with a sample insert
-- This should work without errors
DO $$
BEGIN
  -- Test inserting a pick with NULL team_matchup_id
  INSERT INTO public.picks (
    user_id,
    matchup_id,
    team_picked,
    team_matchup_id,
    pick_name,
    picks_count,
    status,
    week
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', -- dummy user ID
    NULL,
    NULL,
    NULL,
    'Test Pick',
    1,
    'pending',
    1
  );
  
  -- Clean up the test record
  DELETE FROM public.picks WHERE user_id = '00000000-0000-0000-0000-000000000000';
  
  RAISE NOTICE 'Test insert successful - trigger is working correctly';
END $$;

-- Step 5: Verify the column is now nullable
SELECT 
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
AND column_name = 'team_matchup_id';

-- Step 6: Show current trigger status
SELECT 
  'Trigger Status' as status,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'picks'
AND trigger_name = 'trigger_set_team_matchup_id';
