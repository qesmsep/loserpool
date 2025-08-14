-- Fix picks that don't have pick_name values
-- Run this in Supabase SQL Editor after running the migration

-- First, add the pick_name column if it doesn't exist
ALTER TABLE public.picks 
ADD COLUMN IF NOT EXISTS pick_name TEXT;

-- Update picks that don't have pick_name to have default names
DO $$
DECLARE
  user_record RECORD;
  pick_record RECORD;
  pick_counter INTEGER;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM picks 
    WHERE pick_name IS NULL OR pick_name = ''
  LOOP
    pick_counter := 1;
    
    FOR pick_record IN 
      SELECT id 
      FROM picks 
      WHERE user_id = user_record.user_id 
      AND (pick_name IS NULL OR pick_name = '')
      ORDER BY created_at
    LOOP
      UPDATE picks 
      SET pick_name = 'Pick ' || pick_counter
      WHERE id = pick_record.id;
      
      RAISE NOTICE 'Updated pick % to have name "Pick %"', pick_record.id, pick_counter;
      
      pick_counter := pick_counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Verify the fix worked
SELECT 
  user_id,
  COUNT(*) as total_picks,
  COUNT(CASE WHEN pick_name IS NOT NULL AND pick_name != '' THEN 1 END) as picks_with_names
FROM picks
GROUP BY user_id
ORDER BY total_picks DESC;
