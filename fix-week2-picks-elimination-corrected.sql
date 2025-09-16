-- Fix Week 2 Picks Elimination Script (Corrected)
-- This script properly handles the {matchup_id}_{team_name} format
-- Based on actual game results from week 2 matchups

-- First, let's see what picks we have for week 2
SELECT 
    'Before Update' as status,
    COUNT(*) as total_picks,
    COUNT(CASE WHEN reg2_team_matchup_id IS NOT NULL THEN 1 END) as picks_with_reg2_allocation,
    COUNT(CASE WHEN status = 'active' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as active_picks_reg2,
    COUNT(CASE WHEN status = 'safe' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as safe_picks_reg2,
    COUNT(CASE WHEN status = 'eliminated' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as eliminated_picks_reg2
FROM picks;

-- Show some examples of the current reg2_team_matchup_id format
SELECT 
    id,
    reg2_team_matchup_id,
    status,
    SUBSTRING(reg2_team_matchup_id FROM '^[^_]+') as matchup_id,
    SUBSTRING(reg2_team_matchup_id FROM '_(.+)$') as team_picked
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
LIMIT 10;

-- ============================================================================
-- ELIMINATE PICKS FOR WINNING TEAMS (Loser Pool Logic)
-- ============================================================================

-- TB @ HOU: TB won (20-19), so anyone who picked TB is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_TB'
  AND status IN ('active', 'safe');

-- ATL @ MIN: ATL won (22-6), so anyone who picked ATL is eliminated  
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_ATL'
  AND status IN ('active', 'safe');

-- LAC @ LV: LAC won (20-9), so anyone who picked LAC is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_LAC'
  AND status IN ('active', 'safe');

-- WAS @ GB: GB won (27-18), so anyone who picked GB is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_GB'
  AND status IN ('active', 'safe');

-- SEA @ PIT: SEA won (31-17), so anyone who picked SEA is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_SEA'
  AND status IN ('active', 'safe');

-- BUF @ NYJ: BUF won (30-10), so anyone who picked BUF is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_BUF'
  AND status IN ('active', 'safe');

-- SF @ NO: SF won (26-21), so anyone who picked SF is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_SF'
  AND status IN ('active', 'safe');

-- CLE @ BAL: BAL won (41-17), so anyone who picked BAL is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_BAL'
  AND status IN ('active', 'safe');

-- NE @ MIA: NE won (33-27), so anyone who picked NE is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_NE'
  AND status IN ('active', 'safe');

-- LAR @ TEN: LAR won (33-19), so anyone who picked LAR is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_LAR'
  AND status IN ('active', 'safe');

-- DEN @ IND: IND won (29-28), so anyone who picked IND is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_IND'
  AND status IN ('active', 'safe');

-- CHI @ DET: DET won (52-21), so anyone who picked DET is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_DET'
  AND status IN ('active', 'safe');

-- CAR @ ARI: ARI won (27-22), so anyone who picked ARI is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_ARI'
  AND status IN ('active', 'safe');

-- JAX @ CIN: CIN won (31-27), so anyone who picked CIN is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_CIN'
  AND status IN ('active', 'safe');

-- PHI @ KC: PHI won (20-17), so anyone who picked PHI is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_PHI'
  AND status IN ('active', 'safe');

-- NYG @ DAL: DAL won (40-37), so anyone who picked DAL is eliminated
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_DAL'
  AND status IN ('active', 'safe');

-- ============================================================================
-- MARK LOSING TEAMS AS SAFE (Loser Pool Logic)
-- ============================================================================

-- TB @ HOU: HOU lost, so anyone who picked HOU survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_HOU'
  AND status = 'active';

-- ATL @ MIN: MIN lost, so anyone who picked MIN survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_MIN'
  AND status = 'active';

-- LAC @ LV: LV lost, so anyone who picked LV survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_LV'
  AND status = 'active';

-- WAS @ GB: WAS lost, so anyone who picked WAS survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_WAS'
  AND status = 'active';

-- SEA @ PIT: PIT lost, so anyone who picked PIT survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_PIT'
  AND status = 'active';

-- BUF @ NYJ: NYJ lost, so anyone who picked NYJ survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_NYJ'
  AND status = 'active';

-- SF @ NO: NO lost, so anyone who picked NO survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_NO'
  AND status = 'active';

-- CLE @ BAL: CLE lost, so anyone who picked CLE survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_CLE'
  AND status = 'active';

-- NE @ MIA: MIA lost, so anyone who picked MIA survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_MIA'
  AND status = 'active';

-- LAR @ TEN: TEN lost, so anyone who picked TEN survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_TEN'
  AND status = 'active';

-- DEN @ IND: DEN lost, so anyone who picked DEN survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_DEN'
  AND status = 'active';

-- CHI @ DET: CHI lost, so anyone who picked CHI survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_CHI'
  AND status = 'active';

-- CAR @ ARI: CAR lost, so anyone who picked CAR survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_CAR'
  AND status = 'active';

-- JAX @ CIN: JAX lost, so anyone who picked JAX survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_JAX'
  AND status = 'active';

-- PHI @ KC: KC lost, so anyone who picked KC survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_KC'
  AND status = 'active';

-- NYG @ DAL: NYG lost, so anyone who picked NYG survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_NYG'
  AND status = 'active';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show the specific pick that was mentioned in the example
SELECT 
    'Specific Pick Check' as check_type,
    id,
    reg2_team_matchup_id,
    status,
    SUBSTRING(reg2_team_matchup_id FROM '^[^_]+') as matchup_id,
    SUBSTRING(reg2_team_matchup_id FROM '_(.+)$') as team_picked,
    CASE 
        WHEN SUBSTRING(reg2_team_matchup_id FROM '_(.+)$') = 'CLE' THEN 'Should be SAFE (CLE lost to BAL)'
        ELSE 'Check game result'
    END as expected_result
FROM picks 
WHERE reg2_team_matchup_id = '52bc0919-db2e-47b9-8350-a4c395bde1a6_CLE';

-- Final summary
SELECT 
    'After Update' as status,
    COUNT(*) as total_picks,
    COUNT(CASE WHEN reg2_team_matchup_id IS NOT NULL THEN 1 END) as picks_with_reg2_allocation,
    COUNT(CASE WHEN status = 'active' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as active_picks_reg2,
    COUNT(CASE WHEN status = 'safe' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as safe_picks_reg2,
    COUNT(CASE WHEN status = 'eliminated' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as eliminated_picks_reg2
FROM picks;

-- Show breakdown by team for reg2 picks
SELECT 
    SUBSTRING(reg2_team_matchup_id FROM '_(.+)$') as team_picked,
    status,
    COUNT(*) as count
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL
GROUP BY SUBSTRING(reg2_team_matchup_id FROM '_(.+)$'), status
ORDER BY team_picked, status;
