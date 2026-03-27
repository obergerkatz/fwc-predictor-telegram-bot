-- Tournament predictions table
CREATE TABLE IF NOT EXISTS tournament_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_place VARCHAR(100) NOT NULL,
  second_place VARCHAR(100) NOT NULL,
  third_place VARCHAR(100) NOT NULL,
  fourth_place VARCHAR(100) NOT NULL,
  bonus_points INTEGER DEFAULT 0,
  is_scored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_predictions_user_id ON tournament_predictions(user_id);

-- Update leaderboard view to include tournament prediction bonus points
DROP VIEW IF EXISTS leaderboard_view;

CREATE VIEW leaderboard_view AS
SELECT
    u.id as user_id,
    u.telegram_id,
    u.username,
    u.first_name,
    COUNT(DISTINCT b.id) as total_bets,
    COALESCE(SUM(s.points_awarded), 0) + COALESCE(tp.bonus_points, 0) as total_points,
    COUNT(DISTINCT CASE WHEN s.points_awarded = 6 THEN s.id END) as exact_scores,
    COUNT(DISTINCT CASE WHEN s.points_awarded = 4 THEN s.id END) as goal_diffs,
    COUNT(DISTINCT CASE WHEN s.points_awarded = 3 THEN s.id END) as three_pt_scores,
    COUNT(DISTINCT CASE WHEN s.points_awarded = 1 THEN s.id END) as one_pt_scores,
    COUNT(DISTINCT CASE WHEN s.points_awarded = 0 THEN s.id END) as zero_scores,
    (COUNT(DISTINCT CASE WHEN s.points_awarded = 6 THEN s.id END) +
     COUNT(DISTINCT CASE WHEN s.points_awarded = 4 THEN s.id END) +
     COUNT(DISTINCT CASE WHEN s.points_awarded = 3 THEN s.id END) +
     COUNT(DISTINCT CASE WHEN s.points_awarded = 1 THEN s.id END) +
     COUNT(DISTINCT CASE WHEN s.points_awarded = 0 THEN s.id END)) as scored_bets,
    COALESCE(tp.bonus_points, 0) as bonus_points
FROM users u
LEFT JOIN bets b ON u.id = b.user_id
LEFT JOIN scores s ON b.id = s.bet_id
LEFT JOIN tournament_predictions tp ON u.id = tp.user_id
GROUP BY u.id, u.telegram_id, u.username, u.first_name, tp.bonus_points;
