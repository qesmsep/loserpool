-- Clean up duplicate picks for the same user and matchup
-- This will keep only the most recent pick for each user/matchup combination

-- First, let's see what duplicates exist
SELECT 
    user_id,
    matchup_id,
    COUNT(*) as pick_count,
    STRING_AGG(team_picked, ', ') as teams_picked
FROM picks
GROUP BY user_id, matchup_id
HAVING COUNT(*) > 1
ORDER BY user_id, matchup_id;

-- Delete duplicate picks, keeping only the most recent one for each user/matchup
DELETE FROM picks 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY user_id, matchup_id 
                   ORDER BY created_at DESC
               ) as rn
        FROM picks
    ) ranked
    WHERE rn > 1
);

-- Verify cleanup
SELECT 
    user_id,
    matchup_id,
    COUNT(*) as pick_count
FROM picks
GROUP BY user_id, matchup_id
HAVING COUNT(*) > 1;
