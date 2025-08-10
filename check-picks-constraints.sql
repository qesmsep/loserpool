-- Check for unique constraints on the picks table
-- This will help identify what's causing the 409 conflict error

-- Check all constraints on the picks table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'picks'::regclass
ORDER BY contype, conname;

-- Check for unique indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'picks' AND indexdef LIKE '%UNIQUE%';

-- Check if there's a unique constraint on user_id + matchup_id
-- This would prevent multiple picks per user per matchup
SELECT 
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'picks'::regclass 
AND pg_get_constraintdef(oid) LIKE '%user_id%' 
AND pg_get_constraintdef(oid) LIKE '%matchup_id%';
