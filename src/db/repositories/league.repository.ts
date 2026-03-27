import { db } from '../database';
import { League } from '../../types';

export class LeagueRepository {
  async upsert(
    apiLeagueId: number,
    name: string,
    country: string,
    season: number,
    code?: string,
    logoUrl?: string
  ): Promise<League> {
    const result = await db.query<League>(
      `INSERT INTO leagues (api_league_id, name, country, season, code, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (api_league_id, season) DO UPDATE
       SET name = EXCLUDED.name,
           country = EXCLUDED.country,
           code = EXCLUDED.code,
           logo_url = EXCLUDED.logo_url
       RETURNING *`,
      [apiLeagueId, name, country, season, code || null, logoUrl || null]
    );
    return result.rows[0];
  }

  async findActive(): Promise<League[]> {
    const result = await db.query<League>(
      'SELECT * FROM leagues WHERE is_active = true ORDER BY name ASC'
    );
    return result.rows;
  }
}

export const leagueRepository = new LeagueRepository();
