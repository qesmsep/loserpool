-- Function to update pick statuses after games are completed
-- This should be called after each week's games are finished

CREATE OR REPLACE FUNCTION update_pick_statuses_after_week(p_week_number INTEGER)
RETURNS INTEGER AS $$
DECLARE
  week_column TEXT;
  updated_count INTEGER := 0;
  pick_record RECORD;
BEGIN
  -- Determine which week column to check
  IF p_week_number BETWEEN 1 AND 3 THEN
    week_column := 'pre' || p_week_number || '_team_matchup_id';
  ELSIF p_week_number BETWEEN 1 AND 18 THEN
    week_column := 'reg' || p_week_number || '_team_matchup_id';
  ELSIF p_week_number BETWEEN 1 AND 4 THEN
    week_column := 'post' || p_week_number || '_team_matchup_id';
  ELSE
    RAISE EXCEPTION 'Invalid week number: %', p_week_number;
  END IF;

  -- Loop through all picks that have a team_matchup_id for this week
  FOR pick_record IN 
    EXECUTE format('
      SELECT 
        p.id,
        p.%I as team_matchup_id,
        p.team_picked,
        m.away_team,
        m.home_team,
        m.away_score,
        m.home_score,
        m.status as game_status
      FROM public.picks p
      JOIN public.matchups m ON m.id = (
        SELECT matchup_id 
        FROM public.matchups 
        WHERE id::text || team_picked = p.%I::text
        LIMIT 1
      )
      WHERE p.%I IS NOT NULL 
      AND p.status = ''active''
      AND m.week = $1
    ', week_column, week_column, week_column)
    USING p_week_number
  LOOP
    -- Check if the game is finished
    IF pick_record.game_status = 'final' THEN
      -- Determine if the picked team won or lost
      DECLARE
        picked_team_score INTEGER;
        other_team_score INTEGER;
        pick_won BOOLEAN;
      BEGIN
        -- Get the scores for the picked team vs the other team
        IF pick_record.team_picked = pick_record.away_team THEN
          picked_team_score := pick_record.away_score;
          other_team_score := pick_record.home_score;
        ELSE
          picked_team_score := pick_record.home_score;
          other_team_score := pick_record.away_score;
        END IF;

        -- Determine if the pick won (picked team lost)
        pick_won := (picked_team_score < other_team_score);

        -- Update the pick status
        IF pick_won THEN
          -- Pick survives - keep as active
          UPDATE public.picks 
          SET status = 'active'
          WHERE id = pick_record.id;
        ELSE
          -- Pick loses - mark as lost
          UPDATE public.picks 
          SET status = 'lost'
          WHERE id = pick_record.id;
        END IF;

        updated_count := updated_count + 1;
      END;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get all picks for a user with their current status
CREATE OR REPLACE FUNCTION get_user_picks_with_status(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  pick_name TEXT,
  status TEXT,
  current_week_column TEXT,
  current_team_matchup_id UUID,
  current_team_picked TEXT,
  current_matchup_info TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.pick_name,
    p.status,
    CASE 
      WHEN p.pre1_team_matchup_id IS NOT NULL THEN 'PRE1'
      WHEN p.pre2_team_matchup_id IS NOT NULL THEN 'PRE2'
      WHEN p.pre3_team_matchup_id IS NOT NULL THEN 'PRE3'
      WHEN p.reg1_team_matchup_id IS NOT NULL THEN 'REG1'
      WHEN p.reg2_team_matchup_id IS NOT NULL THEN 'REG2'
      WHEN p.reg3_team_matchup_id IS NOT NULL THEN 'REG3'
      WHEN p.reg4_team_matchup_id IS NOT NULL THEN 'REG4'
      WHEN p.reg5_team_matchup_id IS NOT NULL THEN 'REG5'
      WHEN p.reg6_team_matchup_id IS NOT NULL THEN 'REG6'
      WHEN p.reg7_team_matchup_id IS NOT NULL THEN 'REG7'
      WHEN p.reg8_team_matchup_id IS NOT NULL THEN 'REG8'
      WHEN p.reg9_team_matchup_id IS NOT NULL THEN 'REG9'
      WHEN p.reg10_team_matchup_id IS NOT NULL THEN 'REG10'
      WHEN p.reg11_team_matchup_id IS NOT NULL THEN 'REG11'
      WHEN p.reg12_team_matchup_id IS NOT NULL THEN 'REG12'
      WHEN p.reg13_team_matchup_id IS NOT NULL THEN 'REG13'
      WHEN p.reg14_team_matchup_id IS NOT NULL THEN 'REG14'
      WHEN p.reg15_team_matchup_id IS NOT NULL THEN 'REG15'
      WHEN p.reg16_team_matchup_id IS NOT NULL THEN 'REG16'
      WHEN p.reg17_team_matchup_id IS NOT NULL THEN 'REG17'
      WHEN p.reg18_team_matchup_id IS NOT NULL THEN 'REG18'
      WHEN p.post1_team_matchup_id IS NOT NULL THEN 'POST1'
      WHEN p.post2_team_matchup_id IS NOT NULL THEN 'POST2'
      WHEN p.post3_team_matchup_id IS NOT NULL THEN 'POST3'
      WHEN p.post4_team_matchup_id IS NOT NULL THEN 'POST4'
      ELSE 'PENDING'
    END as current_week_column,
    COALESCE(
      p.pre1_team_matchup_id, p.pre2_team_matchup_id, p.pre3_team_matchup_id,
      p.reg1_team_matchup_id, p.reg2_team_matchup_id, p.reg3_team_matchup_id,
      p.reg4_team_matchup_id, p.reg5_team_matchup_id, p.reg6_team_matchup_id,
      p.reg7_team_matchup_id, p.reg8_team_matchup_id, p.reg9_team_matchup_id,
      p.reg10_team_matchup_id, p.reg11_team_matchup_id, p.reg12_team_matchup_id,
      p.reg13_team_matchup_id, p.reg14_team_matchup_id, p.reg15_team_matchup_id,
      p.reg16_team_matchup_id, p.reg17_team_matchup_id, p.reg18_team_matchup_id,
      p.post1_team_matchup_id, p.post2_team_matchup_id, p.post3_team_matchup_id,
      p.post4_team_matchup_id
    ) as current_team_matchup_id,
    p.team_picked,
    CASE 
      WHEN p.matchup_id IS NOT NULL THEN 
        (SELECT away_team || ' @ ' || home_team FROM public.matchups WHERE id = p.matchup_id)
      ELSE 'Not yet allocated'
    END as current_matchup_info
  FROM public.picks p
  WHERE p.user_id = p_user_id
  ORDER BY p.pick_name;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a game has started (for locking picks)
CREATE OR REPLACE FUNCTION is_game_locked(p_matchup_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  game_time TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT m.game_time INTO game_time
  FROM public.matchups m
  WHERE m.id = p_matchup_id;
  
  -- Game is locked if current time is past game time
  RETURN COALESCE(game_time < NOW(), FALSE);
END;
$$ LANGUAGE plpgsql;

-- Test the functions
SELECT 
  'Function Tests' as test_type,
  'update_pick_statuses_after_week(1)' as function_call,
  'Updates all pick statuses after REG1 games are final' as description;

SELECT 
  'Function Tests' as test_type,
  'get_user_picks_with_status(user_uuid)' as function_call,
  'Gets all picks for a user with their current status and week' as description;

SELECT 
  'Function Tests' as test_type,
  'is_game_locked(matchup_uuid)' as function_call,
  'Returns true if game has started and picks are locked' as description;
