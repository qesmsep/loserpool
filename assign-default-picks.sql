-- Function to assign default picks based on largest spread
CREATE OR REPLACE FUNCTION assign_default_picks(target_week INTEGER)
RETURNS INTEGER AS $$
DECLARE
  user_record RECORD;
  matchup_record RECORD;
  picks_needed INTEGER;
  picks_assigned INTEGER := 0;
  total_assigned INTEGER := 0;
  largest_spread_matchup RECORD;
BEGIN
  -- Loop through all users who have purchased picks
  FOR user_record IN 
    SELECT DISTINCT u.id, u.email, u.username, u.first_name, u.last_name
    FROM users u
    JOIN purchases p ON u.id = p.user_id
    WHERE p.status = 'completed'
  LOOP
    -- Calculate how many picks this user has available
    SELECT COALESCE(SUM(picks_count), 0) INTO picks_needed
    FROM purchases 
    WHERE user_id = user_record.id AND status = 'completed';
    
    -- Subtract picks already used this week
    SELECT COALESCE(SUM(picks_count), 0) INTO picks_assigned
    FROM picks p
    JOIN matchups m ON p.matchup_id = m.id
    WHERE p.user_id = user_record.id AND m.week = target_week;
    
    picks_needed := picks_needed - picks_assigned;
    
    -- If user needs picks assigned
    IF picks_needed > 0 THEN
      -- Find the matchup with the largest spread (most favored team)
      SELECT m.*, 
             CASE 
               WHEN m.away_spread > m.home_spread THEN m.away_team
               ELSE m.home_team
             END as favored_team,
             ABS(GREATEST(m.away_spread, m.home_spread)) as spread_magnitude
      INTO largest_spread_matchup
      FROM matchups m
      WHERE m.week = target_week 
        AND m.status = 'scheduled'
        AND m.game_time > NOW() -- Only future games
        AND m.id NOT IN (
          SELECT matchup_id 
          FROM picks 
          WHERE user_id = user_record.id
        )
      ORDER BY ABS(GREATEST(away_spread, home_spread)) DESC
      LIMIT 1;
      
      -- If we found a matchup, assign the pick
      IF largest_spread_matchup.id IS NOT NULL THEN
        INSERT INTO picks (user_id, matchup_id, team_picked, picks_count, status)
        VALUES (user_record.id, largest_spread_matchup.id, largest_spread_matchup.favored_team, picks_needed, 'active');
        
        total_assigned := total_assigned + picks_needed;
        
        -- Log the assignment
        RAISE NOTICE 'Assigned % picks to user % (%) for % vs % (spread: %)', 
          picks_needed, 
          user_record.email, 
          user_record.username,
          largest_spread_matchup.away_team,
          largest_spread_matchup.home_team,
          largest_spread_matchup.spread_magnitude;
      END IF;
    END IF;
  END LOOP;
  
  RETURN total_assigned;
END;
$$ LANGUAGE plpgsql;

-- Function to get the largest spread matchup for a given week
CREATE OR REPLACE FUNCTION get_largest_spread_matchup(target_week INTEGER)
RETURNS TABLE(
  matchup_id UUID,
  away_team TEXT,
  home_team TEXT,
  favored_team TEXT,
  spread_magnitude DECIMAL(4,1),
  game_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as matchup_id,
    m.away_team,
    m.home_team,
    CASE 
      WHEN m.away_spread > m.home_spread THEN m.away_team
      ELSE m.home_team
    END as favored_team,
    ABS(GREATEST(m.away_spread, m.home_spread)) as spread_magnitude,
    m.game_time
  FROM matchups m
  WHERE m.week = target_week 
    AND m.status = 'scheduled'
    AND m.game_time > NOW()
  ORDER BY ABS(GREATEST(away_spread, home_spread)) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT assign_default_picks(1); -- Assign default picks for week 1
-- SELECT * FROM get_largest_spread_matchup(1); -- Get the largest spread matchup for week 1 