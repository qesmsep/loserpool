-- Add individual pick naming functionality
-- This migration adds the ability for users to name each individual pick

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

-- Add columns to picks table for individual naming
ALTER TABLE public.picks 
ADD COLUMN IF NOT EXISTS pick_name_id UUID REFERENCES public.pick_names(id) ON DELETE SET NULL,
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
