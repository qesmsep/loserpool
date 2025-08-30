-- Temporarily Disable RLS for Password Reset Testing
-- Run this in Supabase SQL Editor

-- Disable RLS on users table temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 'RLS disabled:' as status, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Test the password reset now
-- The password reset should work without RLS blocking it

-- IMPORTANT: Re-enable RLS after testing by running:
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
