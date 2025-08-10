-- Fix the status constraint issue
-- First, let's see what the current constraint is

-- Check existing constraints on the picks table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'picks'::regclass;

-- Check what values are currently in the status column
SELECT DISTINCT status FROM picks;

-- Check what values the application is trying to insert
-- The app is trying to insert 'active' status

-- Let's see if we need to update the constraint to allow 'active'
-- First, let's drop the existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'picks_status_check'
    ) THEN
        ALTER TABLE picks DROP CONSTRAINT picks_status_check;
    END IF;
END $$;

-- Now add a new constraint that allows the values we need
ALTER TABLE picks ADD CONSTRAINT picks_status_check 
CHECK (status IN ('pending', 'active', 'eliminated', 'safe'));

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'picks'::regclass AND conname = 'picks_status_check';
