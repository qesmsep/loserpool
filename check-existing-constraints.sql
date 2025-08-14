-- Check existing constraints on matchups table
-- Run this first to see what already exists

-- Check if season column exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'matchups' 
AND table_schema = 'public'
AND column_name = 'season';

-- Check existing constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.matchups'::regclass
ORDER BY conname;

-- Check existing indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'matchups' 
AND schemaname = 'public'
ORDER BY indexname;

-- Check if the ordering function exists
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'get_season_order';

-- Show current season data (if any)
SELECT 
    week,
    season,
    COUNT(*) as game_count
FROM public.matchups 
WHERE season IS NOT NULL
GROUP BY week, season
ORDER BY week, season
LIMIT 20;
