-- Fix Tester to Active Transition Issue
-- This script fixes users who were moved from Tester to Active but still have default_week = 3
-- Run this in your Supabase SQL Editor

-- First, let's see which users are affected
SELECT 'Users with Tester to Active transition issue:' as status, 
       id, 
       email, 
       user_type, 
       default_week,
       is_admin,
       created_at
FROM users 
WHERE user_type = 'active' 
  AND default_week = 3 
  AND is_admin = FALSE
ORDER BY created_at DESC;

-- Fix the issue by clearing default_week for active users who have it set to 3
UPDATE users 
SET default_week = NULL
WHERE user_type = 'active' 
  AND default_week = 3 
  AND is_admin = FALSE;

-- Verify the fix
SELECT 'Users after fix:' as status, 
       id, 
       email, 
       user_type, 
       default_week,
       is_admin,
       created_at
FROM users 
WHERE user_type = 'active' 
  AND is_admin = FALSE
ORDER BY created_at DESC;

-- Show summary of the fix
SELECT 'Fix Summary:' as status,
       COUNT(*) as users_fixed
FROM users 
WHERE user_type = 'active' 
  AND default_week IS NULL 
  AND is_admin = FALSE;
