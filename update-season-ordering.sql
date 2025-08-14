-- Update Season Ordering for Matchups
-- This script adds the season column and proper ordering function
-- SAFE VERSION - handles existing constraints

-- Add the season column if it doesn't exist
ALTER TABLE public.matchups 
ADD COLUMN IF NOT EXISTS season TEXT;

-- Add a comment to explain the column
COMMENT ON COLUMN public.matchups.season IS 'Season type and week (e.g., PRE0-PRE3, REG1-REG18, POST1-POST4 for Super Bowl)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_matchups_season ON public.matchups(season);

-- Update existing matchups to have a default season value based on week
-- This assumes existing data follows the pattern: PRE0-PRE3, REG1-REG18, POST1-POST4
UPDATE public.matchups 
SET season = CASE 
    WHEN week <= 3 THEN 'PRE' || (week - 1)  -- PRE0, PRE1, PRE2
    WHEN week <= 21 THEN 'REG' || (week - 3)  -- REG1 through REG18
    WHEN week <= 24 THEN 'POST' || (week - 21) -- POST1 through POST4
    ELSE 'REG' || week
END
WHERE season IS NULL;

-- Make the season column NOT NULL after populating existing data
ALTER TABLE public.matchups 
ALTER COLUMN season SET NOT NULL;

-- Add a check constraint to ensure valid season format (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_season_format' 
        AND conrelid = 'public.matchups'::regclass
    ) THEN
        ALTER TABLE public.matchups 
        ADD CONSTRAINT check_season_format 
        CHECK (season ~ '^(PRE|REG|POST)\d+$');
    END IF;
END $$;

-- Add a unique constraint to prevent duplicate matchups for the same season (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_matchup_season_teams' 
        AND conrelid = 'public.matchups'::regclass
    ) THEN
        ALTER TABLE public.matchups 
        ADD CONSTRAINT unique_matchup_season_teams 
        UNIQUE (season, away_team, home_team);
    END IF;
END $$;

-- Create a function to get the proper season ordering
CREATE OR REPLACE FUNCTION get_season_order(season_text TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE 
    WHEN season_text LIKE 'PRE%' THEN 
      CAST(SUBSTRING(season_text FROM 4) AS INTEGER)  -- PRE0=0, PRE1=1, etc.
    WHEN season_text LIKE 'REG%' THEN 
      CAST(SUBSTRING(season_text FROM 4) AS INTEGER) + 10  -- REG1=11, REG2=12, etc.
    WHEN season_text LIKE 'POST%' THEN 
      CAST(SUBSTRING(season_text FROM 5) AS INTEGER) + 30  -- POST1=31, POST2=32, etc.
    ELSE 999
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create an index for the season ordering function
CREATE INDEX IF NOT EXISTS idx_matchups_season_order ON public.matchups(get_season_order(season));

-- Test the ordering function
SELECT 
  week,
  season,
  get_season_order(season) as season_order,
  away_team,
  home_team,
  game_time
FROM public.matchups 
ORDER BY get_season_order(season), game_time
LIMIT 10;

-- Verify the season column is populated correctly
SELECT 
  week,
  season,
  COUNT(*) as game_count
FROM public.matchups 
GROUP BY week, season
ORDER BY get_season_order(season);
