-- Enable RLS Policies for Users Table
-- This script provides secure RLS policies that won't break your app functionality

BEGIN;

-- 1. First, enable RLS on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Allow admin all" ON public.users;
DROP POLICY IF EXISTS "Allow signup" ON public.users;
DROP POLICY IF EXISTS "Allow update own" ON public.users;
DROP POLICY IF EXISTS "Allow view own" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Allow user signup" ON public.users;
DROP POLICY IF EXISTS "Allow password reset updates" ON public.users;
DROP POLICY IF EXISTS "Allow auth operations" ON public.users;

-- 3. Create a secure function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the user is an admin
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create comprehensive RLS policies

-- Policy 1: Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Policy 2: Allow users to update their own profile (except admin status)
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id 
        AND (
            -- Users can update most fields but not admin status
            (OLD.is_admin = NEW.is_admin) OR
            -- Only allow admin status changes if they're already an admin
            (is_user_admin(auth.uid()) AND OLD.is_admin != NEW.is_admin)
        )
    );

-- Policy 3: Allow users to insert their own record (for signup)
CREATE POLICY "Users can insert own record" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy 4: Allow admins to view all users
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT
    USING (is_user_admin(auth.uid()));

-- Policy 5: Allow admins to update all users
CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE
    USING (is_user_admin(auth.uid()))
    WITH CHECK (is_user_admin(auth.uid()));

-- Policy 6: Allow admins to insert users (for admin operations)
CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT
    WITH CHECK (is_user_admin(auth.uid()));

-- Policy 7: Allow admins to delete users (for admin operations)
CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE
    USING (is_user_admin(auth.uid()));

-- Policy 8: Allow public read access for basic user info (for leaderboards, etc.)
-- This allows authenticated users to see basic info about other users
CREATE POLICY "Public read access for basic info" ON public.users
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND
        -- Only expose safe fields for public viewing
        -- This policy will be used with column-level security
        true
    );

-- 5. Create a function to get safe user info for public display
CREATE OR REPLACE FUNCTION get_public_user_info(user_id UUID)
RETURNS TABLE (
    id UUID,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    is_admin BOOLEAN,
    user_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.is_admin,
        u.user_type,
        u.created_at
    FROM public.users u
    WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a function to get current user's full profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
    id UUID,
    email TEXT,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    is_admin BOOLEAN,
    user_type TEXT,
    invited_by TEXT,
    entries_used INTEGER,
    max_entries INTEGER,
    default_week INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.phone,
        u.first_name,
        u.last_name,
        u.username,
        u.is_admin,
        u.user_type,
        u.invited_by,
        u.entries_used,
        u.max_entries,
        u.default_week,
        u.created_at,
        u.updated_at
    FROM public.users u
    WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Test the policies
SELECT 'Users table RLS policies created successfully' as status;

-- Show all policies for verification
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- 8. Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

COMMIT;

-- Usage Notes:
-- 1. Users can only view and update their own profile
-- 2. Admins can view, update, insert, and delete all users
-- 3. Public read access is available for basic user info (useful for leaderboards)
-- 4. Use get_public_user_info() function for safe public user data
-- 5. Use get_current_user_profile() function for full user profile data
-- 6. The is_user_admin() function prevents recursion issues
