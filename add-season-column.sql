-- Add season column to matchups table
ALTER TABLE matchups ADD COLUMN IF NOT EXISTS season TEXT;

-- Update existing matchups with season information
-- Week 1 = Reg1 (Regular Season Week 1)
UPDATE matchups SET season = 'Reg1' WHERE week = 1;

-- Week 2 = Reg2 (Regular Season Week 2)  
UPDATE matchups SET season = 'Reg2' WHERE week = 2;

-- Week 3 = Reg3 (Regular Season Week 3)
UPDATE matchups SET season = 'Reg3' WHERE week = 3;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_matchups_season ON matchups(season);

-- Add constraint to ensure season is not null
ALTER TABLE matchups ALTER COLUMN season SET NOT NULL;
