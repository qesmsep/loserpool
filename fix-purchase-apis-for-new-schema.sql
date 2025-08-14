-- Fix purchase APIs to work with new schema
-- This ensures the APIs work whether the old columns exist or not

-- First, let's check if the old columns still exist
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if matchup_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'picks' 
        AND column_name = 'matchup_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE 'Old columns still exist - running migration to remove them';
        
        -- Drop the trigger first since it references team_matchup_id
        DROP TRIGGER IF EXISTS trigger_set_team_matchup_id ON public.picks;
        
        -- Drop the unique constraint on team_matchup_id
        ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_team_matchup_id_unique;
        
        -- Drop indexes that reference the columns we're removing
        DROP INDEX IF EXISTS idx_picks_user_matchup;
        DROP INDEX IF EXISTS idx_picks_user_week;
        DROP INDEX IF EXISTS idx_picks_team_matchup_id;
        
        -- Drop foreign key constraints
        ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_matchup_id_fkey;
        
        -- Drop check constraints
        ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_selected_team_check;
        
        -- Remove the redundant columns
        ALTER TABLE public.picks DROP COLUMN IF EXISTS matchup_id;
        ALTER TABLE public.picks DROP COLUMN IF EXISTS selected_team;
        ALTER TABLE public.picks DROP COLUMN IF EXISTS is_random;
        ALTER TABLE public.picks DROP COLUMN IF EXISTS team_picked;
        ALTER TABLE public.picks DROP COLUMN IF EXISTS week;
        ALTER TABLE public.picks DROP COLUMN IF EXISTS team_matchup_id;
        
        -- Update the status check constraint to remove 'eliminated' (should be 'lost')
        ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_status_check;
        ALTER TABLE public.picks ADD CONSTRAINT picks_status_check CHECK (
          status = ANY (ARRAY['pending', 'active', 'lost', 'safe'])
        );
        
        RAISE NOTICE 'Migration completed - old columns removed';
    ELSE
        RAISE NOTICE 'Old columns already removed - schema is clean';
    END IF;
END $$;

-- Verify the current table structure
SELECT 
  'Current Table Structure' as info,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
ORDER BY ordinal_position;

-- Test insert to ensure the new schema works
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    test_pick_id UUID;
BEGIN
    -- Try to insert a test pick with the new schema
    INSERT INTO public.picks (user_id, picks_count, status, pick_name)
    VALUES (test_user_id, 1, 'pending', 'Test Pick')
    RETURNING id INTO test_pick_id;
    
    RAISE NOTICE 'Test insert successful - new schema is working';
    
    -- Clean up test data
    DELETE FROM public.picks WHERE id = test_pick_id;
    
    RAISE NOTICE 'Test cleanup completed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;
