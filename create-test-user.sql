-- Create Test User Manually
-- Run this in Supabase SQL Editor

-- First, let's create a test auth user (this might not work due to Supabase restrictions)
-- But we can try to create a user profile directly

-- Create a user profile with a test ID
INSERT INTO users (id, email, username, is_admin) 
VALUES (
  'test-user-123', 
  'test@example.com', 
  'testuser', 
  TRUE
);

-- Verify it was created
SELECT 'Test user created:' as status, id, email, username, is_admin, created_at 
FROM users 
WHERE id = 'test-user-123';

-- Show all users
SELECT 'All users:' as status, id, email, username, is_admin, created_at 
FROM users 
ORDER BY created_at DESC;

-- Note: You'll need to create the auth user through the Supabase dashboard
-- or through your application signup process 