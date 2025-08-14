-- Create schedule cache table for storing scraped NFL schedule data
-- This prevents repeated scraping on every page view

CREATE TABLE IF NOT EXISTS public.schedule_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_type TEXT NOT NULL CHECK (week_type IN ('current', 'next')),
    week_number INTEGER NOT NULL,
    week_display TEXT NOT NULL,
    games JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(week_type)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_cache_week_type ON public.schedule_cache(week_type);
CREATE INDEX IF NOT EXISTS idx_schedule_cache_expires_at ON public.schedule_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_schedule_cache_last_updated ON public.schedule_cache(last_updated);

-- Add RLS policies
ALTER TABLE public.schedule_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read cache
CREATE POLICY "Allow authenticated users to read schedule cache" ON public.schedule_cache
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to manage cache
CREATE POLICY "Allow service role to manage schedule cache" ON public.schedule_cache
    FOR ALL USING (auth.role() = 'service_role');

-- Add comments
COMMENT ON TABLE public.schedule_cache IS 'Cache for NFL schedule data to prevent repeated scraping';
COMMENT ON COLUMN public.schedule_cache.week_type IS 'Type of week: current or next';
COMMENT ON COLUMN public.schedule_cache.week_number IS 'Numeric week number';
COMMENT ON COLUMN public.schedule_cache.week_display IS 'Human readable week display (e.g., "Preseason Week 2")';
COMMENT ON COLUMN public.schedule_cache.games IS 'JSON array of game data';
COMMENT ON COLUMN public.schedule_cache.expires_at IS 'When this cache entry expires';
