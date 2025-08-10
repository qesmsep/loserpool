-- Fix RLS policies for picks table
-- This will allow users to delete their own picks

-- Enable RLS on picks table if not already enabled
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;

-- Add DELETE policy for users to delete their own picks
CREATE POLICY "Users can delete their own picks" ON picks
    FOR DELETE
    USING (auth.uid() = user_id);

-- Verify all policies exist
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NULL THEN 'No condition'
        ELSE qual
    END as condition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'picks'
ORDER BY cmd;
