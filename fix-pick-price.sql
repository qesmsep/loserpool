-- Fix the pick price setting
-- First, check if the setting exists
SELECT 'Current pick_price setting' as info, key, value FROM global_settings WHERE key = 'pick_price';

-- Insert or update the pick_price setting to 21
INSERT INTO global_settings (key, value) 
VALUES ('pick_price', '21')
ON CONFLICT (key) 
DO UPDATE SET value = '21';

-- Verify the fix
SELECT 'Updated pick_price setting' as info, key, value FROM global_settings WHERE key = 'pick_price';

-- Also ensure other required settings exist
INSERT INTO global_settings (key, value) 
VALUES 
  ('max_total_entries', '2100'),
  ('entries_per_user', '10')
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value;

-- Show all settings
SELECT 'All global settings' as info, key, value FROM global_settings ORDER BY key;
