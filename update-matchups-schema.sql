-- SAFE SQL Script to Update Matchups Table for Automated Data Collection
-- This script adds all necessary fields for location, weather, odds, and tracking
-- Run this in your Supabase SQL Editor

-- First, let's check what columns already exist to avoid conflicts
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if venue column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'venue'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN venue TEXT;
    END IF;
    
    -- Check if weather_forecast column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'weather_forecast'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN weather_forecast TEXT;
    END IF;
    
    -- Check if temperature column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'temperature'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN temperature INTEGER;
    END IF;
    
    -- Check if wind_speed column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'wind_speed'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN wind_speed INTEGER;
    END IF;
    
    -- Check if humidity column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'humidity'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN humidity INTEGER;
    END IF;
    
    -- Check if is_dome column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'is_dome'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN is_dome BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Check if away_spread column exists (from main schema)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'away_spread'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN away_spread DECIMAL(4,1) DEFAULT 0;
    END IF;
    
    -- Check if home_spread column exists (from main schema)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'home_spread'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN home_spread DECIMAL(4,1) DEFAULT 0;
    END IF;
    
    -- Check if over_under column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'over_under'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN over_under DECIMAL(4,1);
    END IF;
    
    -- Check if odds_last_updated column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'odds_last_updated'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN odds_last_updated TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Check if data_source column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'data_source'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN data_source TEXT DEFAULT 'manual';
    END IF;
    
    -- Check if last_api_update column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'last_api_update'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN last_api_update TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Check if api_update_count column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'api_update_count'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN api_update_count INTEGER DEFAULT 0;
    END IF;
    
    -- Check if winner column exists (from your data)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matchups' 
        AND column_name = 'winner'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.matchups ADD COLUMN winner TEXT CHECK (winner IN ('away', 'home', 'tie'));
    END IF;
    
    -- Update status constraint to include new statuses
    ALTER TABLE public.matchups DROP CONSTRAINT IF EXISTS matchups_status_check;
    ALTER TABLE public.matchups ADD CONSTRAINT matchups_status_check 
        CHECK (status IN ('scheduled', 'live', 'final', 'postponed', 'delayed', 'rescheduled', 'TBD'));
    
    -- Add updated_at trigger if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_matchups_updated_at'
        AND event_object_table = 'matchups'
        AND event_object_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        CREATE TRIGGER update_matchups_updated_at
            BEFORE UPDATE ON public.matchups
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
END $$;

-- Create automated_update_logs table for tracking updates
CREATE TABLE IF NOT EXISTS public.automated_update_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    update_type TEXT NOT NULL CHECK (update_type IN ('matchups', 'weather', 'odds', 'full')),
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
    matchups_processed INTEGER DEFAULT 0,
    matchups_updated INTEGER DEFAULT 0,
    errors TEXT[],
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matchups_week_status ON public.matchups(week, status);
CREATE INDEX IF NOT EXISTS idx_matchups_game_time ON public.matchups(game_time);
CREATE INDEX IF NOT EXISTS idx_matchups_last_api_update ON public.matchups(last_api_update);
CREATE INDEX IF NOT EXISTS idx_automated_update_logs_created_at ON public.automated_update_logs(created_at);

-- Add RLS policies for the new table
ALTER TABLE public.automated_update_logs ENABLE ROW LEVEL SECURITY;

-- Check if policy exists before creating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'automated_update_logs' 
        AND policyname = 'Admins can view all update logs'
    ) THEN
        CREATE POLICY "Admins can view all update logs" ON public.automated_update_logs
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND is_admin = true
                )
            );
    END IF;
END $$;

-- Insert initial global settings for automated updates
INSERT INTO public.global_settings (key, value) VALUES 
    ('automated_updates_enabled', 'true'),
    ('last_automated_update', ''),
    ('weather_api_key', ''),
    ('odds_api_key', ''),
    ('espn_api_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Create function to log automated updates
CREATE OR REPLACE FUNCTION log_automated_update(
    p_update_type TEXT,
    p_status TEXT,
    p_matchups_processed INTEGER DEFAULT 0,
    p_matchups_updated INTEGER DEFAULT 0,
    p_errors TEXT[] DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.automated_update_logs (
        update_type,
        status,
        matchups_processed,
        matchups_updated,
        errors,
        execution_time_ms
    ) VALUES (
        p_update_type,
        p_status,
        p_matchups_processed,
        p_matchups_updated,
        p_errors,
        p_execution_time_ms
    ) RETURNING id INTO log_id;
    
    -- Update global settings
    UPDATE public.global_settings 
    SET value = NOW()::TEXT 
    WHERE key = 'last_automated_update';
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION log_automated_update TO authenticated;
GRANT SELECT, INSERT ON public.automated_update_logs TO authenticated;
