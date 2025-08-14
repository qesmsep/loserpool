-- Add individual week columns to picks table
-- This creates a wide table format where each pick has columns for every possible week

-- Add PRE season columns
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS pre1_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS pre2_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS pre3_team_matchup_id UUID;

-- Add REG season columns (weeks 1-18)
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg1_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg2_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg3_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg4_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg5_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg6_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg7_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg8_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg9_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg10_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg11_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg12_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg13_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg14_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg15_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg16_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg17_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS reg18_team_matchup_id UUID;

-- Add POST season columns
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS post1_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS post2_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS post3_team_matchup_id UUID;
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS post4_team_matchup_id UUID;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_picks_pre1 ON public.picks USING btree (pre1_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_pre2 ON public.picks USING btree (pre2_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_pre3 ON public.picks USING btree (pre3_team_matchup_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_picks_reg1 ON public.picks USING btree (reg1_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg2 ON public.picks USING btree (reg2_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg3 ON public.picks USING btree (reg3_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg4 ON public.picks USING btree (reg4_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg5 ON public.picks USING btree (reg5_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg6 ON public.picks USING btree (reg6_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg7 ON public.picks USING btree (reg7_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg8 ON public.picks USING btree (reg8_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg9 ON public.picks USING btree (reg9_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg10 ON public.picks USING btree (reg10_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg11 ON public.picks USING btree (reg11_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg12 ON public.picks USING btree (reg12_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg13 ON public.picks USING btree (reg13_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg14 ON public.picks USING btree (reg14_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg15 ON public.picks USING btree (reg15_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg16 ON public.picks USING btree (reg16_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg17 ON public.picks USING btree (reg17_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_reg18 ON public.picks USING btree (reg18_team_matchup_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_picks_post1 ON public.picks USING btree (post1_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_post2 ON public.picks USING btree (post2_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_post3 ON public.picks USING btree (post3_team_matchup_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_picks_post4 ON public.picks USING btree (post4_team_matchup_id) TABLESPACE pg_default;

-- Create a function to assign a pick to a specific week
CREATE OR REPLACE FUNCTION assign_pick_to_week(
  p_pick_id UUID,
  p_week_column TEXT,
  p_matchup_id UUID,
  p_team_picked TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  team_matchup_uuid UUID;
  update_query TEXT;
BEGIN
  -- Generate the team-matchup ID
  team_matchup_uuid := get_team_matchup_id(p_matchup_id, p_team_picked);
  
  -- Build dynamic update query
  update_query := format('UPDATE public.picks SET %I = $1 WHERE id = $2', p_week_column);
  
  -- Execute the update
  EXECUTE update_query USING team_matchup_uuid, p_pick_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get pick history in wide format
CREATE OR REPLACE FUNCTION get_pick_wide_history(p_pick_id UUID)
RETURNS TABLE (
  id UUID,
  pick_name TEXT,
  user_id UUID,
  pre1_team_matchup_id UUID,
  pre2_team_matchup_id UUID,
  pre3_team_matchup_id UUID,
  reg1_team_matchup_id UUID,
  reg2_team_matchup_id UUID,
  reg3_team_matchup_id UUID,
  reg4_team_matchup_id UUID,
  reg5_team_matchup_id UUID,
  reg6_team_matchup_id UUID,
  reg7_team_matchup_id UUID,
  reg8_team_matchup_id UUID,
  reg9_team_matchup_id UUID,
  reg10_team_matchup_id UUID,
  reg11_team_matchup_id UUID,
  reg12_team_matchup_id UUID,
  reg13_team_matchup_id UUID,
  reg14_team_matchup_id UUID,
  reg15_team_matchup_id UUID,
  reg16_team_matchup_id UUID,
  reg17_team_matchup_id UUID,
  reg18_team_matchup_id UUID,
  post1_team_matchup_id UUID,
  post2_team_matchup_id UUID,
  post3_team_matchup_id UUID,
  post4_team_matchup_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.pick_name,
    p.user_id,
    p.pre1_team_matchup_id,
    p.pre2_team_matchup_id,
    p.pre3_team_matchup_id,
    p.reg1_team_matchup_id,
    p.reg2_team_matchup_id,
    p.reg3_team_matchup_id,
    p.reg4_team_matchup_id,
    p.reg5_team_matchup_id,
    p.reg6_team_matchup_id,
    p.reg7_team_matchup_id,
    p.reg8_team_matchup_id,
    p.reg9_team_matchup_id,
    p.reg10_team_matchup_id,
    p.reg11_team_matchup_id,
    p.reg12_team_matchup_id,
    p.reg13_team_matchup_id,
    p.reg14_team_matchup_id,
    p.reg15_team_matchup_id,
    p.reg16_team_matchup_id,
    p.reg17_team_matchup_id,
    p.reg18_team_matchup_id,
    p.post1_team_matchup_id,
    p.post2_team_matchup_id,
    p.post3_team_matchup_id,
    p.post4_team_matchup_id
  FROM public.picks p
  WHERE p.id = p_pick_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments explaining the new columns
COMMENT ON COLUMN public.picks.pre1_team_matchup_id IS 'Team-matchup ID for PRE1 week';
COMMENT ON COLUMN public.picks.pre2_team_matchup_id IS 'Team-matchup ID for PRE2 week';
COMMENT ON COLUMN public.picks.pre3_team_matchup_id IS 'Team-matchup ID for PRE3 week';
COMMENT ON COLUMN public.picks.reg1_team_matchup_id IS 'Team-matchup ID for REG1 week';
COMMENT ON COLUMN public.picks.reg2_team_matchup_id IS 'Team-matchup ID for REG2 week';
COMMENT ON COLUMN public.picks.reg3_team_matchup_id IS 'Team-matchup ID for REG3 week';
COMMENT ON COLUMN public.picks.reg4_team_matchup_id IS 'Team-matchup ID for REG4 week';
COMMENT ON COLUMN public.picks.reg5_team_matchup_id IS 'Team-matchup ID for REG5 week';
COMMENT ON COLUMN public.picks.reg6_team_matchup_id IS 'Team-matchup ID for REG6 week';
COMMENT ON COLUMN public.picks.reg7_team_matchup_id IS 'Team-matchup ID for REG7 week';
COMMENT ON COLUMN public.picks.reg8_team_matchup_id IS 'Team-matchup ID for REG8 week';
COMMENT ON COLUMN public.picks.reg9_team_matchup_id IS 'Team-matchup ID for REG9 week';
COMMENT ON COLUMN public.picks.reg10_team_matchup_id IS 'Team-matchup ID for REG10 week';
COMMENT ON COLUMN public.picks.reg11_team_matchup_id IS 'Team-matchup ID for REG11 week';
COMMENT ON COLUMN public.picks.reg12_team_matchup_id IS 'Team-matchup ID for REG12 week';
COMMENT ON COLUMN public.picks.reg13_team_matchup_id IS 'Team-matchup ID for REG13 week';
COMMENT ON COLUMN public.picks.reg14_team_matchup_id IS 'Team-matchup ID for REG14 week';
COMMENT ON COLUMN public.picks.reg15_team_matchup_id IS 'Team-matchup ID for REG15 week';
COMMENT ON COLUMN public.picks.reg16_team_matchup_id IS 'Team-matchup ID for REG16 week';
COMMENT ON COLUMN public.picks.reg17_team_matchup_id IS 'Team-matchup ID for REG17 week';
COMMENT ON COLUMN public.picks.reg18_team_matchup_id IS 'Team-matchup ID for REG18 week';
COMMENT ON COLUMN public.picks.post1_team_matchup_id IS 'Team-matchup ID for POST1 week';
COMMENT ON COLUMN public.picks.post2_team_matchup_id IS 'Team-matchup ID for POST2 week';
COMMENT ON COLUMN public.picks.post3_team_matchup_id IS 'Team-matchup ID for POST3 week';
COMMENT ON COLUMN public.picks.post4_team_matchup_id IS 'Team-matchup ID for POST4 week';

-- Verify the new columns were added
SELECT 
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
AND column_name LIKE '%_team_matchup_id'
ORDER BY column_name;
