-- Set pick price to 1 as intended by the user
-- This ensures the dynamic pricing works correctly

-- Check current setting
SELECT 'Current pick_price setting' as info, key, value FROM global_settings WHERE key = 'pick_price';

-- Set pick_price to 1
INSERT INTO global_settings (key, value) 
VALUES ('pick_price', '1')
ON CONFLICT (key) 
DO UPDATE SET value = '1';

-- Verify the setting
SELECT 'Updated pick_price setting' as info, key, value FROM global_settings WHERE key = 'pick_price';

-- Show all settings to verify
SELECT 'All settings' as info, key, value FROM global_settings ORDER BY key;
