-- Drop existing group stage predictions table and recreate with all 12 groups
DROP TABLE IF EXISTS group_stage_predictions CASCADE;

CREATE TABLE group_stage_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Group A-L qualifiers (storing as JSON for flexibility)
    predictions JSONB NOT NULL,
    
    -- Scoring
    bonus_points INTEGER DEFAULT 0,
    is_scored BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Recreate leaderboard view
DROP VIEW IF EXISTS leaderboard_view;

CREATE VIEW leaderboard_view AS
SELECT
    u.id AS user_id,
    u.telegram_id,
    u.username,
    u.first_name,
    COALESCE(SUM(s.points_awarded), 0) + COALESCE(tp.bonus_points, 0) + COALESCE(gsp.bonus_points, 0) AS total_points,
    COUNT(b.id) AS total_bets,
    COUNT(CASE WHEN s.id IS NOT NULL THEN 1 END) AS scored_bets,
    COUNT(CASE WHEN s.score_type = 'exact' THEN 1 END) AS exact_scores,
    COUNT(CASE WHEN s.score_type = 'goal_diff' THEN 1 END) AS goal_diffs,
    COUNT(CASE WHEN s.score_type = 'partial' AND s.points_awarded = 3 THEN 1 END) AS three_pt_scores,
    COUNT(CASE WHEN s.score_type = 'partial' AND s.points_awarded = 1 THEN 1 END) AS one_pt_scores,
    COUNT(CASE WHEN s.score_type = 'none' THEN 1 END) AS zero_scores,
    COALESCE(tp.bonus_points, 0) + COALESCE(gsp.bonus_points, 0) AS bonus_points
FROM users u
LEFT JOIN bets b ON u.id = b.user_id
LEFT JOIN scores s ON b.id = s.bet_id
LEFT JOIN tournament_predictions tp ON u.id = tp.user_id
LEFT JOIN group_stage_predictions gsp ON u.id = gsp.user_id
GROUP BY u.id, u.telegram_id, u.username, u.first_name, tp.bonus_points, gsp.bonus_points;
