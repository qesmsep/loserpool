-- Implement Automatic Game-Based Pick Conversion
-- This system automatically converts 'safe' picks to 'pending' after the last game of the week ends

-- Create a function to check if all games in a week are completed
CREATE OR REPLACE FUNCTION are_all_week_games_completed(p_week INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  total_games INTEGER;
  completed_games INTEGER;
BEGIN
  -- Count total games for the week
  SELECT COUNT(*) INTO total_games
  FROM public.matchups
  WHERE week = p_week;
  
  -- Count completed games for the week
  SELECT COUNT(*) INTO completed_games
  FROM public.matchups
  WHERE week = p_week AND status = 'final';
  
  -- Return true if all games are completed
  RETURN total_games > 0 AND completed_games = total_games;
END;
$$ LANGUAGE plpgsql;

-- Create a function to automatically convert safe picks when week is complete
CREATE OR REPLACE FUNCTION auto_convert_safe_picks_on_week_completion(p_week INTEGER)
RETURNS INTEGER AS $$
DECLARE
  week_complete BOOLEAN;
  converted_count INTEGER := 0;
BEGIN
  -- Check if all games in the week are completed
  week_complete := are_all_week_games_completed(p_week);
  
  IF week_complete THEN
    -- Convert safe picks to pending
    converted_count := convert_safe_picks_to_pending();
    
    -- Log the automatic conversion
    RAISE NOTICE 'Week % completed. Automatically converted % safe picks to pending.', p_week, converted_count;
  ELSE
    RAISE NOTICE 'Week % not yet complete. No automatic conversion performed.', p_week;
  END IF;
  
  RETURN converted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function that runs when matchup status changes to 'final'
CREATE OR REPLACE FUNCTION trigger_auto_convert_on_game_completion()
RETURNS TRIGGER AS $$
DECLARE
  week_number INTEGER;
  converted_count INTEGER;
BEGIN
  -- Only process when status changes to 'final'
  IF NEW.status = 'final' AND (OLD.status IS NULL OR OLD.status != 'final') THEN
    week_number := NEW.week;
    
    -- Check if this was the last game of the week and convert if so
    converted_count := auto_convert_safe_picks_on_week_completion(week_number);
    
    -- Log the trigger execution
    RAISE NOTICE 'Game completion trigger: Week %, Game % vs % completed. Converted % picks.', 
      week_number, NEW.away_team, NEW.home_team, converted_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on matchups table
DROP TRIGGER IF EXISTS auto_convert_picks_on_game_completion ON public.matchups;
CREATE TRIGGER auto_convert_picks_on_game_completion
  AFTER UPDATE ON public.matchups
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_convert_on_game_completion();

-- Create a function to manually check and convert for a specific week (for admin use)
CREATE OR REPLACE FUNCTION admin_check_and_convert_week(p_week INTEGER)
RETURNS JSON AS $$
DECLARE
  week_complete BOOLEAN;
  total_games INTEGER;
  completed_games INTEGER;
  converted_count INTEGER;
  result JSON;
BEGIN
  -- Get game completion stats
  SELECT COUNT(*) INTO total_games
  FROM public.matchups
  WHERE week = p_week;
  
  SELECT COUNT(*) INTO completed_games
  FROM public.matchups
  WHERE week = p_week AND status = 'final';
  
  week_complete := total_games > 0 AND completed_games = total_games;
  
  -- Convert if week is complete
  IF week_complete THEN
    converted_count := convert_safe_picks_to_pending();
  ELSE
    converted_count := 0;
  END IF;
  
  -- Create result object
  result := json_build_object(
    'week', p_week,
    'total_games', total_games,
    'completed_games', completed_games,
    'week_complete', week_complete,
    'converted_count', converted_count,
    'timestamp', NOW(),
    'message', CASE 
      WHEN week_complete THEN 'Week completed. Safe picks converted to pending.'
      ELSE 'Week not yet complete. No conversion performed.'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get week completion status for all weeks
CREATE OR REPLACE FUNCTION get_all_weeks_completion_status()
RETURNS TABLE (
  week INTEGER,
  total_games INTEGER,
  completed_games INTEGER,
  is_complete BOOLEAN,
  completion_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.week,
    COUNT(*)::INTEGER as total_games,
    COUNT(CASE WHEN m.status = 'final' THEN 1 END)::INTEGER as completed_games,
    (COUNT(CASE WHEN m.status = 'final' THEN 1 END) = COUNT(*)) as is_complete,
    ROUND(
      (COUNT(CASE WHEN m.status = 'final' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
      2
    ) as completion_percentage
  FROM public.matchups m
  GROUP BY m.week
  ORDER BY m.week;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get the current week's completion status
CREATE OR REPLACE FUNCTION get_current_week_completion_status()
RETURNS JSON AS $$
DECLARE
  current_week INTEGER;
  week_status RECORD;
  result JSON;
BEGIN
  -- Get current week (you may need to adjust this based on your week detection logic)
  SELECT COALESCE(MAX(week), 1) INTO current_week
  FROM public.matchups
  WHERE game_time <= NOW() + INTERVAL '7 days'; -- Look for games in the next 7 days
  
  -- Get week completion status
  SELECT * INTO week_status
  FROM get_all_weeks_completion_status()
  WHERE week = current_week;
  
  -- Create result object
  result := json_build_object(
    'current_week', current_week,
    'total_games', COALESCE(week_status.total_games, 0),
    'completed_games', COALESCE(week_status.completed_games, 0),
    'is_complete', COALESCE(week_status.is_complete, false),
    'completion_percentage', COALESCE(week_status.completion_percentage, 0),
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add comments explaining the automatic system
COMMENT ON FUNCTION are_all_week_games_completed(INTEGER) IS 'Checks if all games in a specific week are completed (status = final)';
COMMENT ON FUNCTION auto_convert_safe_picks_on_week_completion(INTEGER) IS 'Automatically converts safe picks to pending when all games in a week are completed';
COMMENT ON FUNCTION trigger_auto_convert_on_game_completion() IS 'Trigger function that runs when a game status changes to final, checking if week is complete';
COMMENT ON FUNCTION admin_check_and_convert_week(INTEGER) IS 'Admin function to manually check and convert picks for a specific week';
COMMENT ON FUNCTION get_all_weeks_completion_status() IS 'Returns completion status for all weeks';
COMMENT ON FUNCTION get_current_week_completion_status() IS 'Returns completion status for the current week';

-- Test the functions
SELECT 'Automatic conversion system created successfully' as status;

-- Show current week completion status
SELECT get_current_week_completion_status() as current_week_status;

-- Show all weeks completion status
SELECT * FROM get_all_weeks_completion_status();

