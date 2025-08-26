-- Fix Database Schema Mismatch
-- This script aligns the database schema with the TypeScript interfaces

-- 1. Fix Matchups Table
-- Add missing columns to matchups table
ALTER TABLE matchups 
ADD COLUMN IF NOT EXISTS season TEXT DEFAULT 'REG1';

ALTER TABLE matchups 
ADD COLUMN IF NOT EXISTS venue TEXT;

-- Update existing matchups to have a default season
UPDATE matchups 
SET season = 'REG1' 
WHERE season IS NULL;

-- 2. Fix Picks Table
-- Add missing columns to picks table to match TypeScript interface
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS pick_name TEXT;

ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add all the week-specific team matchup ID columns
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS pre1_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS pre2_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS pre3_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg1_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg2_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg3_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg4_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg5_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg6_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg7_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg8_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg9_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg10_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg11_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg12_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg13_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg14_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg15_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg16_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg17_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS reg18_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS post1_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS post2_team_matchup_id TEXT,
ADD COLUMN IF NOT EXISTS post3_team_matchup_id TEXT;

-- 3. Verify the changes
SELECT 
    'matchups' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'matchups'
ORDER BY ordinal_position;

SELECT 
    'picks' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'picks'
ORDER BY ordinal_position;

-- 4. Show sample data to verify
SELECT 
    'matchups_sample' as info,
    id,
    week,
    away_team,
    home_team,
    season,
    venue,
    game_time,
    status
FROM matchups 
LIMIT 3;

SELECT 
    'picks_sample' as info,
    id,
    user_id,
    matchup_id,
    team_picked,
    picks_count,
    status,
    pick_name,
    reg1_team_matchup_id
FROM picks 
LIMIT 3;
