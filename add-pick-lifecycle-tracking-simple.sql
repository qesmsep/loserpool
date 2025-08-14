-- Add pick lifecycle tracking using existing id column
-- The id column will serve as the unique identifier to track each pick through its entire journey across weeks

-- Create a function to get pick history using the existing id
CREATE OR REPLACE FUNCTION get_pick_history(p_pick_id UUID)
RETURNS TABLE (
  id UUID,
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
  WHERE p.id = p_pick_id
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
  WHERE id = p_pick_id 
  AND status = 'active'
  ORDER BY week DESC 
  LIMIT 1;
  
  -- Check if pick exists and is active
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pick not found or not active';
  END IF;
  
  -- Create a new record for the next week with the same id
  INSERT INTO public.picks (
    id,
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
    p_pick_id, -- Use the same id to maintain the lifecycle
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
  WHERE id = p_pick_id 
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
  WHERE id = p_pick_id 
  AND week = p_week;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get all active picks for a user across all weeks
CREATE OR REPLACE FUNCTION get_user_active_picks(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  pick_name TEXT,
  current_week INTEGER,
  current_team_picked TEXT,
  current_matchup_id UUID,
  status TEXT,
  total_weeks_survived INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.pick_name,
    p.week as current_week,
    p.team_picked as current_team_picked,
    p.matchup_id as current_matchup_id,
    p.status,
    COUNT(*) OVER (PARTITION BY p.id) as total_weeks_survived
  FROM public.picks p
  WHERE p.user_id = p_user_id 
  AND p.status = 'active'
  ORDER BY p.pick_name, p.week DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get pick history with season columns
CREATE OR REPLACE FUNCTION get_pick_history_by_season(p_pick_id UUID)
RETURNS TABLE (
  id UUID,
  pick_name TEXT,
  pre1_matchup_id UUID,
  pre1_team_picked TEXT,
  pre1_status TEXT,
  pre2_matchup_id UUID,
  pre2_team_picked TEXT,
  pre2_status TEXT,
  reg1_matchup_id UUID,
  reg1_team_picked TEXT,
  reg1_status TEXT,
  reg2_matchup_id UUID,
  reg2_team_picked TEXT,
  reg2_status TEXT,
  post1_matchup_id UUID,
  post1_team_picked TEXT,
  post1_status TEXT,
  post2_matchup_id UUID,
  post2_team_picked TEXT,
  post2_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.pick_name,
    MAX(CASE WHEN m.season = 'PRE1' THEN p.matchup_id END) as pre1_matchup_id,
    MAX(CASE WHEN m.season = 'PRE1' THEN p.team_picked END) as pre1_team_picked,
    MAX(CASE WHEN m.season = 'PRE1' THEN p.status END) as pre1_status,
    MAX(CASE WHEN m.season = 'PRE2' THEN p.matchup_id END) as pre2_matchup_id,
    MAX(CASE WHEN m.season = 'PRE2' THEN p.team_picked END) as pre2_team_picked,
    MAX(CASE WHEN m.season = 'PRE2' THEN p.status END) as pre2_status,
    MAX(CASE WHEN m.season = 'REG1' THEN p.matchup_id END) as reg1_matchup_id,
    MAX(CASE WHEN m.season = 'REG1' THEN p.team_picked END) as reg1_team_picked,
    MAX(CASE WHEN m.season = 'REG1' THEN p.status END) as reg1_status,
    MAX(CASE WHEN m.season = 'REG2' THEN p.matchup_id END) as reg2_matchup_id,
    MAX(CASE WHEN m.season = 'REG2' THEN p.team_picked END) as reg2_team_picked,
    MAX(CASE WHEN m.season = 'REG2' THEN p.status END) as reg2_status,
    MAX(CASE WHEN m.season = 'POST1' THEN p.matchup_id END) as post1_matchup_id,
    MAX(CASE WHEN m.season = 'POST1' THEN p.team_picked END) as post1_team_picked,
    MAX(CASE WHEN m.season = 'POST1' THEN p.status END) as post1_status,
    MAX(CASE WHEN m.season = 'POST2' THEN p.matchup_id END) as post2_matchup_id,
    MAX(CASE WHEN m.season = 'POST2' THEN p.team_picked END) as post2_team_picked,
    MAX(CASE WHEN m.season = 'POST2' THEN p.status END) as post2_status
  FROM public.picks p
  LEFT JOIN public.matchups m ON p.matchup_id = m.id
  WHERE p.id = p_pick_id
  GROUP BY p.id, p.pick_name;
END;
$$ LANGUAGE plpgsql;

-- Add a comment explaining the lifecycle tracking
COMMENT ON COLUMN public.picks.id IS 'Unique identifier for each pick throughout its entire lifecycle across weeks. When a pick advances to the next week, a new record is created with the same id.';
COMMENT ON COLUMN public.picks.week IS 'The week this pick record represents. A pick can have multiple records with the same id but different weeks as it progresses through the season.';
