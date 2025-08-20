-- Fix RLS policies for user registration
-- This script should be run in your Supabase SQL editor
-- SAFE VERSION - Includes proper error handling and checks

BEGIN;

-- First, let's see what policies currently exist (read-only)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';

-- Check if the users table exists and has RLS enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) THEN
        RAISE EXCEPTION 'Table "users" does not exist in public schema';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE 'RLS is not enabled on users table - enabling it';
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Safely drop existing policies (only if they exist)
DO $$
BEGIN
    -- Drop policies only if they exist
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Users can insert their own record'
    ) THEN
        DROP POLICY "Users can insert their own record" ON users;
        RAISE NOTICE 'Dropped existing policy: Users can insert their own record';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Users can view their own record'
    ) THEN
        DROP POLICY "Users can view their own record" ON users;
        RAISE NOTICE 'Dropped existing policy: Users can view their own record';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Users can update their own record'
    ) THEN
        DROP POLICY "Users can update their own record" ON users;
        RAISE NOTICE 'Dropped existing policy: Users can update their own record';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Admins can view all users'
    ) THEN
        DROP POLICY "Admins can view all users" ON users;
        RAISE NOTICE 'Dropped existing policy: Admins can view all users';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Admins can update all users'
    ) THEN
        DROP POLICY "Admins can update all users" ON users;
        RAISE NOTICE 'Dropped existing policy: Admins can update all users';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Admins can insert users'
    ) THEN
        DROP POLICY "Admins can insert users" ON users;
        RAISE NOTICE 'Dropped existing policy: Admins can insert users';
    END IF;
END $$;

-- Create policies with proper error handling
DO $$
BEGIN
    -- Create a policy that allows users to insert their own record during signup
    CREATE POLICY "Users can insert their own record" ON users
        FOR INSERT
        WITH CHECK (auth.uid() = id);
    RAISE NOTICE 'Created policy: Users can insert their own record';
    
    -- Create a policy that allows users to view their own record
    CREATE POLICY "Users can view their own record" ON users
        FOR SELECT
        USING (auth.uid() = id);
    RAISE NOTICE 'Created policy: Users can view their own record';
    
    -- Create a policy that allows users to update their own record
    CREATE POLICY "Users can update their own record" ON users
        FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    RAISE NOTICE 'Created policy: Users can update their own record';
    
    -- Create a policy that allows admins to view all users
    CREATE POLICY "Admins can view all users" ON users
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.is_admin = true
            )
        );
    RAISE NOTICE 'Created policy: Admins can view all users';
    
    -- Create a policy that allows admins to update all users
    CREATE POLICY "Admins can update all users" ON users
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.is_admin = true
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.is_admin = true
            )
        );
    RAISE NOTICE 'Created policy: Admins can update all users';
    
    -- Create a policy that allows admins to insert users
    CREATE POLICY "Admins can insert users" ON users
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.is_admin = true
            )
        );
    RAISE NOTICE 'Created policy: Admins can insert users';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating policies: %', SQLERRM;
END $$;

-- Verify the policies were created successfully
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users';
    
    IF policy_count = 0 THEN
        RAISE EXCEPTION 'No policies were created - something went wrong';
    ELSE
        RAISE NOTICE 'Successfully created % policies for users table', policy_count;
    END IF;
END $$;

-- Show the final policy configuration
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NULL THEN 'No condition'
        ELSE qual
    END as condition,
    CASE 
        WHEN with_check IS NULL THEN 'No check'
        ELSE with_check
    END as check_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY cmd, policyname;

COMMIT;

-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'RLS policy setup completed successfully!';
    RAISE NOTICE 'Users should now be able to register and access their own records.';
    RAISE NOTICE 'Admins can manage all users.';
END $$;
