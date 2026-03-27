import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { APIFootballResponse, APIFootballFixture, MatchStatus, StandingsResponse } from '../types';
import { cacheService } from '../services/cache.service';

const CACHE_TTL = {
  FIXTURES: 60 * 60, // 1 hour
  STANDINGS: 60 * 60, // 1 hour
  TEAMS: 24 * 60 * 60, // 24 hours
  LEAGUE_INFO: 24 * 60 * 60, // 24 hours
  MATCH_BY_ID: 5 * 60, // 5 minutes
};

export class APIFootballClient {
  private client: AxiosInstance;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1000; // 1 second between requests

  constructor() {
    // Detect which API we're using based on base URL
    const isFootballDataOrg = config.apiFootball.baseUrl.includes('football-data.org');

    this.client = axios.create({
      baseURL: config.apiFootball.baseUrl,
      headers: isFootballDataOrg
        ? { 'X-Auth-Token': config.apiFootball.apiKey }
        : { 'x-apisports-key': config.apiFootball.apiKey },
      timeout: 10000,
    });

    // Request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minRequestInterval) {
        const waitTime = this.minRequestInterval - timeSinceLastRequest;
        logger.debug(`Rate limiting: waiting ${waitTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      this.lastRequestTime = Date.now();
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        logger.error('API-Football request failed', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        throw error;
      }
    );
  }

  async getFixtures(
    leagueId: number,
    season: number,
    from?: Date,
    to?: Date
  ): Promise<APIFootballFixture[]> {
    try {
      const cacheKey = `fixtures:${leagueId}:${season}:${from?.toISOString().split('T')[0] || 'all'}:${to?.toISOString().split('T')[0] || 'all'}`;
      const cached = cacheService.get<APIFootballFixture[]>(cacheKey);

      if (cached) {
        logger.debug('Returning cached fixtures', { leagueId, season });
        return cached;
      }

      const params: Record<string, string | number> = {
        league: leagueId,
        season: season,
      };

      if (from) {
        params.from = from.toISOString().split('T')[0];
      }

      if (to) {
        params.to = to.toISOString().split('T')[0];
      }

      logger.info('Fetching fixtures from API-Football', { leagueId, season, from, to });

      const response = await this.client.get<APIFootballResponse<APIFootballFixture>>('/fixtures', {
        params,
      });

      if (response.data.errors && Object.keys(response.data.errors).length > 0) {
        logger.error('API-Football returned errors', { errors: response.data.errors });
        throw new Error(`API-Football errors: ${JSON.stringify(response.data.errors)}`);
      }

      logger.info(`Fetched ${response.data.results} fixtures`, { leagueId, season });
      cacheService.set(cacheKey, response.data.response, CACHE_TTL.FIXTURES);
      return response.data.response;
    } catch (error) {
      logger.error('Failed to fetch fixtures', { error, leagueId, season });
      throw error;
    }
  }

  async getFixtureById(fixtureId: number): Promise<APIFootballFixture | null> {
    try {
      const cacheKey = `fixture:${fixtureId}`;
      const cached = cacheService.get<APIFootballFixture>(cacheKey);

      if (cached) {
        logger.debug('Returning cached fixture', { fixtureId });
        return cached;
      }

      logger.debug('Fetching fixture by ID', { fixtureId });

      const response = await this.client.get<APIFootballResponse<APIFootballFixture>>('/fixtures', {
        params: { id: fixtureId },
      });

      if (response.data.errors && Object.keys(response.data.errors).length > 0) {
        logger.error('API-Football returned errors', { errors: response.data.errors });
        return null;
      }

      if (response.data.results === 0) {
        logger.warn('Fixture not found', { fixtureId });
        return null;
      }

      const fixture = response.data.response[0];
      cacheService.set(cacheKey, fixture, CACHE_TTL.MATCH_BY_ID);
      return fixture;
    } catch (error) {
      logger.error('Failed to fetch fixture by ID', { error, fixtureId });
      throw error;
    }
  }

  mapApiStatusToMatchStatus(apiStatus: string): MatchStatus {
    const statusMap: Record<string, MatchStatus> = {
      // Not started
      TBD: MatchStatus.SCHEDULED,
      NS: MatchStatus.SCHEDULED,
      // Live statuses
      '1H': MatchStatus.LIVE,
      HT: MatchStatus.LIVE,
      '2H': MatchStatus.LIVE,
      ET: MatchStatus.LIVE,
      BT: MatchStatus.LIVE,
      P: MatchStatus.LIVE,
      SUSP: MatchStatus.LIVE,
      INT: MatchStatus.LIVE,
      LIVE: MatchStatus.LIVE,
      // Finished
      FT: MatchStatus.FINISHED,
      AET: MatchStatus.FINISHED,
      PEN: MatchStatus.FINISHED,
      // Cancelled/Postponed
      PST: MatchStatus.POSTPONED,
      CANC: MatchStatus.CANCELLED,
      ABD: MatchStatus.CANCELLED,
      AWD: MatchStatus.FINISHED,
      WO: MatchStatus.FINISHED,
    };

    return statusMap[apiStatus] || MatchStatus.SCHEDULED;
  }

  /**
   * Extracts the 90-minute score from API response.
   * If extra time was played, uses fulltime scores (which is 90min result).
   * Otherwise uses goals field.
   */
  get90MinuteScore(fixture: APIFootballFixture): { home: number | null; away: number | null } {
    // If there was extra time, the fulltime score represents the 90-minute result
    if (fixture.score.extratime.home !== null && fixture.score.extratime.away !== null) {
      return {
        home: fixture.score.fulltime.home,
        away: fixture.score.fulltime.away,
      };
    }

    // Otherwise, use the regular goals (which is fulltime if match is finished)
    return {
      home: fixture.goals.home,
      away: fixture.goals.away,
    };
  }

  /**
   * Gets the full-time score including extra time if applicable
   */
  getFullTimeScore(fixture: APIFootballFixture): { home: number | null; away: number | null } {
    // If there was extra time, use extra time scores
    if (fixture.score.extratime.home !== null && fixture.score.extratime.away !== null) {
      return {
        home: fixture.score.extratime.home,
        away: fixture.score.extratime.away,
      };
    }

    // Otherwise, use regular goals
    return {
      home: fixture.goals.home,
      away: fixture.goals.away,
    };
  }

  /**
   * Maps football-data.org league IDs to competition codes
   */
  private getCompetitionCode(leagueId: number): string {
    const codeMap: Record<number, string> = {
      2000: 'WC', // FIFA World Cup
      2001: 'CL', // Champions League
      2002: 'BL1', // Bundesliga
      2003: 'DED', // Eredivisie
      2014: 'PD', // La Liga
      2015: 'FL1', // Ligue 1
      2016: 'EC', // European Championship
      2017: 'PPL', // Primeira Liga
      2019: 'SA', // Serie A
      2021: 'PL', // Premier League
    };
    return codeMap[leagueId] || leagueId.toString();
  }

  /**
   * Fetches standings/groups for a league
   */
  async getStandings(leagueId: number, season: number): Promise<StandingsResponse> {
    try {
      const cacheKey = `standings:${leagueId}:${season}`;
      const cached = cacheService.get<StandingsResponse>(cacheKey);

      if (cached) {
        logger.debug('Returning cached standings', { leagueId, season });
        return cached;
      }

      const competitionCode = this.getCompetitionCode(leagueId);
      logger.debug('Fetching standings', { leagueId, competitionCode, season });

      // football-data.org uses competition codes in the URL
      const response = await this.client.get<StandingsResponse>(
        `/competitions/${competitionCode}/standings`
      );

      cacheService.set(cacheKey, response.data, CACHE_TTL.STANDINGS);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch standings', { error, leagueId, season });
      throw error;
    }
  }

  /**
   * Fetches teams for a league
   */
  async getTeams(leagueId: number, season: number): Promise<unknown[]> {
    try {
      const cacheKey = `teams:${leagueId}:${season}`;
      const cached = cacheService.get<unknown[]>(cacheKey);

      if (cached) {
        logger.debug('Returning cached teams', { leagueId, season });
        return cached;
      }

      logger.debug('Fetching teams', { leagueId, season });

      const response = await this.client.get('/teams', {
        params: { league: leagueId, season: season },
      });

      if (response.data.errors && Object.keys(response.data.errors).length > 0) {
        logger.error('API-Football returned errors', { errors: response.data.errors });
        return [];
      }

      if (response.data.results === 0) {
        logger.warn('Teams not found', { leagueId, season });
        return [];
      }

      cacheService.set(cacheKey, response.data.response, CACHE_TTL.TEAMS);
      return response.data.response;
    } catch (error) {
      logger.error('Failed to fetch teams', { error, leagueId, season });
      throw error;
    }
  }
}

export const apiFootballClient = new APIFootballClient();
