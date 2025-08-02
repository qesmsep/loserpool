-- Manual User Creation Script
-- Run this in Supabase SQL Editor

-- Replace 'your-email@example.com' with your actual email
INSERT INTO users (id, email, username, is_admin) 
VALUES ('04777ec2-60f9-45db-ae99-5b0e3bbc111e', 'your-email@example.com', NULL, FALSE);

-- Make yourself admin
UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';

-- Verify it worked
SELECT * FROM users WHERE id = '04777ec2-60f9-45db-ae99-5b0e3bbc111e'; 