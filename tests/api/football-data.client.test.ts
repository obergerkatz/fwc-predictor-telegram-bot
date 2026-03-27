import { MatchStatus } from '../../src/types';

// Mock cacheService
jest.mock('../../src/services/cache.service', () => ({
  cacheService: {
    get: jest.fn(() => null),
    set: jest.fn(),
    delete: jest.fn(),
    cleanup: jest.fn(),
  },
}));

// Mock axios instance that will be reused
const mockAxiosInstance = {
  get: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

// Mock axios BEFORE importing FootballDataClient
jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
}));

import { FootballDataClient } from '../../src/api/football-data.client';
import { cacheService } from '../../src/services/cache.service';

describe('FootballDataClient', () => {
  let client: FootballDataClient;

  beforeEach(() => {
    // Reset the mock functions on the instance, but keep the instance itself
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.interceptors.request.use.mockReset();
    mockAxiosInstance.interceptors.response.use.mockReset();

    // Reset cache mock to always return null (no cache)
    (cacheService.get as jest.Mock).mockReturnValue(null);
    (cacheService.set as jest.Mock).mockClear();

    client = new FootballDataClient();
  });

  describe('mapStatusToMatchStatus', () => {
    it('should map SCHEDULED to SCHEDULED', () => {
      expect(client.mapStatusToMatchStatus('SCHEDULED')).toBe(MatchStatus.SCHEDULED);
      expect(client.mapStatusToMatchStatus('TIMED')).toBe(MatchStatus.SCHEDULED);
    });

    it('should map live statuses to LIVE', () => {
      expect(client.mapStatusToMatchStatus('IN_PLAY')).toBe(MatchStatus.LIVE);
      expect(client.mapStatusToMatchStatus('PAUSED')).toBe(MatchStatus.LIVE);
    });

    it('should map finished statuses to FINISHED', () => {
      expect(client.mapStatusToMatchStatus('FINISHED')).toBe(MatchStatus.FINISHED);
      expect(client.mapStatusToMatchStatus('AWARDED')).toBe(MatchStatus.FINISHED);
    });

    it('should map postponed/cancelled statuses', () => {
      expect(client.mapStatusToMatchStatus('POSTPONED')).toBe(MatchStatus.POSTPONED);
      expect(client.mapStatusToMatchStatus('CANCELLED')).toBe(MatchStatus.CANCELLED);
      expect(client.mapStatusToMatchStatus('SUSPENDED')).toBe(MatchStatus.CANCELLED);
    });

    it('should default unknown status to SCHEDULED', () => {
      expect(client.mapStatusToMatchStatus('UNKNOWN_STATUS')).toBe(MatchStatus.SCHEDULED);
    });
  });

  describe('get90MinuteScore', () => {
    it('should return regularTime when extraTime exists', () => {
      const match = {
        score: {
          duration: 'EXTRA_TIME',
          fullTime: { home: 3, away: 2 },
          regularTime: { home: 2, away: 2 },
          extraTime: { home: 3, away: 2 },
        },
      } as any;

      const result = client.get90MinuteScore(match);

      expect(result).toEqual({ home: 2, away: 2 });
    });

    it('should return fullTime for regular duration', () => {
      const match = {
        score: {
          duration: 'REGULAR',
          fullTime: { home: 2, away: 1 },
        },
      } as any;

      const result = client.get90MinuteScore(match);

      expect(result).toEqual({ home: 2, away: 1 });
    });

    it('should handle null scores', () => {
      const match = {
        score: {
          duration: 'REGULAR',
          fullTime: { home: null, away: null },
        },
      } as any;

      const result = client.get90MinuteScore(match);

      expect(result).toEqual({ home: null, away: null });
    });
  });

  describe('getFullTimeScore', () => {
    it('should return extraTime scores when available', () => {
      const match = {
        score: {
          fullTime: { home: 2, away: 2 },
          extraTime: { home: 3, away: 2 },
        },
      } as any;

      const result = client.getFullTimeScore(match);

      expect(result).toEqual({ home: 3, away: 2 });
    });

    it('should return fullTime when no extra time', () => {
      const match = {
        score: {
          fullTime: { home: 2, away: 1 },
          extraTime: { home: null, away: null },
        },
      } as any;

      const result = client.getFullTimeScore(match);

      expect(result).toEqual({ home: 2, away: 1 });
    });

    it('should handle null extra time', () => {
      const match = {
        score: {
          fullTime: { home: 1, away: 0 },
          extraTime: null,
        },
      } as any;

      const result = client.getFullTimeScore(match);

      expect(result).toEqual({ home: 1, away: 0 });
    });
  });

  describe('getMatches', () => {
    it('should fetch matches successfully', async () => {
      const mockMatches = [
        {
          id: 1,
          homeTeam: { name: 'Team A' },
          awayTeam: { name: 'Team B' },
          status: 'SCHEDULED',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { matches: mockMatches },
      });

      const result = await client.getMatches('WC');

      expect(result).toEqual(mockMatches);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/competitions/WC/matches',
        { params: {} }
      );
    });

    it('should include date parameters when provided', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { matches: [] },
      });

      await client.getMatches('WC', '2022-11-20', '2022-12-18');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/competitions/WC/matches',
        {
          params: {
            dateFrom: '2022-11-20',
            dateTo: '2022-12-18',
          },
        }
      );
    });

    it('should return empty array on error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      const result = await client.getMatches('WC');

      expect(result).toEqual([]);
    });

    it('should handle rate limiting with cache', async () => {
      const mockMatches = [{ id: 1 }];

      // First call: no cache, returns from API
      (cacheService.get as jest.Mock).mockReturnValueOnce(null);
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { matches: mockMatches },
      });

      const result1 = await client.getMatches('WC');
      expect(result1).toEqual(mockMatches);

      // Second call: returns from cache
      (cacheService.get as jest.Mock).mockReturnValueOnce(mockMatches);

      const result2 = await client.getMatches('WC');
      expect(result2).toEqual(mockMatches);

      // API should only be called once (second call used cache)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCompetition', () => {
    it('should fetch competition info', async () => {
      const mockCompetition = {
        id: 2000,
        name: 'World Cup',
        code: 'WC',
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: mockCompetition,
      });

      const result = await client.getCompetition('WC');

      expect(result).toEqual(mockCompetition);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/competitions/WC');
    });

    it('should return null on error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Not found'));

      const result = await client.getCompetition('INVALID');

      expect(result).toBeNull();
    });
  });

  describe('getMatchById', () => {
    it('should fetch single match', async () => {
      const mockMatch = {
        id: 12345,
        homeTeam: { name: 'Team A' },
        awayTeam: { name: 'Team B' },
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: mockMatch,
      });

      const result = await client.getMatchById(12345);

      expect(result).toEqual(mockMatch);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/matches/12345');
    });

    it('should return null on error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Match not found'));

      const result = await client.getMatchById(99999);

      expect(result).toBeNull();
    });
  });

  describe('getTeams', () => {
    it('should fetch teams for competition', async () => {
      const mockTeams = [
        { id: 1, name: 'Team A' },
        { id: 2, name: 'Team B' },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { teams: mockTeams },
      });

      const result = await client.getTeams('WC');

      expect(result).toEqual(mockTeams);
    });

    it('should return empty array if no teams', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {},
      });

      const result = await client.getTeams('WC');

      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      await expect(client.getTeams('WC')).rejects.toThrow();
    });
  });
});
