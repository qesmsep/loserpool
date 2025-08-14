-- Fix Admin Picks RLS Policy
-- This adds the missing policy that allows admins to create picks

-- Add RLS policy for admins to create picks
CREATE POLICY "Admins can create picks" ON public.picks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Add RLS policy for admins to update picks (if not already exists)
DO $$
BEGIN
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
    END IF;
END $$;

-- Verify the policies exist
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'picks'
ORDER BY policyname;
