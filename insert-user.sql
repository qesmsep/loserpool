-- Manual User Insert Script
-- Run this in Supabase SQL Editor to manually create a user profile

-- Insert the user that was just created (replace with your actual email)
INSERT INTO users (id, email, username, is_admin) 
VALUES ('04777ec2-60f9-45db-ae99-5b0e3bbc111e', 'your-email@example.com', NULL, FALSE);

-- Verify the insert worked
SELECT * FROM users WHERE id = '04777ec2-60f9-45db-ae99-5b0e3bbc111e';

-- Make yourself admin (replace with your email)
-- UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com'; 