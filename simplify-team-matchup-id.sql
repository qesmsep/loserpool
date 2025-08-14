-- Simplify team_matchup_id generation to just append team initials to matchup_id
-- This replaces the complex md5 logic with a simple concatenation

-- First, drop the existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS generate_team_matchup_id(UUID, TEXT);
DROP FUNCTION IF EXISTS get_team_matchup_id(UUID, TEXT);
DROP FUNCTION IF EXISTS assign_pick_to_week(UUID, TEXT, UUID, TEXT);

-- Update the generate_team_matchup_id function to use simple concatenation
CREATE OR REPLACE FUNCTION generate_team_matchup_id(p_matchup_id UUID, p_team_name TEXT)
RETURNS TEXT AS $$
DECLARE
  team_initials TEXT;
BEGIN
  -- Extract team initials (first letter of each word)
  team_initials := regexp_replace(p_team_name, '([A-Z])[a-z]*', '\1', 'g');
  
  -- Return matchup_id + team initials
  RETURN p_matchup_id::text || '_' || team_initials;
END;
$$ LANGUAGE plpgsql;

-- Update the get_team_matchup_id function to use the simplified logic
CREATE OR REPLACE FUNCTION get_team_matchup_id(p_matchup_id UUID, p_team_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Return the simplified team-matchup ID
  RETURN generate_team_matchup_id(p_matchup_id, p_team_name);
END;
$$ LANGUAGE plpgsql;

-- Update the assign_pick_to_week function to handle TEXT instead of UUID
CREATE OR REPLACE FUNCTION assign_pick_to_week(
  p_pick_id UUID,
  p_week_column TEXT,
  p_matchup_id UUID,
  p_team_picked TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  team_matchup_id TEXT;
  update_query TEXT;
BEGIN
  -- Generate the team-matchup ID using simplified logic
  team_matchup_id := get_team_matchup_id(p_matchup_id, p_team_picked);
  
  -- Build dynamic update query
  update_query := format('UPDATE public.picks SET %I = $1 WHERE id = $2', p_week_column);
  
  -- Execute the update
  EXECUTE update_query USING team_matchup_id, p_pick_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
