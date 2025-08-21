-- Remove default_week column from users table
-- This script removes the default_week column since we're now using the new season detection system

-- First, let's see what data we have in the default_week column
SELECT 'Current default_week values:' as status,
       COUNT(*) as total_users,
       COUNT(CASE WHEN default_week IS NULL THEN 1 END) as null_values,
       COUNT(CASE WHEN default_week = 1 THEN 1 END) as week_1_users,
       COUNT(CASE WHEN default_week = 3 THEN 1 END) as week_3_users,
       COUNT(CASE WHEN default_week NOT IN (1, 3) THEN 1 END) as other_weeks
FROM users;

-- Show some examples of users with different default_week values
SELECT 'Sample users with default_week values:' as status,
       id,
       email,
       user_type,
       is_admin,
       default_week,
       created_at
FROM users 
WHERE default_week IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Remove the default_week column
ALTER TABLE users DROP COLUMN IF EXISTS default_week;

-- Verify the column was removed
SELECT 'Column removal verification:' as status,
       column_name,
       data_type
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name = 'default_week';

-- Show final table structure
SELECT 'Final users table structure:' as status,
       column_name,
       data_type,
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Summary
SELECT 'Migration Summary:' as status,
       'default_week column removed' as action,
       'New season detection system will handle week determination' as note,
       'Users will now see games based on their user_type and current date' as behavior;
