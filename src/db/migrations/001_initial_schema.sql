-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- Create leagues table
CREATE TABLE IF NOT EXISTS leagues (
    id SERIAL PRIMARY KEY,
    api_league_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    season INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    logo_url TEXT,
    UNIQUE(api_league_id, season)
);

CREATE INDEX idx_leagues_api_id ON leagues(api_league_id);
CREATE INDEX idx_leagues_active ON leagues(is_active) WHERE is_active = true;

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    api_fixture_id INTEGER UNIQUE NOT NULL,
    league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    home_team VARCHAR(255) NOT NULL,
    away_team VARCHAR(255) NOT NULL,
    match_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    home_score INTEGER,
    away_score INTEGER,
    home_score_ft INTEGER,
    away_score_ft INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_matches_api_fixture_id ON matches(api_fixture_id);
CREATE INDEX idx_matches_league_id ON matches(league_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_date_status ON matches(match_date, status);

-- Create bets table
CREATE TABLE IF NOT EXISTS bets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    predicted_home_score INTEGER NOT NULL CHECK (predicted_home_score >= 0),
    predicted_away_score INTEGER NOT NULL CHECK (predicted_away_score >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, match_id)
);

CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_match_id ON bets(match_id);
CREATE INDEX idx_bets_user_match ON bets(user_id, match_id);

-- Create scores table
CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    bet_id INTEGER UNIQUE NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0 AND points_awarded <= 6),
    score_type VARCHAR(50) NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scores_bet_id ON scores(bet_id);

-- Create view for leaderboard with point breakdown
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
    u.id as user_id,
    u.telegram_id,
    u.username,
    u.first_name,
    COALESCE(SUM(s.points_awarded), 0) as total_points,
    COUNT(DISTINCT b.id) as total_bets,
    COUNT(DISTINCT s.id) as scored_bets,
    COUNT(DISTINCT CASE WHEN s.points_awarded = 6 THEN s.id END) as exact_scores,
    COUNT(DISTINCT CASE WHEN s.points_awarded = 4 THEN s.id END) as goal_diffs,
    COUNT(DISTINCT CASE WHEN s.points_awarded > 0 AND s.points_awarded < 4 THEN s.id END) as partial_scores,
    COUNT(DISTINCT CASE WHEN s.points_awarded = 0 THEN s.id END) as zero_scores
FROM users u
LEFT JOIN bets b ON u.id = b.user_id
LEFT JOIN scores s ON b.id = s.bet_id
GROUP BY u.id, u.telegram_id, u.username, u.first_name
ORDER BY total_points DESC, scored_bets DESC, total_bets DESC;
