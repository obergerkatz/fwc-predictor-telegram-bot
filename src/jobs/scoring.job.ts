import { matchService } from '../services/match.service';
import { scoringService } from '../services/scoring.service';
import { logger } from '../utils/logger';

export class ScoringJob {
  async run(): Promise<void> {
    try {
      logger.info('Starting scoring job');

      // Get all finished matches
      const finishedMatches = await matchService.getMatchesForScoring();

      if (finishedMatches.length === 0) {
        logger.debug('No finished matches to score');
        return;
      }

      logger.info(`Processing ${finishedMatches.length} finished matches for scoring`);

      let totalBetsScored = 0;

      for (const match of finishedMatches) {
        try {
          const betsScored = await scoringService.scoreMatchBets(match);
          totalBetsScored += betsScored;

          if (betsScored > 0) {
            logger.info('Match bets scored', {
              matchId: match.id,
              homeTeam: match.home_team,
              awayTeam: match.away_team,
              score: `${match.home_score}-${match.away_score}`,
              betsScored,
            });
          }
        } catch (error) {
          logger.error('Failed to score match', { error, matchId: match.id });
          // Continue with next match
        }
      }

      logger.info(
        `Scoring job completed. Scored ${totalBetsScored} bets across ${finishedMatches.length} matches`
      );
    } catch (error) {
      logger.error('Scoring job failed', { error });
      throw error;
    }
  }
}

export const scoringJob = new ScoringJob();
