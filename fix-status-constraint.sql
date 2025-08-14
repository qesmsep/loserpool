-- Fix status constraint to allow 'TBD' status
ALTER TABLE public.matchups DROP CONSTRAINT IF EXISTS matchups_status_check;
ALTER TABLE public.matchups ADD CONSTRAINT matchups_status_check 
    CHECK (status IN ('scheduled', 'live', 'final', 'postponed', 'delayed', 'rescheduled', 'TBD'));

-- Also ensure the season column exists and has proper constraints
ALTER TABLE public.matchups ADD COLUMN IF NOT EXISTS season TEXT;

-- Add a comment to explain the column
COMMENT ON COLUMN public.matchups.season IS 'Season type and week (e.g., PRE2, REG1, POST4 for Super Bowl)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_matchups_season ON public.matchups(season);

-- Add a check constraint to ensure valid season format
ALTER TABLE public.matchups DROP CONSTRAINT IF EXISTS check_season_format;
ALTER TABLE public.matchups ADD CONSTRAINT check_season_format
    CHECK (season ~ '^(PRE|REG|POST)\d+$');

-- Add a unique constraint to prevent duplicate matchups for the same season
ALTER TABLE public.matchups DROP CONSTRAINT IF EXISTS unique_matchup_season_teams;
ALTER TABLE public.matchups ADD CONSTRAINT unique_matchup_season_teams
    UNIQUE (season, away_team, home_team);
