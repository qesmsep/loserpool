-- Fix team_matchup_id columns to use TEXT instead of UUID
-- This allows us to store matchup_id + team_initials as text

-- First, drop any existing constraints that might prevent the change
ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_team_matchup_id_unique;
DROP INDEX IF EXISTS idx_picks_team_matchup_id;
DROP INDEX IF EXISTS idx_picks_pre1;
DROP INDEX IF EXISTS idx_picks_pre2;
DROP INDEX IF EXISTS idx_picks_pre3;
DROP INDEX IF EXISTS idx_picks_reg1;
DROP INDEX IF EXISTS idx_picks_reg2;
DROP INDEX IF EXISTS idx_picks_reg3;
DROP INDEX IF EXISTS idx_picks_reg4;
DROP INDEX IF EXISTS idx_picks_reg5;
DROP INDEX IF EXISTS idx_picks_reg6;
DROP INDEX IF EXISTS idx_picks_reg7;
DROP INDEX IF EXISTS idx_picks_reg8;
DROP INDEX IF EXISTS idx_picks_reg9;
DROP INDEX IF EXISTS idx_picks_reg10;
DROP INDEX IF EXISTS idx_picks_reg11;
DROP INDEX IF EXISTS idx_picks_reg12;
DROP INDEX IF EXISTS idx_picks_reg13;
DROP INDEX IF EXISTS idx_picks_reg14;
DROP INDEX IF EXISTS idx_picks_reg15;
DROP INDEX IF EXISTS idx_picks_reg16;
DROP INDEX IF EXISTS idx_picks_reg17;
DROP INDEX IF EXISTS idx_picks_reg18;
DROP INDEX IF EXISTS idx_picks_post1;
DROP INDEX IF EXISTS idx_picks_post2;
DROP INDEX IF EXISTS idx_picks_post3;
DROP INDEX IF EXISTS idx_picks_post4;

-- Change all team_matchup_id columns from UUID to TEXT
ALTER TABLE public.picks ALTER COLUMN pre1_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN pre2_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN pre3_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg1_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg2_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg3_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg4_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg5_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg6_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg7_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg8_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg9_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg10_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg11_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg12_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg13_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg14_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg15_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg16_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg17_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN reg18_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN post1_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN post2_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN post3_team_matchup_id TYPE TEXT;
ALTER TABLE public.picks ALTER COLUMN post4_team_matchup_id TYPE TEXT;

-- Recreate indexes for TEXT columns
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
