-- Add team-matchup unique identifiers for future-proof pick tracking
-- This creates a unique UUID for each team within each specific matchup

-- Add team_matchup_id column to picks table
ALTER TABLE public.picks 
ADD COLUMN IF NOT EXISTS team_matchup_id UUID;

-- Create a function to generate team-matchup IDs
CREATE OR REPLACE FUNCTION generate_team_matchup_id(p_matchup_id UUID, p_team_name TEXT)
RETURNS UUID AS $$
BEGIN
  -- Create a deterministic UUID based on matchup_id and team_name
  -- This ensures the same team in the same matchup always gets the same UUID
  -- Using md5 hash which is available in all PostgreSQL installations
  RETURN md5(p_matchup_id::text || p_team_name)::uuid;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get or create team-matchup ID
CREATE OR REPLACE FUNCTION get_team_matchup_id(p_matchup_id UUID, p_team_name TEXT)
RETURNS UUID AS $$
DECLARE
  team_matchup_uuid UUID;
BEGIN
  -- Generate the team-matchup ID
  team_matchup_uuid := generate_team_matchup_id(p_matchup_id, p_team_name);
  
  RETURN team_matchup_uuid;
END;
$$ LANGUAGE plpgsql;

-- Update existing picks to have team_matchup_id
UPDATE public.picks 
SET team_matchup_id = generate_team_matchup_id(matchup_id, team_picked)
WHERE team_matchup_id IS NULL 
AND matchup_id IS NOT NULL 
AND team_picked IS NOT NULL;

-- Check if there are any remaining NULL values
SELECT COUNT(*) as null_count 
FROM public.picks 
WHERE team_matchup_id IS NULL;

-- If there are picks without matchup_id or team_picked, we need to handle them
-- For now, let's set a default value for any remaining NULLs
UPDATE public.picks 
SET team_matchup_id = extensions.uuid_generate_v4()
WHERE team_matchup_id IS NULL;

-- Now make team_matchup_id NOT NULL after setting all values
ALTER TABLE public.picks 
ALTER COLUMN team_matchup_id SET NOT NULL;

-- Add unique constraint on team_matchup_id to ensure each team-matchup combination is unique
ALTER TABLE public.picks 
ADD CONSTRAINT picks_team_matchup_id_unique UNIQUE (team_matchup_id);

-- Add index on team_matchup_id for better query performance
CREATE INDEX IF NOT EXISTS idx_picks_team_matchup_id ON public.picks USING btree (team_matchup_id) TABLESPACE pg_default;

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.picks.team_matchup_id IS 'Unique identifier for each team within each specific matchup. This allows tracking picks at the team-matchup level for future-proof pick management.';

-- Create a function to get pick history by team-matchup ID
CREATE OR REPLACE FUNCTION get_pick_history_by_team_matchup(p_team_matchup_id UUID)
RETURNS TABLE (
  id UUID,
  team_matchup_id UUID,
  week INTEGER,
  matchup_id UUID,
  team_picked TEXT,
  pick_name TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  matchup_away_team TEXT,
  matchup_home_team TEXT,
  game_time TIMESTAMP WITH TIME ZONE,
  season TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.team_matchup_id,
    p.week,
    p.matchup_id,
    p.team_picked,
    p.pick_name,
    p.status,
    p.created_at,
    m.away_team,
    m.home_team,
    m.game_time,
    m.season
  FROM public.picks p
  LEFT JOIN public.matchups m ON p.matchup_id = m.id
  WHERE p.team_matchup_id = p_team_matchup_id
  ORDER BY p.week ASC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to advance a pick to a new team-matchup
CREATE OR REPLACE FUNCTION advance_pick_to_team_matchup(
  p_pick_id UUID,
  p_new_matchup_id UUID,
  p_new_team_picked TEXT,
  p_new_week INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_pick RECORD;
  new_team_matchup_id UUID;
BEGIN
  -- Get the current pick
  SELECT * INTO current_pick 
  FROM public.picks 
  WHERE id = p_pick_id 
  AND status = 'active'
  ORDER BY week DESC 
  LIMIT 1;
  
  -- Check if pick exists and is active
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pick not found or not active';
  END IF;
  
  -- Generate new team-matchup ID
  new_team_matchup_id := get_team_matchup_id(p_new_matchup_id, p_new_team_picked);
  
  -- Create a new record for the new team-matchup
  INSERT INTO public.picks (
    id,
    user_id,
    matchup_id,
    team_picked,
    team_matchup_id,
    pick_name,
    picks_count,
    status,
    week,
    selected_team,
    is_random,
    notes
  ) VALUES (
    p_pick_id, -- Use the same id to maintain the lifecycle
    current_pick.user_id,
    p_new_matchup_id,
    p_new_team_picked,
    new_team_matchup_id,
    current_pick.pick_name,
    current_pick.picks_count,
    'active',
    p_new_week,
    CASE 
      WHEN p_new_team_picked = (SELECT away_team FROM public.matchups WHERE id = p_new_matchup_id) THEN 'away'
      WHEN p_new_team_picked = (SELECT home_team FROM public.matchups WHERE id = p_new_matchup_id) THEN 'home'
      ELSE NULL
    END,
    current_pick.is_random,
    current_pick.notes
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get all team-matchup IDs for a user
CREATE OR REPLACE FUNCTION get_user_team_matchup_picks(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  team_matchup_id UUID,
  pick_name TEXT,
  current_week INTEGER,
  current_matchup_id UUID,
  current_team_picked TEXT,
  current_status TEXT,
  total_weeks_survived INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.team_matchup_id,
    p.pick_name,
    p.week as current_week,
    p.matchup_id as current_matchup_id,
    p.team_picked as current_team_picked,
    p.status as current_status,
    COUNT(*) OVER (PARTITION BY p.id) as total_weeks_survived
  FROM public.picks p
  WHERE p.user_id = p_user_id 
  AND p.status = 'active'
  ORDER BY p.pick_name, p.week DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to automatically set team_matchup_id
CREATE OR REPLACE FUNCTION set_team_matchup_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Set team_matchup_id if it's not already set
  IF NEW.team_matchup_id IS NULL AND NEW.matchup_id IS NOT NULL AND NEW.team_picked IS NOT NULL THEN
    NEW.team_matchup_id := get_team_matchup_id(NEW.matchup_id, NEW.team_picked);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set team_matchup_id on insert/update
DROP TRIGGER IF EXISTS trigger_set_team_matchup_id ON public.picks;
CREATE TRIGGER trigger_set_team_matchup_id
  BEFORE INSERT OR UPDATE ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION set_team_matchup_id();

-- Verify the changes
SELECT 
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
AND column_name = 'team_matchup_id';
