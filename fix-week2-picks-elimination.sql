-- Fix Week 2 Picks Elimination Script
-- This script marks picks as eliminated based on the actual game results from week 2
-- Only processes reg2_team_matchup_id column

-- First, let's see what picks we have for week 2
SELECT 
    COUNT(*) as total_picks,
    COUNT(CASE WHEN reg2_team_matchup_id IS NOT NULL THEN 1 END) as picks_with_reg2_allocation,
    COUNT(CASE WHEN status = 'active' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as active_picks_reg2,
    COUNT(CASE WHEN status = 'safe' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as safe_picks_reg2
FROM picks;

-- Update picks for TB @ HOU (TB won, so anyone who picked TB is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%TB%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for ATL @ MIN (ATL won, so anyone who picked ATL is eliminated)  
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%ATL%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for LAC @ LV (LAC won, so anyone who picked LAC is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%LAC%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for WAS @ GB (GB won, so anyone who picked GB is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%GB%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for SEA @ PIT (SEA won, so anyone who picked SEA is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%SEA%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for BUF @ NYJ (BUF won, so anyone who picked BUF is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%BUF%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for SF @ NO (SF won, so anyone who picked SF is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%SF%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for CLE @ BAL (BAL won, so anyone who picked BAL is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%BAL%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for NE @ MIA (NE won, so anyone who picked NE is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%NE%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for LAR @ TEN (LAR won, so anyone who picked LAR is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%LAR%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for DEN @ IND (IND won, so anyone who picked IND is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%IND%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for CHI @ DET (DET won, so anyone who picked DET is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%DET%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for CAR @ ARI (ARI won, so anyone who picked ARI is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%ARI%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for JAX @ CIN (CIN won, so anyone who picked CIN is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%CIN%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for PHI @ KC (PHI won, so anyone who picked PHI is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%PHI%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Update picks for NYG @ DAL (DAL won, so anyone who picked DAL is eliminated)
UPDATE picks 
SET status = 'eliminated', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%DAL%' 
  AND status IN ('active', 'safe')
  AND reg2_team_matchup_id IS NOT NULL;

-- Now mark the losing teams as safe (they survived)
-- TB @ HOU: HOU lost, so anyone who picked HOU survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%HOU%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- ATL @ MIN: MIN lost, so anyone who picked MIN survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%MIN%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- LAC @ LV: LV lost, so anyone who picked LV survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%LV%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- WAS @ GB: WAS lost, so anyone who picked WAS survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%WAS%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- SEA @ PIT: PIT lost, so anyone who picked PIT survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%PIT%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- BUF @ NYJ: NYJ lost, so anyone who picked NYJ survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%NYJ%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- SF @ NO: NO lost, so anyone who picked NO survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%NO%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- CLE @ BAL: CLE lost, so anyone who picked CLE survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%CLE%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- NE @ MIA: MIA lost, so anyone who picked MIA survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%MIA%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- LAR @ TEN: TEN lost, so anyone who picked TEN survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%TEN%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- DEN @ IND: DEN lost, so anyone who picked DEN survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%DEN%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- CHI @ DET: CHI lost, so anyone who picked CHI survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%CHI%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- CAR @ ARI: CAR lost, so anyone who picked CAR survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%CAR%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- JAX @ CIN: JAX lost, so anyone who picked JAX survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%JAX%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- PHI @ KC: KC lost, so anyone who picked KC survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%KC%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- NYG @ DAL: NYG lost, so anyone who picked NYG survives
UPDATE picks 
SET status = 'safe', updated_at = NOW()
WHERE reg2_team_matchup_id LIKE '%NYG%' 
  AND status = 'active'
  AND reg2_team_matchup_id IS NOT NULL;

-- Final summary query
SELECT 
    'Week 2 Pick Status Summary' as summary,
    COUNT(*) as total_picks,
    COUNT(CASE WHEN reg2_team_matchup_id IS NOT NULL THEN 1 END) as picks_with_reg2_allocation,
    COUNT(CASE WHEN status = 'eliminated' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as eliminated_picks,
    COUNT(CASE WHEN status = 'safe' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as safe_picks,
    COUNT(CASE WHEN status = 'active' AND reg2_team_matchup_id IS NOT NULL THEN 1 END) as remaining_active_picks
FROM picks;
