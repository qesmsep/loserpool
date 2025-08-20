-- Update User Type System
-- Run this in Supabase SQL Editor

-- First, check if the column exists and update the constraint
DO $$
BEGIN
  -- Update the user_type column constraint to new values
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'user_type'
  ) THEN
    -- Drop the old constraint if it exists
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
    
    -- Add new constraint with updated values
    ALTER TABLE users 
    ADD CONSTRAINT users_user_type_check 
    CHECK (user_type IN ('active', 'tester', 'eliminated'));
    
    RAISE NOTICE 'Updated user_type constraint to new values';
  ELSE
    -- Add the column if it doesn't exist
    ALTER TABLE users 
    ADD COLUMN user_type TEXT DEFAULT 'active' 
    CHECK (user_type IN ('active', 'tester', 'eliminated'));
    
    RAISE NOTICE 'Added user_type column with new values';
  END IF;
END $$;

-- Update existing users based on their current state
-- First, let's see what we have
SELECT 'Current user states:' as status, 
       COUNT(*) as count,
       user_type,
       is_admin
FROM users 
GROUP BY user_type, is_admin
ORDER BY user_type, is_admin;

-- Update user types based on current state
UPDATE users 
SET user_type = CASE 
  WHEN is_admin = TRUE THEN 'tester'  -- Admins are testers
  WHEN user_type IS NULL THEN 'active'  -- Default to active
  WHEN user_type = 'regular' THEN 'active'  -- Convert old 'regular' to 'active'
  WHEN user_type = 'tester' THEN 'tester'  -- Keep existing testers
  ELSE 'active'  -- Default fallback
END;

-- Create leaderboard table
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

-- Create index for leaderboard performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_week ON leaderboard(week);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(week, rank);

-- Function to update user type based on picks status
CREATE OR REPLACE FUNCTION update_user_type_based_on_picks()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user type based on picks status
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
    ELSE 'active'  -- Default fallback
  END
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update user type when picks change
DROP TRIGGER IF EXISTS update_user_type_on_pick_change ON picks;
CREATE TRIGGER update_user_type_on_pick_change
  AFTER INSERT OR UPDATE OR DELETE ON picks
  FOR EACH ROW EXECUTE FUNCTION update_user_type_based_on_picks();

-- Function to update leaderboard
CREATE OR REPLACE FUNCTION update_leaderboard_for_week(week_number INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Delete existing leaderboard entries for this week
  DELETE FROM leaderboard WHERE week = week_number;
  
  -- Insert new leaderboard entries
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
  WHERE u.user_type != 'tester'  -- Exclude testers from leaderboard
  AND COALESCE(total_picks.picks_count, 0) > 0;  -- Only include users with picks
END;
$$ language 'plpgsql';

-- Show the updated structure
SELECT 'Users with new types:' as status, id, email, username, is_admin, user_type, created_at 
FROM users 
ORDER BY created_at DESC;

-- Show leaderboard table structure
SELECT 'Leaderboard table created:' as status, 
       column_name, 
       data_type, 
       is_nullable, 
       column_default
FROM information_schema.columns 
WHERE table_name = 'leaderboard' 
ORDER BY ordinal_position;
