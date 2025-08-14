-- Run this SQL in your Supabase SQL Editor to enable pick names functionality
-- This will create the pick_names table and add the necessary columns to the picks table

-- Add pick_names table to store named picks
CREATE TABLE IF NOT EXISTS public.pick_names (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Add pick_name_id column to picks table for individual naming
-- This column will reference the pick_names table
ALTER TABLE public.picks 
ADD COLUMN IF NOT EXISTS pick_name_id UUID REFERENCES public.pick_names(id) ON DELETE SET NULL;

-- Add notes column to picks table (optional)
ALTER TABLE public.picks 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_picks_pick_name_id ON public.picks(pick_name_id);
CREATE INDEX IF NOT EXISTS idx_pick_names_user_id ON public.pick_names(user_id);

-- Add RLS policies for pick_names table
ALTER TABLE public.pick_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pick names" ON public.pick_names
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pick names" ON public.pick_names
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pick names" ON public.pick_names
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pick names" ON public.pick_names
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all pick names" ON public.pick_names
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Add trigger to update updated_at column for pick_names
CREATE TRIGGER update_pick_names_updated_at
  BEFORE UPDATE ON public.pick_names
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a function to generate default pick names for a user
CREATE OR REPLACE FUNCTION generate_default_pick_names(user_uuid UUID, count INTEGER)
RETURNS VOID AS $$
DECLARE
  i INTEGER;
  pick_name TEXT;
BEGIN
  FOR i IN 1..count LOOP
    pick_name := 'Pick ' || i;
    
    -- Insert the pick name if it doesn't exist
    INSERT INTO public.pick_names (user_id, name, description)
    VALUES (user_uuid, pick_name, 'Default pick name')
    ON CONFLICT (user_id, name) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get available pick names for a user
CREATE OR REPLACE FUNCTION get_available_pick_names(user_uuid UUID)
RETURNS TABLE(id UUID, name TEXT, description TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT pn.id, pn.name, pn.description
  FROM public.pick_names pn
  WHERE pn.user_id = user_uuid 
  AND pn.is_active = TRUE
  AND pn.id NOT IN (
    SELECT p.pick_name_id 
    FROM public.picks p 
    WHERE p.user_id = user_uuid 
    AND p.pick_name_id IS NOT NULL
  )
  ORDER BY pn.name;
END;
$$ LANGUAGE plpgsql;

-- Generate default pick names for existing users who have purchased picks
-- This will create "Pick 1", "Pick 2", etc. for users who already have purchases
DO $$
DECLARE
  user_record RECORD;
  total_picks INTEGER;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT u.id, u.email
    FROM users u
    JOIN purchases p ON u.id = p.user_id
    WHERE p.status = 'completed'
  LOOP
    -- Calculate total picks purchased by this user
    SELECT COALESCE(SUM(picks_count), 0) INTO total_picks
    FROM purchases 
    WHERE user_id = user_record.id AND status = 'completed';
    
    -- Generate default pick names for this user
    PERFORM generate_default_pick_names(user_record.id, total_picks);
    
    RAISE NOTICE 'Generated % default pick names for user % (%)', 
      total_picks, user_record.email, user_record.id;
  END LOOP;
END $$;
