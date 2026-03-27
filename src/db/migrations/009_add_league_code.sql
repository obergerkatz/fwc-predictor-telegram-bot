-- Add code column to leagues table to store competition codes (CL, WC, PL, etc.)
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS code VARCHAR(10);

-- Create index on code for efficient filtering
CREATE INDEX IF NOT EXISTS idx_leagues_code ON leagues(code);

-- Update existing leagues with their codes based on api_league_id
-- Football-Data.org IDs:
-- 2000 = WC (World Cup)
-- 2001 = CL (Champions League)
-- 2018 = EC (European Championship)
-- 2021 = PL (Premier League)
-- 2014 = PD (La Liga)
-- 2002 = BL1 (Bundesliga)
-- 2015 = FL1 (Ligue 1)
-- 2019 = SA (Serie A)

UPDATE leagues SET code = 'WC' WHERE api_league_id = 2000 AND code IS NULL;
UPDATE leagues SET code = 'CL' WHERE api_league_id = 2001 AND code IS NULL;
UPDATE leagues SET code = 'EC' WHERE api_league_id = 2018 AND code IS NULL;
UPDATE leagues SET code = 'PL' WHERE api_league_id = 2021 AND code IS NULL;
UPDATE leagues SET code = 'PD' WHERE api_league_id = 2014 AND code IS NULL;
UPDATE leagues SET code = 'BL1' WHERE api_league_id = 2002 AND code IS NULL;
UPDATE leagues SET code = 'FL1' WHERE api_league_id = 2015 AND code IS NULL;
UPDATE leagues SET code = 'SA' WHERE api_league_id = 2019 AND code IS NULL;
