import { db } from '../database';
import { Score, ScoreType } from '../../types';

export class ScoreRepository {
  async findByBetId(betId: number): Promise<Score | null> {
    const result = await db.query<Score>('SELECT * FROM scores WHERE bet_id = $1', [betId]);
    return result.rows[0] || null;
  }

  async create(betId: number, pointsAwarded: number, scoreType: ScoreType): Promise<Score> {
    const result = await db.query<Score>(
      `INSERT INTO scores (bet_id, points_awarded, score_type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [betId, pointsAwarded, scoreType]
    );
    return result.rows[0];
  }
}

export const scoreRepository = new ScoreRepository();
