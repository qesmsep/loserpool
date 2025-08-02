-- Add Admin Policy for Purchases Table
-- Run this in your Supabase SQL editor

-- Add policy to allow admins to create purchases for any user
CREATE POLICY "Admins can create purchases for any user" ON public.purchases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Add policy to allow admins to update purchases
CREATE POLICY "Admins can update purchases" ON public.purchases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Add policy to allow admins to delete purchases
CREATE POLICY "Admins can delete purchases" ON public.purchases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Verify the policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'purchases'
ORDER BY policyname; 