-- Check for consistency issues in Week 2 picks
-- This will show us picks with the same matchup_id but different statuses

SELECT 
    'CONSISTENCY CHECK: Same matchup_id, different statuses' as description,
    reg2_team_matchup_id,
    status,
    COUNT(*) as count,
    STRING_AGG(user_id::text, ', ') as user_ids
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL
GROUP BY reg2_team_matchup_id, status
ORDER BY reg2_team_matchup_id, status;

-- Show specific examples of the inconsistency
SELECT 
    'INCONSISTENT PICKS EXAMPLE' as description,
    user_id,
    reg2_team_matchup_id,
    status,
    picks_count
FROM picks 
WHERE reg2_team_matchup_id = '52bc0919-db2e-47b9-8350-a4c395bde1a6_CLE'
ORDER BY status, user_id;
