-- Fix Global Settings RLS Policies
-- This script checks and fixes RLS policies for the global_settings table

-- First, let's check the current state
SELECT 'Current RLS status:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'global_settings';

SELECT 'Current policies:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'global_settings'
ORDER BY policyname;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Anyone can view global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Admins can manage global settings" ON public.global_settings;

-- Enable RLS on global_settings table
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for global_settings
-- Policy 1: Anyone can view global settings (for reading rules, etc.)
CREATE POLICY "Anyone can view global settings" ON public.global_settings
  FOR SELECT USING (true);

-- Policy 2: Admins can insert new settings
CREATE POLICY "Admins can insert global settings" ON public.global_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy 3: Admins can update existing settings
CREATE POLICY "Admins can update global settings" ON public.global_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy 4: Admins can delete settings (if needed)
CREATE POLICY "Admins can delete global settings" ON public.global_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Verify the policies were created
SELECT 'New policies created:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'global_settings'
ORDER BY policyname;

-- Test the policies by checking if current user is admin
SELECT 'Current user admin status:' as info;
SELECT 
    id,
    email,
    is_admin
FROM public.users 
WHERE id = auth.uid();

-- Check if global_settings table exists and has the right structure
SELECT 'Global settings table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'global_settings'
ORDER BY ordinal_position;

-- Show current global settings
SELECT 'Current global settings:' as info;
SELECT key, value FROM public.global_settings ORDER BY key;
