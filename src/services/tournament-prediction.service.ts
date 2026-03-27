import { tournamentPredictionRepository, matchRepository } from '../db/repositories';
import { TournamentPrediction } from '../types';
import { logger } from '../utils/logger';

export class TournamentPredictionService {
  // List of World Cup 2026 qualified teams (this would ideally come from API)
  private readonly worldCupTeams = [
    'Argentina',
    'Brazil',
    'France',
    'England',
    'Spain',
    'Germany',
    'Portugal',
    'Netherlands',
    'Belgium',
    'Italy',
    'Croatia',
    'Uruguay',
    'Colombia',
    'Mexico',
    'USA',
    'Canada',
    'Morocco',
    'Senegal',
    'Japan',
    'South Korea',
    'Australia',
    'Switzerland',
    'Denmark',
    'Poland',
    'Ukraine',
    'Wales',
    'Ecuador',
    'Peru',
    'Chile',
    'Ghana',
    'Cameroon',
    'Tunisia',
    'Saudi Arabia',
    'Iran',
    'Qatar',
    'Costa Rica',
  ].sort();

  getAvailableTeams(): string[] {
    return this.worldCupTeams;
  }

  async canPlacePrediction(): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check if any match has started
      const firstMatch = await matchRepository.getFirstMatch();

      if (!firstMatch) {
        return { allowed: true };
      }

      const now = new Date();
      const matchDate = new Date(firstMatch.match_date);

      if (now >= matchDate) {
        return {
          allowed: false,
          reason: 'Tournament predictions closed - first match has started',
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking if prediction is allowed', { error });
      return { allowed: false, reason: 'Error checking tournament status' };
    }
  }

  async getUserPrediction(userId: number): Promise<TournamentPrediction | null> {
    return tournamentPredictionRepository.findByUserId(userId);
  }

  async placePrediction(
    userId: number,
    firstPlace: string,
    secondPlace: string,
    thirdPlace: string,
    fourthPlace: string
  ): Promise<{ success: boolean; prediction?: TournamentPrediction; error?: string }> {
    try {
      // Validate can still place prediction
      const canPlace = await this.canPlacePrediction();
      if (!canPlace.allowed) {
        return { success: false, error: canPlace.reason };
      }

      // Validate all teams are different
      const teams = [firstPlace, secondPlace, thirdPlace, fourthPlace];
      const uniqueTeams = new Set(teams);
      if (uniqueTeams.size !== 4) {
        return { success: false, error: 'Each position must have a different team' };
      }

      // Validate all teams are valid
      for (const team of teams) {
        if (!this.worldCupTeams.includes(team)) {
          return { success: false, error: `Invalid team: ${team}` };
        }
      }

      // Check if user already has a prediction
      const existing = await tournamentPredictionRepository.findByUserId(userId);

      let prediction: TournamentPrediction;
      if (existing) {
        // Update existing prediction
        prediction = await tournamentPredictionRepository.update(
          userId,
          firstPlace,
          secondPlace,
          thirdPlace,
          fourthPlace
        );
        logger.info('Tournament prediction updated', { userId });
      } else {
        // Create new prediction
        prediction = await tournamentPredictionRepository.create(
          userId,
          firstPlace,
          secondPlace,
          thirdPlace,
          fourthPlace
        );
        logger.info('Tournament prediction created', { userId });
      }

      return { success: true, prediction };
    } catch (error) {
      logger.error('Failed to place tournament prediction', { error, userId });
      return { success: false, error: 'Failed to save prediction. Please try again.' };
    }
  }

  async scorePredictions(
    actualFirstPlace: string,
    actualSecondPlace: string,
    actualThirdPlace: string,
    actualFourthPlace: string
  ): Promise<void> {
    try {
      const predictions = await tournamentPredictionRepository.getAll();

      for (const prediction of predictions) {
        if (prediction.is_scored) continue;

        let bonusPoints = 0;

        if (prediction.first_place === actualFirstPlace) bonusPoints += 7;
        if (prediction.second_place === actualSecondPlace) bonusPoints += 7;
        if (prediction.third_place === actualThirdPlace) bonusPoints += 7;
        if (prediction.fourth_place === actualFourthPlace) bonusPoints += 7;

        await tournamentPredictionRepository.updateBonusPoints(prediction.user_id, bonusPoints);

        logger.info('Tournament prediction scored', {
          userId: prediction.user_id,
          bonusPoints,
        });
      }
    } catch (error) {
      logger.error('Failed to score tournament predictions', { error });
      throw error;
    }
  }
}

export const tournamentPredictionService = new TournamentPredictionService();
