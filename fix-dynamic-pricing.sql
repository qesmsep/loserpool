-- Fix Dynamic Pricing Settings
-- This script ensures the pick price is properly set and controlled by admin settings

-- 1. Check current pick_price setting
SELECT 'Current pick_price setting' as info, key, value FROM global_settings WHERE key = 'pick_price';

-- 2. Update pick_price to 21 (the correct value from admin settings)
INSERT INTO global_settings (key, value) 
VALUES ('pick_price', '21')
ON CONFLICT (key) 
DO UPDATE SET value = '21';

-- 3. Verify the update
SELECT 'Updated pick_price setting' as info, key, value FROM global_settings WHERE key = 'pick_price';

-- 4. Ensure all required settings exist with correct values
INSERT INTO global_settings (key, value) 
VALUES 
  ('max_total_entries', '2100'),
  ('entries_per_user', '10'),
  ('pick_type', 'loser'),
  ('tie_handling', 'elimination'),
  ('lock_time', 'Thursday'),
  ('max_picks_per_user', '10'),
  ('max_total_picks', '2100'),
  ('prize_distribution', 'winner_takes_all'),
  ('elimination_type', 'immediate'),
  ('allow_multiple_picks_per_game', 'true'),
  ('allow_pick_changes', 'true'),
  ('pick_change_deadline', 'Thursday'),
  ('auto_random_picks', 'false'),
  ('random_pick_strategy', 'best_odds_losing')
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value;

-- 5. Show all current settings
SELECT 'All global settings' as info, key, value FROM global_settings ORDER BY key;

-- 6. Fix the pending purchase record that was created with wrong amount
UPDATE purchases 
SET amount_paid = 2100 
WHERE id = 'ece834b3-105e-4b64-b2a3-fb8cd464154e' 
  AND stripe_session_id = 'cs_live_a1pZk0HRH98W6KOrXaVL2Qru30IZu7ZGqNFdklTZIwXzTnw45kiXx0RTBg'
  AND status = 'pending';

-- 7. Verify the purchase record was fixed
SELECT 'Fixed purchase record' as info, id, user_id, stripe_session_id, amount_paid, picks_count, status 
FROM purchases 
WHERE id = 'ece834b3-105e-4b64-b2a3-fb8cd464154e';
