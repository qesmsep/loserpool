-- Add All Missing Settings to Global Settings
-- Run this in your Supabase SQL editor

-- Insert all the missing settings that the admin rules page expects
INSERT INTO global_settings (key, value) VALUES 
  -- Auto Random Picks Settings
  ('auto_random_picks', 'false'),
  ('random_pick_strategy', 'best_odds_losing'),
  
  -- Pick Type and Handling
  ('pick_type', 'loser'),
  ('tie_handling', 'elimination'),
  
  -- Pricing and Limits
  ('pick_price', '21'),
  ('max_picks_per_user', '10'),
  ('max_total_picks', '2100'),
  
  -- Game Settings
  ('lock_time', 'Thursday'),
  ('elimination_type', 'immediate'),
  ('allow_multiple_picks_per_game', 'true'),
  ('allow_pick_changes', 'true'),
  ('pick_change_deadline', 'Thursday'),
  
  -- Prize Distribution
  ('prize_distribution', 'even_split')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify all settings were added
SELECT key, value, updated_at 
FROM global_settings 
WHERE key IN (
  'auto_random_picks', 'random_pick_strategy', 'pick_type', 'tie_handling',
  'pick_price', 'max_picks_per_user', 'max_total_picks', 'lock_time',
  'elimination_type', 'allow_multiple_picks_per_game', 'allow_pick_changes',
  'pick_change_deadline', 'prize_distribution'
)
ORDER BY key;
