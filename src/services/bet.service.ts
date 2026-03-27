import { betRepository } from '../db/repositories';
import { Bet, BetWithMatch, ScorePrediction } from '../types';
import { matchService } from './match.service';
import { logger } from '../utils/logger';

export class BetService {
  async placeBet(
    userId: number,
    matchId: number,
    prediction: ScorePrediction
  ): Promise<{ success: boolean; bet?: Bet; error?: string }> {
    try {
      // Validate that betting is allowed for this match
      const canBet = await matchService.canPlaceBet(matchId);
      if (!canBet.allowed) {
        return { success: false, error: canBet.reason };
      }

      // Check if user already has a bet for this match
      const existingBet = await betRepository.findByUserAndMatch(userId, matchId);
      if (existingBet) {
        return { success: false, error: 'You have already placed a bet on this match' };
      }

      // Create bet
      const bet = await betRepository.create(userId, matchId, prediction.home, prediction.away);

      logger.info('Bet placed successfully', {
        betId: bet.id,
        userId,
        matchId,
        prediction: `${prediction.home}-${prediction.away}`,
      });

      return { success: true, bet };
    } catch (error) {
      logger.error('Failed to place bet', { error, userId, matchId, prediction });
      return { success: false, error: 'Failed to place bet. Please try again.' };
    }
  }

  async getUserBets(userId: number): Promise<BetWithMatch[]> {
    try {
      const bets = await betRepository.findByUser(userId);
      logger.debug(`Retrieved ${bets.length} bets for user`, { userId });
      return bets;
    } catch (error) {
      logger.error('Failed to get user bets', { error, userId });
      throw error;
    }
  }

  async getUserBetForMatch(userId: number, matchId: number): Promise<Bet | null> {
    return betRepository.findByUserAndMatch(userId, matchId);
  }

  async getUserBetForMatchWithScore(userId: number, matchId: number): Promise<BetWithMatch | null> {
    return betRepository.findByUserAndMatchWithScore(userId, matchId);
  }

  async getMatchBets(matchId: number): Promise<Bet[]> {
    return betRepository.findByMatch(matchId);
  }

  async getBetScore(betId: number): Promise<{ points_awarded: number } | null> {
    try {
      const result = await betRepository.getBetScore(betId);
      return result;
    } catch (error) {
      logger.error('Failed to get bet score', { error, betId });
      return null;
    }
  }

  async updateBet(
    userId: number,
    matchId: number,
    prediction: ScorePrediction
  ): Promise<{ success: boolean; bet?: Bet; error?: string }> {
    try {
      // Validate that betting is allowed for this match
      const canBet = await matchService.canPlaceBet(matchId);
      if (!canBet.allowed) {
        return { success: false, error: canBet.reason };
      }

      // Get existing bet
      const existingBet = await betRepository.findByUserAndMatch(userId, matchId);
      if (!existingBet) {
        return { success: false, error: 'No existing bet found for this match' };
      }

      // Update bet
      const bet = await betRepository.update(existingBet.id, prediction.home, prediction.away);

      logger.info('Bet updated successfully', {
        betId: bet.id,
        userId,
        matchId,
        oldPrediction: `${existingBet.predicted_home_score}-${existingBet.predicted_away_score}`,
        newPrediction: `${prediction.home}-${prediction.away}`,
      });

      return { success: true, bet };
    } catch (error) {
      logger.error('Failed to update bet', { error, userId, matchId, prediction });
      return { success: false, error: 'Failed to update bet. Please try again.' };
    }
  }
}

export const betService = new BetService();
