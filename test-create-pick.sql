-- Test Creating a Pick Manually
-- This will help us see what error occurs when trying to create a pick

-- Try to create a test pick with the current constraints
INSERT INTO picks (
  user_id,
  matchup_id,
  team_picked,
  picks_count,
  status,
  pick_name,
  week,
  created_at,
  updated_at
) VALUES (
  'a459c3a2-7393-4e0b-9d11-85f052a3650f', -- your user ID
  NULL,
  NULL,
  1,
  'pending',
  'Test Pick 1',
  1,
  NOW(),
  NOW()
);

-- If the above fails, let's see what the error is
-- If it succeeds, let's clean it up
DELETE FROM picks WHERE pick_name = 'Test Pick 1';
