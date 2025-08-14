-- Simple Pick Names Migration
-- This adds a pick_name column directly to the picks table
-- No separate pick_names table needed

-- Add pick_name column to picks table
ALTER TABLE public.picks 
ADD COLUMN IF NOT EXISTS pick_name TEXT;

-- Add notes column to picks table (optional)
ALTER TABLE public.picks 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for better performance when querying by pick_name
CREATE INDEX IF NOT EXISTS idx_picks_pick_name ON public.picks(pick_name);

-- Update RLS policies for picks table to allow pick_name updates
-- Users can update their own picks (including pick_name, matchup_id, team_picked, status)
CREATE POLICY "Users can update their own picks" ON public.picks
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can update all picks
CREATE POLICY "Admins can update all picks" ON public.picks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Update existing picks to have default names if they don't have them
-- This will give existing picks default names like "Pick 1", "Pick 2", etc.
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
      
      pick_counter := pick_counter + 1;
    END LOOP;
  END LOOP;
END $$;
