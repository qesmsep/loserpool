-- Fix picks table schema to match application expectations
-- This migration adds the missing columns needed by the dashboard

-- Add picks_count column if it doesn't exist
ALTER TABLE picks ADD COLUMN IF NOT EXISTS picks_count INTEGER DEFAULT 1;

-- Add team_picked column if it doesn't exist
ALTER TABLE picks ADD COLUMN IF NOT EXISTS team_picked TEXT;

-- Update existing records to have proper values
UPDATE picks 
SET 
  picks_count = 1,
  team_picked = CASE 
    WHEN selected_team = 'away' THEN (
      SELECT away_team FROM matchups WHERE matchups.id = picks.matchup_id
    )
    WHEN selected_team = 'home' THEN (
      SELECT home_team FROM matchups WHERE matchups.id = picks.matchup_id
    )
    ELSE NULL
  END
WHERE team_picked IS NULL;

-- Make team_picked NOT NULL after updating existing records
ALTER TABLE picks ALTER COLUMN team_picked SET NOT NULL;

-- Update status values to match application expectations
UPDATE picks SET status = 'active' WHERE status = 'pending';

-- Add constraint to ensure picks_count is positive
ALTER TABLE picks ADD CONSTRAINT picks_count_positive CHECK (picks_count > 0);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_picks_user_matchup ON picks(user_id, matchup_id);
