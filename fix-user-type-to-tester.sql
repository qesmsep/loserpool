-- Fix User Type - Set to Tester
-- This script sets Tim's user type back to tester so he can see preseason games

-- Check current user type
SELECT 'Current user data:' as status, 
       id, email, user_type, is_admin
FROM users 
WHERE id = 'a459c3a2-7393-4e0b-9d11-85f052a3650f';

-- Update user type to tester
UPDATE users 
SET user_type = 'tester', updated_at = NOW()
WHERE id = 'a459c3a2-7393-4e0b-9d11-85f052a3650f';

-- Verify the change
SELECT 'Updated user data:' as status, 
       id, email, user_type, is_admin, updated_at
FROM users 
WHERE id = 'a459c3a2-7393-4e0b-9d11-85f052a3650f';

-- Show what this means
SELECT 'Impact:' as status,
       'User will now see Preseason Week 3 games' as description,
       'User type changed from active to tester' as change_made,
       'As a tester, user sees preseason games until after 8/26/25' as behavior;
