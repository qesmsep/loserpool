-- Fix RLS policies to allow team breakdown viewing
-- This allows all authenticated users to view picks for team breakdown purposes

-- First, drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own picks" ON public.picks;

-- Create a new policy that allows all authenticated users to view picks
-- This is needed for the team breakdown feature on the dashboard
CREATE POLICY "Authenticated users can view all picks" ON public.picks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Note: This policy will allow all authenticated users to see all picks
-- which is what we want for the team breakdown feature
-- The existing admin policy will still apply for other operations (INSERT, UPDATE, DELETE)
