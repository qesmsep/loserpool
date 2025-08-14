-- Add pick lifecycle tracking
-- This allows us to track each individual pick through its entire journey across weeks

-- Add pick_id column to uniquely identify each pick throughout its lifecycle
ALTER TABLE public.picks 
ADD COLUMN IF NOT EXISTS pick_id UUID DEFAULT extensions.uuid_generate_v4();

-- Update existing picks to have unique pick_ids
UPDATE public.picks 
SET pick_id = extensions.uuid_generate_v4() 
WHERE pick_id IS NULL;

-- Make pick_id NOT NULL after setting default values
ALTER TABLE public.picks 
ALTER COLUMN pick_id SET NOT NULL;

-- Add unique constraint on pick_id to ensure each pick has a unique identifier
ALTER TABLE public.picks 
ADD CONSTRAINT picks_pick_id_unique UNIQUE (pick_id);

-- Add index on pick_id for better query performance
CREATE INDEX IF NOT EXISTS idx_picks_pick_id ON public.picks USING btree (pick_id) TABLESPACE pg_default;

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.picks.pick_id IS 'Unique identifier for each pick throughout its entire lifecycle across weeks.';

-- Create a function to get pick history
CREATE OR REPLACE FUNCTION get_pick_history(p_pick_id UUID)
RETURNS TABLE (
  pick_id UUID,
  week INTEGER,
  matchup_id UUID,
  team_picked TEXT,
  pick_name TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  matchup_away_team TEXT,
  matchup_home_team TEXT,
  game_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.pick_id,
    p.week,
    p.matchup_id,
    p.team_picked,
    p.pick_name,
    p.status,
    p.created_at,
    m.away_team,
    m.home_team,
    m.game_time
  FROM public.picks p
  LEFT JOIN public.matchups m ON p.matchup_id = m.id
  WHERE p.pick_id = p_pick_id
  ORDER BY p.week ASC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to advance a pick to the next week
CREATE OR REPLACE FUNCTION advance_pick_to_week(
  p_pick_id UUID,
  p_next_week INTEGER,
  p_next_matchup_id UUID,
  p_next_team_picked TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_pick RECORD;
BEGIN
  -- Get the current pick
  SELECT * INTO current_pick 
  FROM public.picks 
  WHERE pick_id = p_pick_id 
  AND status = 'active'
  ORDER BY week DESC 
  LIMIT 1;
  
  -- Check if pick exists and is active
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pick not found or not active';
  END IF;
  
  -- Create a new record for the next week
  INSERT INTO public.picks (
    pick_id,
    user_id,
    matchup_id,
    team_picked,
    pick_name,
    picks_count,
    status,
    week,
    selected_team,
    is_random,
    notes
  ) VALUES (
    p_pick_id,
    current_pick.user_id,
    p_next_matchup_id,
    p_next_team_picked,
    current_pick.pick_name,
    current_pick.picks_count,
    'active',
    p_next_week,
    CASE 
      WHEN p_next_team_picked = (SELECT away_team FROM public.matchups WHERE id = p_next_matchup_id) THEN 'away'
      WHEN p_next_team_picked = (SELECT home_team FROM public.matchups WHERE id = p_next_matchup_id) THEN 'home'
      ELSE NULL
    END,
    current_pick.is_random,
    current_pick.notes
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a function to eliminate a pick
CREATE OR REPLACE FUNCTION eliminate_pick(p_pick_id UUID, p_week INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.picks 
  SET status = 'eliminated'
  WHERE pick_id = p_pick_id 
  AND week = p_week;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create a function to mark a pick as safe (survived the week)
CREATE OR REPLACE FUNCTION mark_pick_safe(p_pick_id UUID, p_week INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.picks 
  SET status = 'safe'
  WHERE pick_id = p_pick_id 
  AND week = p_week;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Verify the changes
SELECT 
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
AND column_name IN ('pick_id', 'week')
ORDER BY column_name;
