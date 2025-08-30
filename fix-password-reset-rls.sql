-- Fix Password Reset RLS Issue
-- Run this in Supabase SQL Editor

-- First, let's check the current RLS status
SELECT 'Current RLS status:' as status, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Check current policies on users table
SELECT 'Current policies:' as status, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Option 1: Temporarily disable RLS for password reset testing
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Option 2: Add a policy that allows password reset operations
-- This policy allows users to update their own profile during password reset
CREATE POLICY "Allow password reset updates" ON public.users
  FOR UPDATE USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = users.email
    )
  );

-- Option 3: Create a more permissive policy for auth operations
CREATE POLICY "Allow auth operations" ON public.users
  FOR ALL USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

-- Check if the user exists in both tables
SELECT 'User check:' as status,
       CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'tim@828.life') 
            THEN 'EXISTS IN AUTH' 
            ELSE 'NOT IN AUTH' 
       END as auth_status,
       CASE WHEN EXISTS (SELECT 1 FROM users WHERE email = 'tim@828.life') 
            THEN 'EXISTS IN USERS' 
            ELSE 'NOT IN USERS' 
       END as users_status;

-- Show the specific user details
SELECT 'Auth user details:' as status, id, email, created_at 
FROM auth.users 
WHERE email = 'tim@828.life';

SELECT 'Users table details:' as status, id, email, created_at 
FROM users 
WHERE email = 'tim@828.life';

-- If the user doesn't exist in users table, create it
INSERT INTO users (id, email, username, is_admin)
SELECT 
  au.id,
  au.email,
  NULL as username,
  FALSE as is_admin
FROM auth.users au
WHERE au.email = 'tim@828.life'
ON CONFLICT (id) DO NOTHING;

-- Verify the fix
SELECT 'After fix - User exists in users table:' as status,
       CASE WHEN EXISTS (SELECT 1 FROM users WHERE email = 'tim@828.life') 
            THEN 'YES' 
            ELSE 'NO' 
       END as exists;
