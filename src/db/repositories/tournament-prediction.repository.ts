import { db } from '../database';
import { TournamentPrediction } from '../../types';

export class TournamentPredictionRepository {
  async findByUserId(userId: number): Promise<TournamentPrediction | null> {
    const result = await db.query<TournamentPrediction>(
      'SELECT * FROM tournament_predictions WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  async create(
    userId: number,
    firstPlace: string,
    secondPlace: string,
    thirdPlace: string,
    fourthPlace: string
  ): Promise<TournamentPrediction> {
    const result = await db.query<TournamentPrediction>(
      `INSERT INTO tournament_predictions (user_id, first_place, second_place, third_place, fourth_place)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, firstPlace, secondPlace, thirdPlace, fourthPlace]
    );
    return result.rows[0];
  }

  async update(
    userId: number,
    firstPlace: string,
    secondPlace: string,
    thirdPlace: string,
    fourthPlace: string
  ): Promise<TournamentPrediction> {
    const result = await db.query<TournamentPrediction>(
      `UPDATE tournament_predictions
       SET first_place = $2, second_place = $3, third_place = $4, fourth_place = $5
       WHERE user_id = $1
       RETURNING *`,
      [userId, firstPlace, secondPlace, thirdPlace, fourthPlace]
    );
    return result.rows[0];
  }

  async updateBonusPoints(userId: number, bonusPoints: number): Promise<void> {
    await db.query(
      `UPDATE tournament_predictions
       SET bonus_points = $2, is_scored = TRUE
       WHERE user_id = $1`,
      [userId, bonusPoints]
    );
  }

  async getAll(): Promise<TournamentPrediction[]> {
    const result = await db.query<TournamentPrediction>(
      'SELECT * FROM tournament_predictions ORDER BY created_at ASC'
    );
    return result.rows;
  }
}

export const tournamentPredictionRepository = new TournamentPredictionRepository();
