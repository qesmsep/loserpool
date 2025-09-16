-- Fix All Week 2 Picks - Final Correction Script
-- This script corrects all week 2 picks based on actual game results
-- Uses the {matchup_id}_{team_name} format properly

-- ============================================================================
-- VERIFICATION QUERIES - BEFORE FIXES
-- ============================================================================

-- Show current status of all week 2 picks
SELECT 
    'BEFORE FIXES' as status,
    COUNT(*) as total_picks,
    COUNT(CASE WHEN reg2_team_matchup_id IS NOT NULL THEN 1 END) as picks_with_reg2_allocation,
    COUNT(CASE WHEN status = 'active' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as active_picks_reg2,
    COUNT(CASE WHEN status = 'safe' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as safe_picks_reg2,
    COUNT(CASE WHEN status = 'eliminated' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as eliminated_picks_reg2
FROM picks;

-- Show breakdown by team for reg2 picks
SELECT 
    'BEFORE - Team Breakdown' as info,
    SUBSTRING(reg2_team_matchup_id FROM '_(.+)$') as team_picked,
    picks.status,
    COUNT(*) as count
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL
GROUP BY SUBSTRING(reg2_team_matchup_id FROM '_(.+)$'), picks.status
ORDER BY team_picked, picks.status;

-- ============================================================================
-- CORRECT ALL WEEK 2 PICKS BASED ON ACTUAL GAME RESULTS
-- ============================================================================

-- TB @ HOU: TB won (20-19) - Anyone who picked TB is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_TB'
  AND status != 'eliminated';

-- TB @ HOU: HOU lost (20-19) - Anyone who picked HOU is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_HOU'
  AND status != 'safe';

-- ATL @ MIN: ATL won (22-6) - Anyone who picked ATL is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_ATL'
  AND status != 'eliminated';

-- ATL @ MIN: MIN lost (22-6) - Anyone who picked MIN is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_MIN'
  AND status != 'safe';

-- LAC @ LV: LAC won (20-9) - Anyone who picked LAC is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_LAC'
  AND status != 'eliminated';

-- LAC @ LV: LV lost (20-9) - Anyone who picked LV is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_LV'
  AND status != 'safe';

-- WAS @ GB: GB won (27-18) - Anyone who picked GB is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_GB'
  AND status != 'eliminated';

-- WAS @ GB: WAS lost (27-18) - Anyone who picked WAS is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_WAS'
  AND status != 'safe';

-- SEA @ PIT: SEA won (31-17) - Anyone who picked SEA is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_SEA'
  AND status != 'eliminated';

-- SEA @ PIT: PIT lost (31-17) - Anyone who picked PIT is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_PIT'
  AND status != 'safe';

-- BUF @ NYJ: BUF won (30-10) - Anyone who picked BUF is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_BUF'
  AND status != 'eliminated';

-- BUF @ NYJ: NYJ lost (30-10) - Anyone who picked NYJ is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_NYJ'
  AND status != 'safe';

-- SF @ NO: SF won (26-21) - Anyone who picked SF is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_SF'
  AND status != 'eliminated';

-- SF @ NO: NO lost (26-21) - Anyone who picked NO is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_NO'
  AND status != 'safe';

-- CLE @ BAL: BAL won (41-17) - Anyone who picked BAL is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_BAL'
  AND status != 'eliminated';

-- CLE @ BAL: CLE lost (41-17) - Anyone who picked CLE is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_CLE'
  AND status != 'safe';

-- NE @ MIA: NE won (33-27) - Anyone who picked NE is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_NE'
  AND status != 'eliminated';

-- NE @ MIA: MIA lost (33-27) - Anyone who picked MIA is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_MIA'
  AND status != 'safe';

-- LAR @ TEN: LAR won (33-19) - Anyone who picked LAR is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_LAR'
  AND status != 'eliminated';

-- LAR @ TEN: TEN lost (33-19) - Anyone who picked TEN is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_TEN'
  AND status != 'safe';

-- DEN @ IND: IND won (29-28) - Anyone who picked IND is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_IND'
  AND status != 'eliminated';

-- DEN @ IND: DEN lost (29-28) - Anyone who picked DEN is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_DEN'
  AND status != 'safe';

-- CHI @ DET: DET won (52-21) - Anyone who picked DET is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_DET'
  AND status != 'eliminated';

-- CHI @ DET: CHI lost (52-21) - Anyone who picked CHI is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_CHI'
  AND status != 'safe';

-- CAR @ ARI: ARI won (27-22) - Anyone who picked ARI is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_ARI'
  AND status != 'eliminated';

-- CAR @ ARI: CAR lost (27-22) - Anyone who picked CAR is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_CAR'
  AND status != 'safe';

-- JAX @ CIN: CIN won (31-27) - Anyone who picked CIN is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_CIN'
  AND status != 'eliminated';

-- JAX @ CIN: JAX lost (31-27) - Anyone who picked JAX is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_JAX'
  AND status != 'safe';

-- PHI @ KC: PHI won (20-17) - Anyone who picked PHI is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_PHI'
  AND status != 'eliminated';

-- PHI @ KC: KC lost (20-17) - Anyone who picked KC is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_KC'
  AND status != 'safe';

-- NYG @ DAL: DAL won (40-37) - Anyone who picked DAL is ELIMINATED
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_DAL'
  AND status != 'eliminated';

-- NYG @ DAL: NYG lost (40-37) - Anyone who picked NYG is SAFE
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%_NYG'
  AND status != 'safe';

-- ============================================================================
-- VERIFICATION QUERIES - AFTER FIXES
-- ============================================================================

-- Show final status of all week 2 picks
SELECT 
    'AFTER FIXES' as status,
    COUNT(*) as total_picks,
    COUNT(CASE WHEN reg2_team_matchup_id IS NOT NULL THEN 1 END) as picks_with_reg2_allocation,
    COUNT(CASE WHEN status = 'active' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as active_picks_reg2,
    COUNT(CASE WHEN status = 'safe' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as safe_picks_reg2,
    COUNT(CASE WHEN status = 'eliminated' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as eliminated_picks_reg2
FROM picks;

-- Show final breakdown by team for reg2 picks
SELECT 
    'AFTER - Team Breakdown' as info,
    SUBSTRING(reg2_team_matchup_id FROM '_(.+)$') as team_picked,
    picks.status,
    COUNT(*) as count
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL
GROUP BY SUBSTRING(reg2_team_matchup_id FROM '_(.+)$'), picks.status
ORDER BY team_picked, picks.status;

-- Show the specific CLE pick that was mentioned in the example
SELECT 
    'CLE Pick Verification' as check_type,
    id,
    reg2_team_matchup_id,
    status,
    updated_at,
    'CLE lost to BAL (17-41) - should be SAFE' as explanation
FROM picks 
WHERE reg2_team_matchup_id = '52bc0919-db2e-47b9-8350-a4c395bde1a6_CLE';

-- Summary of changes made
SELECT 
    'SUMMARY' as info,
    'All week 2 picks have been corrected based on actual game results' as message,
    'Winning teams: ELIMINATED, Losing teams: SAFE' as logic,
    'Loser pool rules applied correctly' as confirmation;
