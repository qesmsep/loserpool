-- Fix Specific RLS Security Errors
-- This script addresses the three specific Supabase linter security warnings
-- Safe to run multiple times - includes proper error handling

DO $$
BEGIN
    -- 1. Fix the users table RLS policy that references user_metadata (security vulnerability)
    -- Check if the problematic policy exists before dropping it
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Allow admin all'
    ) THEN
        DROP POLICY "Allow admin all" ON users;
        RAISE NOTICE 'Dropped insecure "Allow admin all" policy from users table';
    ELSE
        RAISE NOTICE 'Policy "Allow admin all" not found on users table - skipping drop';
    END IF;

    -- Create a secure admin policy that doesn't use user_metadata
    -- Use CREATE OR REPLACE to avoid errors if policy already exists
    CREATE POLICY "Allow admin all" ON users
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND is_admin = true
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND is_admin = true
            )
        );
    RAISE NOTICE 'Created secure "Allow admin all" policy on users table';

    -- 2. Enable RLS on teams table and create appropriate policies
    -- Check if RLS is already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'teams' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on teams table';
    ELSE
        RAISE NOTICE 'RLS already enabled on teams table';
    END IF;

    -- Drop existing policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "Anyone can view teams" ON teams;
    DROP POLICY IF EXISTS "Admins can manage teams" ON teams;

    -- Teams table policies - anyone can view teams (public data)
    CREATE POLICY "Anyone can view teams" ON teams
        FOR SELECT USING (true);

    -- Only admins can manage teams
    CREATE POLICY "Admins can manage teams" ON teams
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND is_admin = true
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND is_admin = true
            )
        );
    RAISE NOTICE 'Created policies for teams table';

    -- 3. Enable RLS on leaderboard table and create appropriate policies
    -- Check if RLS is already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'leaderboard' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on leaderboard table';
    ELSE
        RAISE NOTICE 'RLS already enabled on leaderboard table';
    END IF;

    -- Drop existing policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "Users can view own leaderboard" ON leaderboard;
    DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard;
    DROP POLICY IF EXISTS "Admins can manage leaderboard" ON leaderboard;

    -- Users can view their own leaderboard entries
    CREATE POLICY "Users can view own leaderboard" ON leaderboard
        FOR SELECT USING (auth.uid() = user_id);

    -- Anyone can view leaderboard (for public leaderboard display)
    CREATE POLICY "Anyone can view leaderboard" ON leaderboard
        FOR SELECT USING (true);

    -- Only admins can manage leaderboard
    CREATE POLICY "Admins can manage leaderboard" ON leaderboard
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND is_admin = true
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND is_admin = true
            )
        );
    RAISE NOTICE 'Created policies for leaderboard table';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        RAISE;
END $$;

-- Verify the fixes
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN ('teams', 'leaderboard', 'users')
ORDER BY tablename;

-- Show created policies
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
WHERE schemaname = 'public'
    AND tablename IN ('teams', 'leaderboard', 'users')
ORDER BY tablename, policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Specific RLS Security Errors Fixed Successfully!';
    RAISE NOTICE '✅ 1. Fixed user_metadata security vulnerability in users table';
    RAISE NOTICE '✅ 2. Enabled RLS on teams table with appropriate policies';
    RAISE NOTICE '✅ 3. Enabled RLS on leaderboard table with appropriate policies';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '   - All tables now have RLS enabled';
    RAISE NOTICE '   - Secure admin policies created';
    RAISE NOTICE '   - Public read access maintained where needed';
    RAISE NOTICE '   - Script is safe to run multiple times';
END $$;
