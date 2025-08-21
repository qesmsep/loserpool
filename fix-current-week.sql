-- Fix Current Week Setting
-- Update the current_week from 3 to 1 so users see Regular Season Week 1 games

-- Check current setting
SELECT 'Current setting:' as status, key, value 
FROM global_settings 
WHERE key = 'current_week';

-- Update to Week 1
UPDATE global_settings 
SET value = '1', updated_at = NOW()
WHERE key = 'current_week';

-- Verify the change
SELECT 'Updated setting:' as status, key, value, updated_at
FROM global_settings 
WHERE key = 'current_week';

-- Show what this means for users
SELECT 'Impact:' as status,
       'Active users will now see Regular Season Week 1 games' as description,
       'Tester users will still see Preseason Week 3 games (until 8/26/25)' as tester_behavior;
