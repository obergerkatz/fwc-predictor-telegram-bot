import { TournamentPredictionService } from '../../src/services/tournament-prediction.service';
import {
  tournamentPredictionRepository,
  matchRepository,
  leagueRepository,
} from '../../src/db/repositories';

jest.mock('../../src/db/repositories', () => ({
  tournamentPredictionRepository: {
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateBonusPoints: jest.fn(),
    getAll: jest.fn(),
    getAllByLeague: jest.fn(),
  },
  matchRepository: {
    getFirstMatch: jest.fn(),
    getFirstMatchByLeague: jest.fn(),
    getAllTeams: jest.fn(),
  },
  leagueRepository: {
    findActiveByConfiguredLeagues: jest.fn(),
  },
}));

describe('TournamentPredictionService', () => {
  let service: TournamentPredictionService;

  beforeEach(() => {
    service = new TournamentPredictionService();
    jest.clearAllMocks();
  });

  describe('getAvailableTeams', () => {
    it('should return teams from database', async () => {
      const mockTeams = ['Argentina', 'Brazil', 'France', 'Germany'];
      (matchRepository.getAllTeams as jest.Mock).mockResolvedValue(mockTeams);

      const teams = await service.getAvailableTeams();

      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBe(4);
      expect(teams).toContain('Argentina');
      expect(teams).toContain('Brazil');
      expect(teams).toContain('France');
      expect(teams).toContain('Germany');
      expect(matchRepository.getAllTeams).toHaveBeenCalled();
    });

    it('should return sorted team list from database', async () => {
      const mockTeams = ['Argentina', 'Brazil', 'France', 'Germany'];
      (matchRepository.getAllTeams as jest.Mock).mockResolvedValue(mockTeams);

      const teams = await service.getAvailableTeams();
      const sortedTeams = [...teams].sort();

      expect(teams).toEqual(sortedTeams);
    });

    it('should return empty array if database query fails', async () => {
      (matchRepository.getAllTeams as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const teams = await service.getAvailableTeams();

      expect(teams).toEqual([]);
    });

    it('should return empty array if no teams in database', async () => {
      (matchRepository.getAllTeams as jest.Mock).mockResolvedValue([]);

      const teams = await service.getAvailableTeams();

      expect(teams).toEqual([]);
    });
  });

  describe('canPlacePrediction', () => {
    beforeEach(() => {
      (leagueRepository.findActiveByConfiguredLeagues as jest.Mock).mockResolvedValue([
        { id: 1, code: 'WC', name: 'World Cup' },
      ]);
    });

    it('should allow prediction before first match', async () => {
      const futureMatch = {
        id: 1,
        match_date: new Date(Date.now() + 86400000), // Tomorrow
      };

      (matchRepository.getFirstMatchByLeague as jest.Mock).mockResolvedValue(futureMatch);

      const result = await service.canPlacePrediction();

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject prediction after first match started', async () => {
      const pastMatch = {
        id: 1,
        match_date: new Date(Date.now() - 3600000), // 1 hour ago
      };

      (matchRepository.getFirstMatchByLeague as jest.Mock).mockResolvedValue(pastMatch);

      const result = await service.canPlacePrediction();

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('predictions closed');
    });

    it('should allow prediction if no matches exist', async () => {
      (matchRepository.getFirstMatchByLeague as jest.Mock).mockResolvedValue(null);

      const result = await service.canPlacePrediction();

      expect(result.allowed).toBe(true);
    });

    it('should reject if no active league found', async () => {
      (leagueRepository.findActiveByConfiguredLeagues as jest.Mock).mockResolvedValue([]);

      const result = await service.canPlacePrediction();

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No active league found');
    });
  });

  describe('placePrediction', () => {
    beforeEach(() => {
      // Mock active league
      (leagueRepository.findActiveByConfiguredLeagues as jest.Mock).mockResolvedValue([
        { id: 1, code: 'WC', name: 'World Cup' },
      ]);

      // Mock canPlacePrediction to allow by default
      (matchRepository.getFirstMatchByLeague as jest.Mock).mockResolvedValue({
        id: 1,
        match_date: new Date(Date.now() + 86400000),
      });

      // Mock getAvailableTeams to return valid teams
      const mockTeams = [
        'Argentina',
        'Brazil',
        'England',
        'France',
        'Germany',
        'Italy',
        'Portugal',
        'Spain',
      ];
      (matchRepository.getAllTeams as jest.Mock).mockResolvedValue(mockTeams);
    });

    it('should create new prediction successfully', async () => {
      const userId = 1;
      const teams = { first: 'Brazil', second: 'Argentina', third: 'France', fourth: 'Germany' };

      (tournamentPredictionRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      (tournamentPredictionRepository.create as jest.Mock).mockResolvedValue({
        id: 1,
        user_id: userId,
        ...teams,
        bonus_points: 0,
        is_scored: false,
        created_at: new Date(),
      });

      const result = await service.placePrediction(
        userId,
        teams.first,
        teams.second,
        teams.third,
        teams.fourth
      );

      expect(result.success).toBe(true);
      expect(result.prediction).toBeDefined();
      expect(tournamentPredictionRepository.create).toHaveBeenCalledWith(
        userId,
        1, // leagueId
        teams.first,
        teams.second,
        teams.third,
        teams.fourth
      );
    });

    it('should update existing prediction', async () => {
      const userId = 1;
      const teams = { first: 'Spain', second: 'Portugal', third: 'England', fourth: 'Italy' };

      const existing = {
        id: 1,
        user_id: userId,
        first_place: 'Brazil',
        second_place: 'Argentina',
        third_place: 'France',
        fourth_place: 'Germany',
      };

      (tournamentPredictionRepository.findByUserId as jest.Mock).mockResolvedValue(existing);
      (tournamentPredictionRepository.update as jest.Mock).mockResolvedValue({
        ...existing,
        first_place: teams.first,
        second_place: teams.second,
        third_place: teams.third,
        fourth_place: teams.fourth,
      });

      const result = await service.placePrediction(
        userId,
        teams.first,
        teams.second,
        teams.third,
        teams.fourth
      );

      expect(result.success).toBe(true);
      expect(tournamentPredictionRepository.update).toHaveBeenCalled();
    });

    it('should reject duplicate teams', async () => {
      (tournamentPredictionRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      const result = await service.placePrediction(1, 'Brazil', 'Brazil', 'France', 'Germany');

      expect(result.success).toBe(false);
      expect(result.error).toContain('different team');
      expect(tournamentPredictionRepository.create).not.toHaveBeenCalled();
    });

    it('should reject if tournament has started', async () => {
      (matchRepository.getFirstMatchByLeague as jest.Mock).mockResolvedValue({
        id: 1,
        match_date: new Date(Date.now() - 3600000), // Past
      });

      const result = await service.placePrediction(1, 'Brazil', 'Argentina', 'France', 'Germany');

      expect(result.success).toBe(false);
      expect(result.error).toContain('closed');
    });

    it('should reject invalid team names', async () => {
      (tournamentPredictionRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      const result = await service.placePrediction(
        1,
        'Invalid Team',
        'Argentina',
        'France',
        'Germany'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid team');
    });

    it('should reject if no teams available', async () => {
      (tournamentPredictionRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      (matchRepository.getAllTeams as jest.Mock).mockResolvedValue([]);

      const result = await service.placePrediction(1, 'Brazil', 'Argentina', 'France', 'Germany');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No teams available');
    });

    it('should validate all four positions have different teams', async () => {
      (tournamentPredictionRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      // Test various duplicate scenarios
      const testCases = [
        ['Brazil', 'Brazil', 'France', 'Germany'],
        ['Brazil', 'Argentina', 'Brazil', 'Germany'],
        ['Brazil', 'Argentina', 'France', 'Brazil'],
        ['Brazil', 'Argentina', 'France', 'Argentina'],
      ];

      for (const teams of testCases) {
        const result = await service.placePrediction(1, teams[0], teams[1], teams[2], teams[3]);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('scorePredictions', () => {
    it('should score predictions correctly', async () => {
      const predictions = [
        {
          id: 1,
          user_id: 1,
          first_place: 'Argentina',
          second_place: 'France',
          third_place: 'Croatia',
          fourth_place: 'Morocco',
          is_scored: false,
        },
        {
          id: 2,
          user_id: 2,
          first_place: 'France',
          second_place: 'Argentina',
          third_place: 'Morocco',
          fourth_place: 'Croatia',
          is_scored: false,
        },
      ];

      (tournamentPredictionRepository.getAllByLeague as jest.Mock).mockResolvedValue(predictions);

      await service.scorePredictions(1, 'Argentina', 'France', 'Croatia', 'Morocco');

      // First user: all correct = 28 points
      expect(tournamentPredictionRepository.updateBonusPoints).toHaveBeenCalledWith(1, 1, 28);

      // Second user: wrong order = 0 points
      expect(tournamentPredictionRepository.updateBonusPoints).toHaveBeenCalledWith(2, 1, 0);
    });

    it('should give 7 points for each correct position', async () => {
      const predictions = [
        {
          id: 1,
          user_id: 1,
          first_place: 'Argentina', // Correct
          second_place: 'Brazil', // Wrong
          third_place: 'Croatia', // Correct
          fourth_place: 'England', // Wrong
          is_scored: false,
        },
      ];

      (tournamentPredictionRepository.getAllByLeague as jest.Mock).mockResolvedValue(predictions);

      await service.scorePredictions(1, 'Argentina', 'France', 'Croatia', 'Morocco');

      // 2 correct positions = 14 points
      expect(tournamentPredictionRepository.updateBonusPoints).toHaveBeenCalledWith(1, 1, 14);
    });

    it('should skip already scored predictions', async () => {
      const predictions = [
        {
          id: 1,
          user_id: 1,
          first_place: 'Argentina',
          second_place: 'France',
          third_place: 'Croatia',
          fourth_place: 'Morocco',
          is_scored: true, // Already scored
        },
      ];

      (tournamentPredictionRepository.getAllByLeague as jest.Mock).mockResolvedValue(predictions);

      await service.scorePredictions(1, 'Argentina', 'France', 'Croatia', 'Morocco');

      expect(tournamentPredictionRepository.updateBonusPoints).not.toHaveBeenCalled();
    });

    it('should give 0 points for all wrong predictions', async () => {
      const predictions = [
        {
          id: 1,
          user_id: 1,
          first_place: 'Brazil',
          second_place: 'Spain',
          third_place: 'England',
          fourth_place: 'Portugal',
          is_scored: false,
        },
      ];

      (tournamentPredictionRepository.getAllByLeague as jest.Mock).mockResolvedValue(predictions);

      await service.scorePredictions(1, 'Argentina', 'France', 'Croatia', 'Morocco');

      expect(tournamentPredictionRepository.updateBonusPoints).toHaveBeenCalledWith(1, 1, 0);
    });
  });

  describe('getUserPrediction', () => {
    it('should return user prediction if exists', async () => {
      const mockPrediction = {
        id: 1,
        user_id: 1,
        first_place: 'Brazil',
        second_place: 'Argentina',
        third_place: 'France',
        fourth_place: 'Germany',
      };

      (tournamentPredictionRepository.findByUserId as jest.Mock).mockResolvedValue(mockPrediction);

      const result = await service.getUserPrediction(1);

      expect(result).toEqual(mockPrediction);
    });

    it('should return null if no prediction', async () => {
      (tournamentPredictionRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      const result = await service.getUserPrediction(999);

      expect(result).toBeNull();
    });
  });
});
