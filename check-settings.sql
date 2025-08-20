-- Check current global settings
SELECT 'Current Global Settings' as info, key, value FROM global_settings ORDER BY key;

-- Check if there are any settings with pick_price
SELECT 'Pick Price Settings' as info, key, value FROM global_settings WHERE key LIKE '%pick%' OR key LIKE '%price%';

-- Check all settings that might be related to pricing
SELECT 'All Settings' as info, key, value FROM global_settings;
