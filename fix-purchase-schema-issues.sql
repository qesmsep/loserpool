-- Fix purchase schema issues that are causing 406 errors
-- This script ensures the purchases table has the correct structure and constraints

-- First, let's check the current table structure
SELECT 
  'Current Purchases Table Structure' as info,
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchases'
ORDER BY ordinal_position;

-- Check current constraints
SELECT 
  'Current Constraints' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'purchases'::regclass
ORDER BY conname;

-- Ensure amount_paid column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'purchases' 
        AND column_name = 'amount_paid'
    ) THEN
        ALTER TABLE purchases ADD COLUMN amount_paid INTEGER DEFAULT 0;
        RAISE NOTICE 'Added amount_paid column to purchases table';
    ELSE
        RAISE NOTICE 'amount_paid column already exists in purchases table';
    END IF;
END $$;

-- Update existing records to set amount_paid = amount if amount column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'purchases' 
        AND column_name = 'amount'
    ) THEN
        UPDATE purchases SET amount_paid = amount WHERE amount_paid = 0 AND amount IS NOT NULL;
        RAISE NOTICE 'Updated existing records to set amount_paid = amount';
    ELSE
        RAISE NOTICE 'amount column does not exist, skipping update';
    END IF;
END $$;

-- Fix the amount_paid constraint to allow 0 for free purchases
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_amount_paid_check;
ALTER TABLE purchases ADD CONSTRAINT purchases_amount_paid_check 
CHECK (amount_paid >= 0);

-- Ensure stripe_session_id can be NULL for free purchases
ALTER TABLE purchases ALTER COLUMN stripe_session_id DROP NOT NULL;

-- Add a unique constraint on stripe_session_id only when it's not NULL
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_stripe_session_id_key;
CREATE UNIQUE INDEX purchases_stripe_session_id_key 
ON purchases (stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;

-- Verify the fixes
SELECT 
  'Updated Table Structure' as info,
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchases'
ORDER BY ordinal_position;

SELECT 
  'Updated Constraints' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'purchases'::regclass
ORDER BY conname;

-- Test insert to ensure everything works
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    test_purchase_id UUID;
BEGIN
    -- Test free purchase insert
    INSERT INTO public.purchases (user_id, stripe_session_id, amount_paid, picks_count, status)
    VALUES (test_user_id, 'test_free_' || extract(epoch from now()), 0, 1, 'completed')
    RETURNING id INTO test_purchase_id;
    
    RAISE NOTICE 'Free purchase test insert successful - purchase ID: %', test_purchase_id;
    
    -- Test paid purchase insert
    INSERT INTO public.purchases (user_id, stripe_session_id, amount_paid, picks_count, status)
    VALUES (test_user_id, 'test_paid_' || extract(epoch from now()), 2100, 1, 'pending')
    RETURNING id INTO test_purchase_id;
    
    RAISE NOTICE 'Paid purchase test insert successful - purchase ID: %', test_purchase_id;
    
    -- Clean up test data
    DELETE FROM public.purchases WHERE id = test_purchase_id;
    
    RAISE NOTICE 'Test cleanup completed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
        RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;
