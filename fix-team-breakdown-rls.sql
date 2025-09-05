-- Fix RLS policies to allow team breakdown viewing
-- This allows all authenticated users to view picks for team breakdown purposes

-- Run these commands in Supabase SQL editor:

-- 1. Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own picks" ON public.picks;

-- 2. Drop any existing policy with the same name to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view all picks" ON public.picks;

-- 3. Create a new policy that allows all authenticated users to view picks
CREATE POLICY "Authenticated users can view all picks" ON public.picks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Note: This policy will allow all authenticated users to see all picks
-- which is what we want for the team breakdown feature
-- The existing admin policy will still apply for other operations (INSERT, UPDATE, DELETE)
