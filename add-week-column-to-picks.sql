-- Add week column to picks table
-- This allows us to track which week a pick was originally created for
-- so we can properly update matchup_id when picks survive to the next week

-- Add the week column
ALTER TABLE public.picks 
ADD COLUMN IF NOT EXISTS week INTEGER;

-- Update existing picks to have week = 1 (assuming they're all from week 1)
UPDATE public.picks 
SET week = 1 
WHERE week IS NULL;

-- Make the week column NOT NULL after setting default values
ALTER TABLE public.picks 
ALTER COLUMN week SET NOT NULL;

-- Add an index on week for better query performance
CREATE INDEX IF NOT EXISTS idx_picks_week ON public.picks(week);

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.picks.week IS 'The week this pick was originally created for. Used to track pick progression across weeks.';

-- Verify the changes
SELECT 
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
AND column_name = 'week';
