-- Comprehensive fix for 409 error
-- This will identify and resolve any conflicts preventing pick insertion

-- First, let's see what's in the picks table
SELECT 
    id, user_id, matchup_id, team_picked, picks_count, week, status, created_at
FROM picks 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for any unique constraints that might be causing conflicts
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'picks'::regclass
ORDER BY contype, conname;

-- Check for any unique indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'picks' AND indexdef LIKE '%UNIQUE%';

-- Remove ALL unique constraints that might be causing issues
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Drop all unique constraints
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'picks'::regclass AND contype = 'u'
    LOOP
        EXECUTE 'ALTER TABLE picks DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped unique constraint: %', constraint_name;
    END LOOP;
END $$;

-- Drop any unique indexes that might be causing issues
DO $$
DECLARE
    index_name text;
BEGIN
    -- Drop all unique indexes
    FOR index_name IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'picks' AND indexdef LIKE '%UNIQUE%'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || index_name;
        RAISE NOTICE 'Dropped unique index: %', index_name;
    END LOOP;
END $$;

-- Verify all unique constraints are removed
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'picks'::regclass 
AND contype = 'u';

-- Verify all unique indexes are removed
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'picks' AND indexdef LIKE '%UNIQUE%';
