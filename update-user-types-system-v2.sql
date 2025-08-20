-- Update User Type System v2 - Simple and Safe Version
-- Run this in Supabase SQL Editor

-- Step 1: Drop the constraint FIRST to avoid violations during updates
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Step 2: Show current state
SELECT 'Current user types:' as status, 
       COUNT(*) as count,
       user_type,
       is_admin
FROM users 
GROUP BY user_type, is_admin
ORDER BY user_type, is_admin;

-- Step 3: Update all users to valid types (no constraint to violate)
UPDATE users 
SET user_type = CASE 
  WHEN is_admin = TRUE THEN 'tester'
  WHEN user_type = 'regular' THEN 'pending'
  WHEN user_type = 'tester' THEN 'tester'
  WHEN user_type = 'active' THEN 'active'
  WHEN user_type = 'eliminated' THEN 'eliminated'
  WHEN user_type = 'pending' THEN 'pending'
  WHEN user_type IS NULL THEN 'pending'
  ELSE 'pending'
END;

-- Step 4: Show updated state
SELECT 'After update - user types:' as status, 
       COUNT(*) as count,
       user_type,
       is_admin
FROM users 
GROUP BY user_type, is_admin
ORDER BY user_type, is_admin;

-- Step 5: Add the new constraint
ALTER TABLE users 
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('pending', 'active', 'tester', 'eliminated'));

-- Step 6: Add default_week column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS default_week INTEGER DEFAULT 1;

-- Step 7: Update default week based on user type
UPDATE users 
SET default_week = CASE 
  WHEN user_type = 'tester' THEN 0  -- Testers see preseason (week 0)
  ELSE 1  -- Everyone else sees regular season week 1
END;

-- Step 8: Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  picks_remaining INTEGER NOT NULL DEFAULT 0,
  picks_eliminated INTEGER NOT NULL DEFAULT 0,
  total_picks_started INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  eliminated_at_week INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week)
);

-- Step 9: Create indexes for leaderboard
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_week ON leaderboard(week);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(week, rank);

-- Step 10: Create function to update user type on purchase
CREATE OR REPLACE FUNCTION update_user_type_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE users 
    SET user_type = 'active'
    WHERE id = NEW.user_id 
    AND user_type = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM users 
      WHERE id = NEW.user_id 
      AND is_admin = TRUE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create trigger for purchases
DROP TRIGGER IF EXISTS update_user_type_on_purchase_complete ON purchases;
CREATE TRIGGER update_user_type_on_purchase_complete
  AFTER INSERT OR UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_user_type_on_purchase();

-- Step 12: Create function to update user type based on picks
CREATE OR REPLACE FUNCTION update_user_type_based_on_picks()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET user_type = CASE 
    WHEN EXISTS (
      SELECT 1 FROM picks 
      WHERE user_id = NEW.user_id 
      AND status = 'active'
    ) THEN 'active'
    WHEN EXISTS (
      SELECT 1 FROM picks 
      WHERE user_id = NEW.user_id 
      AND status = 'eliminated'
    ) AND NOT EXISTS (
      SELECT 1 FROM picks 
      WHERE user_id = NEW.user_id 
      AND status = 'active'
    ) THEN 'eliminated'
    ELSE 'active'
  END
  WHERE id = NEW.user_id
  AND user_type != 'tester';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create trigger for picks
DROP TRIGGER IF EXISTS update_user_type_on_pick_change ON picks;
CREATE TRIGGER update_user_type_on_pick_change
  AFTER INSERT OR UPDATE OR DELETE ON picks
  FOR EACH ROW EXECUTE FUNCTION update_user_type_based_on_picks();

-- Step 14: Create function to get user default week
CREATE OR REPLACE FUNCTION get_user_default_week(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  user_type_val TEXT;
  is_admin_val BOOLEAN;
BEGIN
  SELECT u.user_type, u.is_admin INTO user_type_val, is_admin_val
  FROM users u
  WHERE u.id = user_id;
  
  IF user_type_val = 'tester' OR is_admin_val THEN
    RETURN 0;
  ELSE
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Create function to update leaderboard
CREATE OR REPLACE FUNCTION update_leaderboard_for_week(week_number INTEGER)
RETURNS VOID AS $$
BEGIN
  DELETE FROM leaderboard WHERE week = week_number;
  
  INSERT INTO leaderboard (user_id, week, picks_remaining, picks_eliminated, total_picks_started, rank, eliminated_at_week)
  SELECT 
    u.id as user_id,
    week_number as week,
    COALESCE(active_picks.picks_count, 0) as picks_remaining,
    COALESCE(eliminated_picks.picks_count, 0) as picks_eliminated,
    COALESCE(total_picks.picks_count, 0) as total_picks_started,
    ROW_NUMBER() OVER (
      ORDER BY 
        COALESCE(active_picks.picks_count, 0) DESC,
        u.created_at ASC
    ) as rank,
    CASE 
      WHEN COALESCE(active_picks.picks_count, 0) = 0 
      AND COALESCE(eliminated_picks.picks_count, 0) > 0 
      THEN week_number
      ELSE NULL
    END as eliminated_at_week
  FROM users u
  LEFT JOIN (
    SELECT user_id, SUM(picks_count) as picks_count
    FROM picks 
    WHERE status = 'active'
    GROUP BY user_id
  ) active_picks ON u.id = active_picks.user_id
  LEFT JOIN (
    SELECT user_id, SUM(picks_count) as picks_count
    FROM picks 
    WHERE status = 'eliminated'
    GROUP BY user_id
  ) eliminated_picks ON u.id = eliminated_picks.user_id
  LEFT JOIN (
    SELECT user_id, SUM(picks_count) as picks_count
    FROM picks 
    GROUP BY user_id
  ) total_picks ON u.id = total_picks.user_id
  WHERE u.user_type != 'tester'
  AND u.user_type != 'pending'
  AND COALESCE(total_picks.picks_count, 0) > 0;
END;
$$ LANGUAGE plpgsql;

-- Step 16: Final verification
SELECT 'Final verification - Users with new types:' as status, 
       id, email, username, is_admin, user_type, default_week, created_at 
FROM users 
ORDER BY created_at DESC;

SELECT 'Leaderboard table created successfully' as status;
