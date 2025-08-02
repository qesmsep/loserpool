-- Check Users Script
-- Run this in Supabase SQL Editor to see what's in your database

-- Check if users table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
) as users_table_exists;

-- Check all users in the users table
SELECT id, email, username, is_admin, created_at 
FROM users 
ORDER BY created_at DESC;

-- Check auth users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Check if triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%';

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Manual insert for testing (replace with your user ID)
-- INSERT INTO users (id, email, username, is_admin) 
-- VALUES ('04777ec2-60f9-45db-ae99-5b0e3bbc111e', 'your-email@example.com', NULL, FALSE); 