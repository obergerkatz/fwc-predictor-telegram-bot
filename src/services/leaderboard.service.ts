import { leaderboardRepository } from '../db/repositories';
import { LeaderboardEntry } from '../types';
import { logger } from '../utils/logger';

export class LeaderboardService {
  async getLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
    try {
      const leaderboard = await leaderboardRepository.getLeaderboard(limit);
      logger.debug(`Retrieved leaderboard with ${leaderboard.length} entries`);
      return leaderboard;
    } catch (error) {
      logger.error('Failed to get leaderboard', { error });
      throw error;
    }
  }

  async getUserRank(userId: number): Promise<{ rank: number; total_users: number } | null> {
    try {
      const rankInfo = await leaderboardRepository.getUserRank(userId);
      return rankInfo;
    } catch (error) {
      logger.error('Failed to get user rank', { error, userId });
      throw error;
    }
  }
}

export const leaderboardService = new LeaderboardService();
