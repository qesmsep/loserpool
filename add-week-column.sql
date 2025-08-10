-- Add week column to picks table
-- This is essential for distinguishing picks across multiple weeks

-- Add week column if it doesn't exist
ALTER TABLE picks ADD COLUMN IF NOT EXISTS week INTEGER;

-- Update existing picks to have the correct week based on their matchup
UPDATE picks 
SET week = (
  SELECT week FROM matchups WHERE matchups.id = picks.matchup_id
)
WHERE week IS NULL;

-- Make week NOT NULL after updating existing records
ALTER TABLE picks ALTER COLUMN week SET NOT NULL;

-- Add index for better performance on week queries
CREATE INDEX IF NOT EXISTS idx_picks_user_week ON picks(user_id, week);

-- Display the updated schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'picks' 
ORDER BY ordinal_position;
