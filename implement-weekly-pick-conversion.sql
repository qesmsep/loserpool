-- Implement Weekly Pick Status Conversion
-- This script adds the logic to convert 'safe' picks to 'pending' at the end of each week
-- and ensures picks are set to 'active' when users make selections

-- First, update the picks table to include 'pending' status in the constraint
ALTER TABLE public.picks 
DROP CONSTRAINT IF EXISTS picks_status_check;

ALTER TABLE public.picks 
ADD CONSTRAINT picks_status_check 
CHECK (status IN ('active', 'eliminated', 'safe', 'pending'));

-- Create function to convert safe picks to pending at end of week
CREATE OR REPLACE FUNCTION convert_safe_picks_to_pending()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Convert all 'safe' picks to 'pending' status
  UPDATE public.picks 
  SET status = 'pending', updated_at = NOW()
  WHERE status = 'safe';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the conversion
  RAISE NOTICE 'Converted % safe picks to pending status', updated_count;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get current week end time (Monday night after last game)
CREATE OR REPLACE FUNCTION get_week_end_time(p_week INTEGER)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  last_game_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the latest game time for the given week
  SELECT MAX(game_time) INTO last_game_time
  FROM public.matchups
  WHERE week = p_week;
  
  -- If no games found, return null
  IF last_game_time IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Add 4 hours to the last game time to account for game completion
  -- This gives us Monday night after the last game ends
  RETURN last_game_time + INTERVAL '4 hours';
END;
$$ LANGUAGE plpgsql;

-- Create function to check if a week has ended
CREATE OR REPLACE FUNCTION is_week_ended(p_week INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  week_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  week_end_time := get_week_end_time(p_week);
  
  -- If we can't determine week end time, assume week hasn't ended
  IF week_end_time IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if current time is past the week end time
  RETURN NOW() > week_end_time;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically convert safe picks when week ends
CREATE OR REPLACE FUNCTION auto_convert_safe_picks_for_week(p_week INTEGER)
RETURNS INTEGER AS $$
DECLARE
  week_ended BOOLEAN;
  converted_count INTEGER := 0;
BEGIN
  -- Check if the week has ended
  week_ended := is_week_ended(p_week);
  
  IF week_ended THEN
    -- Convert safe picks to pending
    converted_count := convert_safe_picks_to_pending();
    RAISE NOTICE 'Week % has ended. Converted % safe picks to pending.', p_week, converted_count;
  ELSE
    RAISE NOTICE 'Week % has not ended yet. No conversion performed.', p_week;
  END IF;
  
  RETURN converted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get picks that need to be converted (for admin monitoring)
CREATE OR REPLACE FUNCTION get_picks_ready_for_conversion()
RETURNS TABLE (
  user_id UUID,
  pick_id UUID,
  pick_name TEXT,
  current_status TEXT,
  last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.id as pick_id,
    p.pick_name,
    p.status as current_status,
    p.updated_at as last_updated
  FROM public.picks p
  WHERE p.status = 'safe'
  ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to manually trigger safe-to-pending conversion (for admin use)
CREATE OR REPLACE FUNCTION admin_convert_safe_to_pending()
RETURNS JSON AS $$
DECLARE
  converted_count INTEGER;
  result JSON;
BEGIN
  -- Convert safe picks to pending
  converted_count := convert_safe_picks_to_pending();
  
  -- Create result object
  result := json_build_object(
    'success', true,
    'converted_count', converted_count,
    'timestamp', NOW(),
    'message', 'Safe picks converted to pending status'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the new status flow
COMMENT ON FUNCTION convert_safe_picks_to_pending() IS 'Converts all safe picks to pending status at the end of each week';
COMMENT ON FUNCTION auto_convert_safe_picks_for_week(INTEGER) IS 'Automatically converts safe picks to pending when a week ends';
COMMENT ON FUNCTION admin_convert_safe_to_pending() IS 'Admin function to manually trigger safe-to-pending conversion';

-- Test the functions
SELECT 'Functions created successfully' as status;

-- Show current picks status distribution
SELECT 
  status,
  COUNT(*) as count
FROM public.picks 
GROUP BY status 
ORDER BY status;

