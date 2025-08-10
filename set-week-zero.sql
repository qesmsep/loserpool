-- Set current week to 0 for testing Week Zero functionality

-- Update the current week setting to 0
UPDATE global_settings 
SET value = '0' 
WHERE key = 'current_week';

-- Verify the change
SELECT 
    'Current Week Updated' as status,
    key,
    value,
    description
FROM global_settings 
WHERE key = 'current_week';

-- Show all global settings
SELECT 
    'All Global Settings' as info,
    key,
    value,
    description
FROM global_settings
ORDER BY key;
