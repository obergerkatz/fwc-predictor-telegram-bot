import { db } from '../database';
import { GroupStagePrediction } from '../../types';

export class GroupStagePredictionRepository {
  async create(
    userId: number,
    predictions: Record<string, string[]>
  ): Promise<GroupStagePrediction> {
    const result = await db.query<GroupStagePrediction>(
      `INSERT INTO group_stage_predictions (user_id, predictions)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET
         predictions = $2,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, JSON.stringify(predictions)]
    );

    // Parse the JSON predictions field
    const row = result.rows[0];
    if (typeof row.predictions === 'string') {
      row.predictions = JSON.parse(row.predictions);
    }

    return row;
  }

  async findByUserId(userId: number): Promise<GroupStagePrediction | null> {
    const result = await db.query<GroupStagePrediction>(
      'SELECT * FROM group_stage_predictions WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Parse the JSON predictions field if it's a string
    if (typeof row.predictions === 'string') {
      row.predictions = JSON.parse(row.predictions);
    }

    return row as GroupStagePrediction;
  }

  async updateBonusPoints(userId: number, bonusPoints: number): Promise<void> {
    await db.query(
      `UPDATE group_stage_predictions
       SET bonus_points = $1, is_scored = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [bonusPoints, userId]
    );
  }
}

export const groupStagePredictionRepository = new GroupStagePredictionRepository();
