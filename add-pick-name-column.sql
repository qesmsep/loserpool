-- Add pick_name column to picks table
ALTER TABLE picks 
ADD COLUMN pick_name TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN picks.pick_name IS 'The name of the pick (e.g., "My First Pick", "Week 1 Pick") that will be displayed in the team card';
