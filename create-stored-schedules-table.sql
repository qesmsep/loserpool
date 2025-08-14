-- Create stored schedules table for storing scraped NFL schedule data
-- This prevents repeated scraping on every page view

CREATE TABLE IF NOT EXISTS public.stored_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_type TEXT NOT NULL CHECK (week_type IN ('current', 'next')),
    week_number INTEGER NOT NULL,
    week_display TEXT NOT NULL,
    games JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_source TEXT NOT NULL DEFAULT 'nfl-scraper-enhanced',
    UNIQUE(week_type)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stored_schedules_week_type ON public.stored_schedules(week_type);
CREATE INDEX IF NOT EXISTS idx_stored_schedules_last_updated ON public.stored_schedules(last_updated);
CREATE INDEX IF NOT EXISTS idx_stored_schedules_week_number ON public.stored_schedules(week_number);

-- Add RLS policies
ALTER TABLE public.stored_schedules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read stored schedules
CREATE POLICY "Allow authenticated users to read stored schedules" ON public.stored_schedules
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to manage stored schedules
CREATE POLICY "Allow service role to manage stored schedules" ON public.stored_schedules
    FOR ALL USING (auth.role() = 'service_role');

-- Add comments
COMMENT ON TABLE public.stored_schedules IS 'Stored NFL schedule data to prevent repeated scraping';
COMMENT ON COLUMN public.stored_schedules.week_type IS 'Type of week: current or next';
COMMENT ON COLUMN public.stored_schedules.week_number IS 'Numeric week number';
COMMENT ON COLUMN public.stored_schedules.week_display IS 'Human readable week display (e.g., "Preseason Week 2")';
COMMENT ON COLUMN public.stored_schedules.games IS 'JSON array of game data';
COMMENT ON COLUMN public.stored_schedules.data_source IS 'Source of the data (e.g., nfl-scraper-enhanced)';
