-- Fix the specific CLE pick that was overridden by the cron job
-- This pick should be SAFE because CLE lost to BAL (17-41)

UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id = '52bc0919-db2e-47b9-8350-a4c395bde1a6_CLE'
  AND status = 'eliminated';

-- Verify the fix
SELECT 
    id,
    reg2_team_matchup_id,
    status,
    updated_at,
    'CLE lost to BAL (17-41) - should be SAFE' as explanation
FROM picks 
WHERE reg2_team_matchup_id = '52bc0919-db2e-47b9-8350-a4c395bde1a6_CLE';


