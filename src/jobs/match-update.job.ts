import { footballDataClient } from '../api/football-data.client';
import { matchRepository } from '../db/repositories';
import { matchService } from '../services/match.service';
import { logger } from '../utils/logger';
import { cacheService } from '../services/cache.service';

export class MatchUpdateJob {
  async run(): Promise<void> {
    try {
      logger.info('Starting match update job');

      // Get all live matches and recent scheduled matches
      const matches = await matchRepository.findLiveAndRecent();

      if (matches.length === 0) {
        logger.debug('No matches to update');
        return;
      }

      logger.info(`Updating ${matches.length} matches`);

      let updated = 0;

      for (const match of matches) {
        try {
          // Fetch latest data from API
          const apiMatch = await footballDataClient.getMatchById(match.api_fixture_id);

          if (!apiMatch) {
            logger.warn(`Match not found in API`, { apiFixtureId: match.api_fixture_id });
            continue;
          }

          // Map status
          const newStatus = footballDataClient.mapStatusToMatchStatus(apiMatch.status);

          // Get scores
          const score90min = footballDataClient.get90MinuteScore(apiMatch);
          const scoreFt = footballDataClient.getFullTimeScore(apiMatch);

          // Check if anything changed
          const statusChanged = match.status !== newStatus;
          const scoresChanged =
            match.home_score !== score90min.home ||
            match.away_score !== score90min.away ||
            match.home_score_ft !== scoreFt.home ||
            match.away_score_ft !== scoreFt.away;

          if (statusChanged || scoresChanged) {
            await matchRepository.upsert(
              apiMatch.id,
              match.league_id,
              apiMatch.homeTeam.name,
              apiMatch.awayTeam.name,
              new Date(apiMatch.utcDate),
              newStatus,
              score90min.home,
              score90min.away,
              scoreFt.home,
              scoreFt.away
            );

            // Clear caches for this specific match
            matchService.clearMatchCache(match.id);
            cacheService.delete(`fd:match:${match.api_fixture_id}`);

            logger.info('Match updated', {
              matchId: match.id,
              apiFixtureId: match.api_fixture_id,
              oldStatus: match.status,
              newStatus,
              score: score90min.home !== null ? `${score90min.home}-${score90min.away}` : 'N/A',
            });

            updated++;
          }
        } catch (error) {
          logger.error(`Failed to update match`, { error, matchId: match.id });
          // Continue with next match
        }
      }

      // If any matches were updated, clear match list caches
      if (updated > 0) {
        matchService.clearMatchListCaches();
      }

      logger.info(`Match update job completed. Updated ${updated} matches`);
    } catch (error) {
      logger.error('Match update job failed', { error });
      throw error;
    }
  }
}

export const matchUpdateJob = new MatchUpdateJob();
