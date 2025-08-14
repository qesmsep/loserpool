-- Safe Pick Names Migration
-- This script checks for existing columns and policies before creating them

-- Add pick_name column to picks table (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'picks' 
        AND column_name = 'pick_name'
    ) THEN
        ALTER TABLE public.picks ADD COLUMN pick_name TEXT;
        RAISE NOTICE 'Added pick_name column to picks table';
    ELSE
        RAISE NOTICE 'pick_name column already exists';
    END IF;
END $$;

-- Add notes column to picks table (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'picks' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.picks ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to picks table';
    ELSE
        RAISE NOTICE 'notes column already exists';
    END IF;
END $$;

-- Create index for better performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_picks_pick_name ON public.picks(pick_name);

-- Add RLS policies only if they don't exist
DO $$
BEGIN
    -- Check if "Users can update their own picks" policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'picks' 
        AND policyname = 'Users can update their own picks'
    ) THEN
        CREATE POLICY "Users can update their own picks" ON public.picks
          FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created "Users can update their own picks" policy';
    ELSE
        RAISE NOTICE 'Users can update their own picks policy already exists';
    END IF;

    -- Check if "Admins can update all picks" policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'picks' 
        AND policyname = 'Admins can update all picks'
    ) THEN
        CREATE POLICY "Admins can update all picks" ON public.picks
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM public.users 
              WHERE id = auth.uid() AND is_admin = true
            )
          );
        RAISE NOTICE 'Created "Admins can update all picks" policy';
    ELSE
        RAISE NOTICE 'Admins can update all picks policy already exists';
    END IF;
END $$;

-- Update existing picks to have default names if they don't have them
DO $$
DECLARE
  user_record RECORD;
  pick_record RECORD;
  pick_counter INTEGER;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM picks 
    WHERE pick_name IS NULL OR pick_name = ''
  LOOP
    pick_counter := 1;
    
    FOR pick_record IN 
      SELECT id 
      FROM picks 
      WHERE user_id = user_record.user_id 
      AND (pick_name IS NULL OR pick_name = '')
      ORDER BY created_at
    LOOP
      UPDATE picks 
      SET pick_name = 'Pick ' || pick_counter
      WHERE id = pick_record.id;
      
      RAISE NOTICE 'Updated pick % to have name "Pick %"', pick_record.id, pick_counter;
      
      pick_counter := pick_counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Show summary of what was done
SELECT 
  'Migration Summary' as info,
  COUNT(*) as total_picks,
  COUNT(CASE WHEN pick_name IS NOT NULL AND pick_name != '' THEN 1 END) as picks_with_names,
  COUNT(CASE WHEN pick_name IS NULL OR pick_name = '' THEN 1 END) as picks_without_names
FROM picks;
