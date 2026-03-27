-- Add league_id to tournament_predictions table
ALTER TABLE tournament_predictions
  ADD COLUMN IF NOT EXISTS league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE;

-- Populate league_id with first active league for existing predictions
UPDATE tournament_predictions
SET league_id = (SELECT id FROM leagues WHERE is_active = true ORDER BY id LIMIT 1)
WHERE league_id IS NULL;

-- Make league_id NOT NULL after populating
ALTER TABLE tournament_predictions
  ALTER COLUMN league_id SET NOT NULL;

-- Drop old unique constraint and create new one with league_id
ALTER TABLE tournament_predictions
  DROP CONSTRAINT IF EXISTS tournament_predictions_user_id_key;

ALTER TABLE tournament_predictions
  ADD CONSTRAINT tournament_predictions_user_league_unique UNIQUE (user_id, league_id);

-- Create index on league_id
CREATE INDEX IF NOT EXISTS idx_tournament_predictions_league_id ON tournament_predictions(league_id);

-- Add league_id to group_stage_predictions table
ALTER TABLE group_stage_predictions
  ADD COLUMN IF NOT EXISTS league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE;

-- Populate league_id with first active league for existing predictions
UPDATE group_stage_predictions
SET league_id = (SELECT id FROM leagues WHERE is_active = true ORDER BY id LIMIT 1)
WHERE league_id IS NULL;

-- Make league_id NOT NULL after populating
ALTER TABLE group_stage_predictions
  ALTER COLUMN league_id SET NOT NULL;

-- Drop old unique constraint and create new one with league_id
ALTER TABLE group_stage_predictions
  DROP CONSTRAINT IF EXISTS group_stage_predictions_user_id_key;

ALTER TABLE group_stage_predictions
  ADD CONSTRAINT group_stage_predictions_user_league_unique UNIQUE (user_id, league_id);

-- Create index on league_id
CREATE INDEX IF NOT EXISTS idx_group_stage_predictions_league_id ON group_stage_predictions(league_id);

-- Update leaderboard view to only include bonus points from active leagues
DROP VIEW IF EXISTS leaderboard_view;

CREATE VIEW leaderboard_view AS
SELECT
    u.id AS user_id,
    u.telegram_id,
    u.username,
    u.first_name,
    COALESCE(SUM(s.points_awarded), 0) + COALESCE(SUM(tp.bonus_points), 0) + COALESCE(SUM(gsp.bonus_points), 0) AS total_points,
    COUNT(b.id) AS total_bets,
    COUNT(CASE WHEN s.id IS NOT NULL THEN 1 END) AS scored_bets,
    COUNT(CASE WHEN s.score_type = 'exact' THEN 1 END) AS exact_scores,
    COUNT(CASE WHEN s.score_type = 'goal_diff' THEN 1 END) AS goal_diffs,
    COUNT(CASE WHEN s.score_type = 'partial' AND s.points_awarded = 3 THEN 1 END) AS three_pt_scores,
    COUNT(CASE WHEN s.score_type = 'partial' AND s.points_awarded = 1 THEN 1 END) AS one_pt_scores,
    COUNT(CASE WHEN s.score_type = 'none' THEN 1 END) AS zero_scores,
    COALESCE(SUM(tp.bonus_points), 0) + COALESCE(SUM(gsp.bonus_points), 0) AS bonus_points
FROM users u
LEFT JOIN bets b ON u.id = b.user_id
LEFT JOIN scores s ON b.id = s.bet_id
LEFT JOIN tournament_predictions tp ON u.id = tp.user_id
LEFT JOIN group_stage_predictions gsp ON u.id = gsp.user_id
LEFT JOIN leagues l_tp ON tp.league_id = l_tp.id
LEFT JOIN leagues l_gsp ON gsp.league_id = l_gsp.id
WHERE (l_tp.is_active = true OR tp.league_id IS NULL)
  AND (l_gsp.is_active = true OR gsp.league_id IS NULL)
GROUP BY u.id, u.telegram_id, u.username, u.first_name;
