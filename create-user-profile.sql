-- Create User Profile Script
-- Run this in Supabase SQL Editor

-- First, let's check if the auth user exists
SELECT 'Auth user exists:' as status, id, email, created_at 
FROM auth.users 
WHERE id = '04777ec2-60f9-45db-ae99-5b0e3bbc111e';

-- If the auth user exists, create the profile
-- Replace 'your-email@example.com' with your actual email
DO $$
BEGIN
  -- Check if auth user exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '04777ec2-60f9-45db-ae99-5b0e3bbc111e') THEN
    -- Create user profile
    INSERT INTO users (id, email, username, is_admin) 
    VALUES ('04777ec2-60f9-45db-ae99-5b0e3bbc111e', 'your-email@example.com', NULL, FALSE)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'User profile created successfully';
  ELSE
    RAISE NOTICE 'Auth user does not exist yet. Please wait a moment and try again.';
  END IF;
END $$;

-- Verify the user was created
SELECT 'User profile:' as status, id, email, username, is_admin, created_at 
FROM users 
WHERE id = '04777ec2-60f9-45db-ae99-5b0e3bbc111e';

-- Make yourself admin (replace with your email)
UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';

-- Show all users
SELECT 'All users:' as status, id, email, username, is_admin, created_at 
FROM users 
ORDER BY created_at DESC; 