-- Complete fix for picks table schema transition
-- This handles the migration from old schema to new schema

-- First, ensure we have the new columns
ALTER TABLE picks ADD COLUMN IF NOT EXISTS picks_count INTEGER DEFAULT 1;
ALTER TABLE picks ADD COLUMN IF NOT EXISTS team_picked TEXT;

-- Update existing records to populate team_picked from selected_team
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

-- Now we can safely make selected_team nullable since we're using team_picked
ALTER TABLE picks ALTER COLUMN selected_team DROP NOT NULL;

-- Add constraint to ensure picks_count is positive (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'picks_count_positive'
    ) THEN
        ALTER TABLE picks ADD CONSTRAINT picks_count_positive CHECK (picks_count > 0);
    END IF;
END $$;

-- Add index for better performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_picks_user_matchup ON picks(user_id, matchup_id);

-- Display the current schema to verify
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'picks' 
ORDER BY ordinal_position;
