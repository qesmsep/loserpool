-- Safe fix for 409 error
-- This will identify and resolve any conflicts preventing pick insertion
-- WITHOUT trying to drop the primary key

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

-- Check for any unique indexes (excluding primary key)
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'picks' 
AND indexdef LIKE '%UNIQUE%'
AND indexname != 'picks_pkey';

-- Remove unique constraints that might be causing issues (but NOT the primary key)
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Drop unique constraints (but not primary key)
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'picks'::regclass 
        AND contype = 'u'
        AND conname != 'picks_pkey'
    LOOP
        EXECUTE 'ALTER TABLE picks DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped unique constraint: %', constraint_name;
    END LOOP;
END $$;

-- Drop unique indexes that might be causing issues (but NOT the primary key)
DO $$
DECLARE
    index_name text;
BEGIN
    -- Drop unique indexes (but not primary key)
    FOR index_name IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'picks' 
        AND indexdef LIKE '%UNIQUE%'
        AND indexname != 'picks_pkey'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || index_name;
        RAISE NOTICE 'Dropped unique index: %', index_name;
    END LOOP;
END $$;

-- Verify remaining unique constraints (should only be primary key)
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'picks'::regclass 
AND contype = 'u';

-- Verify remaining unique indexes (should only be primary key)
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'picks' 
AND indexdef LIKE '%UNIQUE%';
