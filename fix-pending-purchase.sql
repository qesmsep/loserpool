-- Fix the pending purchase record that was created with wrong amount
-- The purchase record ece834b3-105e-4b64-b2a3-fb8cd464154e has amount_paid = 100 (should be 2100)

-- Update the pending purchase to have the correct amount
UPDATE purchases 
SET amount_paid = 2100 
WHERE id = 'ece834b3-105e-4b64-b2a3-fb8cd464154e' 
  AND stripe_session_id = 'cs_live_a1pZk0HRH98W6KOrXaVL2Qru30IZu7ZGqNFdklTZIwXzTnw45kiXx0RTBg'
  AND status = 'pending';

-- Verify the fix
SELECT 'Fixed purchase record' as info, id, user_id, stripe_session_id, amount_paid, picks_count, status 
FROM purchases 
WHERE id = 'ece834b3-105e-4b64-b2a3-fb8cd464154e';
