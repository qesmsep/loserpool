-- Fix User Deletion RLS Policies
-- Run this in your Supabase SQL Editor to fix user deletion issues

-- First, let's check what RLS policies currently exist for users table
SELECT 'Current RLS policies for users table:' as status;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Check if there's already a delete policy
SELECT 'Checking for existing delete policy:' as status;
SELECT COUNT(*) as delete_policy_count
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'DELETE';

-- Drop any existing delete policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can delete user profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Create comprehensive admin delete policy for users table
CREATE POLICY "Admins can delete user profiles" ON public.users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Also add delete policies for related tables that admins might need to delete from
-- Purchases table
DROP POLICY IF EXISTS "Admins can delete purchases" ON public.purchases;
CREATE POLICY "Admins can delete purchases" ON public.purchases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Picks table
DROP POLICY IF EXISTS "Admins can delete picks" ON public.picks;
CREATE POLICY "Admins can delete picks" ON public.picks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Weekly results table
DROP POLICY IF EXISTS "Admins can delete weekly results" ON public.weekly_results;
CREATE POLICY "Admins can delete weekly results" ON public.weekly_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Invitations table
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.invitations;
CREATE POLICY "Admins can delete invitations" ON public.invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Check if pick_names table exists and add delete policy if it does
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pick_names') THEN
    DROP POLICY IF EXISTS "Admins can delete pick names" ON public.pick_names;
    CREATE POLICY "Admins can delete pick names" ON public.pick_names
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND is_admin = true
        )
      );
    RAISE NOTICE 'Added delete policy for pick_names table';
  END IF;
END $$;

-- Check if team_odds table exists and add delete policy if it does
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_odds') THEN
    DROP POLICY IF EXISTS "Admins can delete team odds" ON public.team_odds;
    CREATE POLICY "Admins can delete team odds" ON public.team_odds
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND is_admin = true
        )
      );
    RAISE NOTICE 'Added delete policy for team_odds table';
  END IF;
END $$;

-- Check if password_reset_tokens table exists and add delete policy if it does
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'password_reset_tokens') THEN
    DROP POLICY IF EXISTS "Admins can delete password reset tokens" ON public.password_reset_tokens;
    CREATE POLICY "Admins can delete password reset tokens" ON public.password_reset_tokens
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND is_admin = true
        )
      );
    RAISE NOTICE 'Added delete policy for password_reset_tokens table';
  END IF;
END $$;

-- Check if email_templates table exists and add delete policy if it does
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_templates') THEN
    DROP POLICY IF EXISTS "Admins can delete email templates" ON public.email_templates;
    CREATE POLICY "Admins can delete email templates" ON public.email_templates
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND is_admin = true
        )
      );
    RAISE NOTICE 'Added delete policy for email_templates table';
  END IF;
END $$;

-- Verify all policies were created successfully
SELECT 'All RLS policies after fix:' as status;
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'DELETE' THEN '✅ DELETE POLICY'
    ELSE cmd
  END as policy_type
FROM pg_policies 
WHERE tablename IN ('users', 'purchases', 'picks', 'weekly_results', 'invitations', 'pick_names', 'team_odds', 'password_reset_tokens', 'email_templates')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- Show the final count of delete policies
SELECT 'Final delete policy count:' as status, COUNT(*) as total_delete_policies
FROM pg_policies 
WHERE cmd = 'DELETE';

-- Test that the policies are working by checking if we can see them
SELECT 'RLS is enabled on users table:' as status, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

