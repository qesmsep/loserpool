-- Make picks_count NOT NULL since it should always have a value
-- This ensures data integrity

-- First, update any NULL picks_count values to 1
UPDATE picks SET picks_count = 1 WHERE picks_count IS NULL;

-- Then make the column NOT NULL
ALTER TABLE picks ALTER COLUMN picks_count SET NOT NULL;

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'picks' AND column_name = 'picks_count';
