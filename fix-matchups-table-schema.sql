-- Fix Matchups Table Schema
-- Add missing columns to match the TypeScript interface

-- Add season column to matchups table
ALTER TABLE matchups 
ADD COLUMN IF NOT EXISTS season TEXT DEFAULT 'REG1';

-- Add venue column to matchups table (if it doesn't exist)
ALTER TABLE matchups 
ADD COLUMN IF NOT EXISTS venue TEXT;

-- Update existing matchups to have a default season
UPDATE matchups 
SET season = 'REG1' 
WHERE season IS NULL;

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'matchups'
ORDER BY ordinal_position;

-- Show sample data
SELECT 
    id,
    week,
    away_team,
    home_team,
    season,
    venue,
    game_time,
    status
FROM matchups 
LIMIT 5;
