-- Add picks_count column to picks table
-- Run this in your Supabase SQL editor

-- Add picks_count column to picks table
ALTER TABLE public.picks
ADD COLUMN IF NOT EXISTS picks_count INTEGER DEFAULT 1;

-- Update existing picks to have picks_count = 1
UPDATE public.picks
SET picks_count = 1
WHERE picks_count IS NULL;

-- Make picks_count NOT NULL after setting default values
ALTER TABLE public.picks
ALTER COLUMN picks_count SET NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'picks' AND table_schema = 'public'
ORDER BY ordinal_position; 