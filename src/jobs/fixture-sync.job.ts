import { footballDataClient } from '../api/football-data.client';
import { leagueRepository, matchRepository } from '../db/repositories';
import { matchService } from '../services/match.service';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { cacheService } from '../services/cache.service';

export class FixtureSyncJob {
  async run(): Promise<void> {
    try {
      logger.info('Starting fixture sync job');

      const competitionCodes = config.leagues.defaultLeagueIds;

      let totalSynced = 0;

      for (const competitionCode of competitionCodes) {
        try {
          logger.info(`Syncing fixtures for competition ${competitionCode}`);

          // Get competition info
          const competition = await footballDataClient.getCompetition(competitionCode);
          if (!competition) {
            logger.warn(`Competition not found: ${competitionCode}`);
            continue;
          }

          // Fetch matches (no date range to get all matches for current season)
          const matches = await footballDataClient.getMatches(competitionCode);

          if (matches.length === 0) {
            logger.info(`No matches found for competition ${competitionCode}`);
            continue;
          }

          // Ensure league exists in database
          const league = await leagueRepository.upsert(
            competition.id,
            competition.name,
            competition.area.name,
            competition.currentSeason.id,
            competition.emblem
          );

          // Sync each match
          for (const match of matches) {
            // Skip matches where teams are not yet determined (TBD)
            if (
              !match.homeTeam ||
              !match.awayTeam ||
              !match.homeTeam.name ||
              !match.awayTeam.name
            ) {
              logger.debug('Skipping match with TBD teams', { matchId: match.id });
              continue;
            }

            const status = footballDataClient.mapStatusToMatchStatus(match.status);
            const matchDate = new Date(match.utcDate);
            const score90min = footballDataClient.get90MinuteScore(match);
            const scoreFt = footballDataClient.getFullTimeScore(match);

            await matchRepository.upsert(
              match.id,
              league.id,
              match.homeTeam.name,
              match.awayTeam.name,
              matchDate,
              status,
              score90min.home,
              score90min.away,
              scoreFt.home,
              scoreFt.away
            );

            totalSynced++;
          }

          logger.info(`Synced ${matches.length} matches for competition ${competitionCode}`);

          // Clear caches for this competition
          cacheService.delete(`fd:matches:${competitionCode}:all:all`);
          cacheService.delete(`fd:standings:${competitionCode}`);
        } catch (error) {
          logger.error(`Failed to sync competition ${competitionCode}`, { error });
          // Continue with next competition
        }
      }

      // Clear all match list caches after sync
      if (totalSynced > 0) {
        matchService.clearMatchListCaches();
        // Also clear groups cache as new matches might affect group stage
        cacheService.delete('groups:data');
      }

      logger.info(`Fixture sync job completed. Synced ${totalSynced} fixtures`);
    } catch (error) {
      logger.error('Fixture sync job failed', { error });
      throw error;
    }
  }
}

export const fixtureSyncJob = new FixtureSyncJob();
