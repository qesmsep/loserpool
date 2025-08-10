-- Fix unique constraint issues that might be causing 409 errors
-- This will remove any unique constraints that prevent multiple picks per user per matchup

-- First, let's see what unique constraints exist
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'picks'::regclass 
AND contype = 'u';

-- Remove any unique constraints that might be causing issues
-- (We'll add them back later if needed, but for now we want to allow multiple picks per user per matchup)

-- Drop unique constraint on user_id + matchup_id if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'picks'::regclass 
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%user_id%'
        AND pg_get_constraintdef(oid) LIKE '%matchup_id%'
    ) THEN
        -- We'll need to find the exact constraint name first
        -- For now, let's just drop all unique constraints
        EXECUTE (
            'ALTER TABLE picks DROP CONSTRAINT ' || 
            (SELECT conname FROM pg_constraint 
             WHERE conrelid = 'picks'::regclass 
             AND contype = 'u'
             AND pg_get_constraintdef(oid) LIKE '%user_id%'
             AND pg_get_constraintdef(oid) LIKE '%matchup_id%'
             LIMIT 1)
        );
    END IF;
END $$;

-- Verify the constraint was removed
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'picks'::regclass 
AND contype = 'u';
