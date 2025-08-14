-- Fix free purchases constraint to allow $0 purchases
-- This modifies the amount_paid constraint to allow 0 for free purchases

-- First, let's check the current constraint
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'purchases'::regclass 
AND conname = 'purchases_amount_paid_check';

-- Drop the existing constraint
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_amount_paid_check;

-- Add a new constraint that allows 0 for free purchases
ALTER TABLE purchases ADD CONSTRAINT purchases_amount_paid_check 
CHECK (amount_paid >= 0);

-- Verify the new constraint
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'purchases'::regclass 
AND conname = 'purchases_amount_paid_check';

-- Test that we can now insert free purchases
-- (This is just a test, you can remove this after confirming it works)
-- INSERT INTO purchases (user_id, stripe_session_id, picks_count, amount_paid, status) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'test_free', 1, 0, 'completed');
