-- Add season column to matchups table
-- This will store the season type (PRE/REG/POST) and week number for better identification

-- Add the season column
ALTER TABLE public.matchups 
ADD COLUMN IF NOT EXISTS season TEXT;

-- Add a comment to explain the column
COMMENT ON COLUMN public.matchups.season IS 'Season type and week (e.g., PRE2, REG1, POST4 for Super Bowl)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_matchups_season ON public.matchups(season);

-- Update existing matchups to have a default season value based on week
-- This assumes existing data is regular season weeks 1-18
UPDATE public.matchups 
SET season = CASE 
    WHEN week <= 4 THEN 'PRE' || week
    WHEN week <= 21 THEN 'REG' || (week - 4)
    WHEN week <= 24 THEN 'POST' || (week - 21)
    ELSE 'REG' || week
END
WHERE season IS NULL;

-- Make the season column NOT NULL after populating existing data
ALTER TABLE public.matchups 
ALTER COLUMN season SET NOT NULL;

-- Add a check constraint to ensure valid season format
ALTER TABLE public.matchups 
ADD CONSTRAINT check_season_format 
CHECK (season ~ '^(PRE|REG|POST)\d+$');

-- Add a unique constraint to prevent duplicate matchups for the same season
ALTER TABLE public.matchups 
ADD CONSTRAINT unique_matchup_season_teams 
UNIQUE (season, away_team, home_team);

-- Update the RLS policies to include the new season column
-- (This assumes RLS is already enabled on the matchups table)

-- Example of how to query matchups by season:
-- SELECT * FROM matchups WHERE season = 'PRE2';
-- SELECT * FROM matchups WHERE season = 'REG1';
-- SELECT * FROM matchups WHERE season = 'POST4';
