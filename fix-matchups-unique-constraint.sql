-- Fix unique constraint on matchups table
-- Change from (week, away_team, home_team) to (season, away_team, home_team)

-- Drop the existing unique constraint
ALTER TABLE public.matchups 
DROP CONSTRAINT IF EXISTS matchups_week_away_team_home_team_key;

-- Add the new unique constraint using season
ALTER TABLE public.matchups 
ADD CONSTRAINT unique_matchup_season_teams 
UNIQUE (season, away_team, home_team);

-- Verify the constraint was created
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.matchups'::regclass 
AND contype = 'u';

-- Test that the constraint works
-- This should allow the same teams to play in different seasons
-- but prevent duplicate matchups within the same season
