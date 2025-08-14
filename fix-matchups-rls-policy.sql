-- Fix RLS policies for matchups table to allow SportsData.io service operations
-- This script enables the service role to bypass RLS and allows public read access

-- First, ensure RLS is enabled on the matchups table
ALTER TABLE public.matchups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.matchups;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.matchups;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.matchups;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.matchups;
DROP POLICY IF EXISTS "Enable all operations for service role" ON public.matchups;

-- Create policy for public read access (anyone can read matchups)
CREATE POLICY "Enable read access for all users" ON public.matchups
    FOR SELECT
    USING (true);

-- Create policy for service role to bypass RLS (allows SportsData.io service to insert/update)
CREATE POLICY "Enable all operations for service role" ON public.matchups
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Create policy for authenticated users to insert (for admin operations)
CREATE POLICY "Enable insert for authenticated users only" ON public.matchups
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update (for admin operations)
CREATE POLICY "Enable update for authenticated users only" ON public.matchups
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to delete (for admin operations)
CREATE POLICY "Enable delete for authenticated users only" ON public.matchups
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'matchups';

-- Test that the service role can access the table
-- (This will be tested by the application)
