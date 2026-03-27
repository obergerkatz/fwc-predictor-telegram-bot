import { db } from '../database';
import { User } from '../../types';

export class UserRepository {
  async findByTelegramId(telegramId: string): Promise<User | null> {
    const result = await db.query<User>('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    return result.rows[0] || null;
  }

  async findById(id: number): Promise<User | null> {
    const result = await db.query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async upsert(telegramId: string, username: string | null, firstName: string): Promise<User> {
    const result = await db.query<User>(
      `INSERT INTO users (telegram_id, username, first_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (telegram_id) DO UPDATE
       SET username = EXCLUDED.username,
           first_name = EXCLUDED.first_name
       RETURNING *`,
      [telegramId, username, firstName]
    );
    return result.rows[0];
  }
}

export const userRepository = new UserRepository();
