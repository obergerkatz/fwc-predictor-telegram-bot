import { TournamentPredictionService } from '../../src/services/tournament-prediction.service';
import { tournamentPredictionRepository, matchRepository } from '../../src/db/repositories';

jest.mock('../../src/db/repositories', () => ({
  tournamentPredictionRepository: {
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateBonusPoints: jest.fn(),
    getAll: jest.fn(),
  },
  matchRepository: {
    getFirstMatch: jest.fn(),
  },
}));

describe('TournamentPredictionService', () => {
  let service: TournamentPredictionService;

  beforeEach(() => {
    service = new TournamentPredictionService();
    jest.clearAllMocks();
  });

  describe('getAvailableTeams', () => {
    it('should return list of World Cup teams', () => {
      const teams = service.getAvailableTeams();

      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBeGreaterThan(0);
      expect(teams).toContain('Argentina');
      expect(teams).toContain('Brazil');
      expect(teams).toContain('France');
      expect(teams).toContain('Germany');
    });

    it('should return sorted team list', () => {
      const teams = service.getAvailableTeams();
      const sortedTeams = [...teams].sort();

      expect(teams).toEqual(sortedTeams);
    });

    it('should have no duplicate teams', () => {
      const teams = service.getAvailableTeams();
      const uniqueTeams = new Set(teams);

      expect(teams.length).toBe(uniqueTeams.size);
    });
  });

  describe('canPlacePrediction', () => {
    it('should allow prediction before first match', async () => {
      const futureMatch = {
        id: 1,
        match_date: new Date(Date.now() + 86400000), // Tomorrow
      };

      (matchRepository.getFirstMatch as jest.Mock).mockResolvedValue(futureMatch);

      const result = await service.canPlacePrediction();

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject prediction after first match started', async () => {
      const pastMatch = {
        id: 1,
        match_date: new Date(Date.now() - 3600000), // 1 hour ago
      };

      (matchRepository.getFirstMatch as jest.Mock).mockResolvedValue(pastMatch);

      const result = await service.canPlacePrediction();

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('predictions closed');
    });

    it('should allow prediction if no matches exist', async () => {
      (matchRepository.getFirstMatch as jest.Mock).mockResolvedValue(null);

      const result = await service.canPlacePrediction();

      expect(result.allowed).toBe(true);
    });
  });

  describe('placePrediction', () => {
    beforeEach(() => {
      // Mock canPlacePrediction to allow by default
      (matchRepository.getFirstMatch as jest.Mock).mockResolvedValue({
        id: 1,
        match_date: new Date(Date.now() + 86400000),
      });
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
      (matchRepository.getFirstMatch as jest.Mock).mockResolvedValue({
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

      (tournamentPredictionRepository.getAll as jest.Mock).mockResolvedValue(predictions);

      await service.scorePredictions('Argentina', 'France', 'Croatia', 'Morocco');

      // First user: all correct = 28 points
      expect(tournamentPredictionRepository.updateBonusPoints).toHaveBeenCalledWith(1, 28);

      // Second user: wrong order = 0 points
      expect(tournamentPredictionRepository.updateBonusPoints).toHaveBeenCalledWith(2, 0);
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

      (tournamentPredictionRepository.getAll as jest.Mock).mockResolvedValue(predictions);

      await service.scorePredictions('Argentina', 'France', 'Croatia', 'Morocco');

      // 2 correct positions = 14 points
      expect(tournamentPredictionRepository.updateBonusPoints).toHaveBeenCalledWith(1, 14);
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

      (tournamentPredictionRepository.getAll as jest.Mock).mockResolvedValue(predictions);

      await service.scorePredictions('Argentina', 'France', 'Croatia', 'Morocco');

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

      (tournamentPredictionRepository.getAll as jest.Mock).mockResolvedValue(predictions);

      await service.scorePredictions('Argentina', 'France', 'Croatia', 'Morocco');

      expect(tournamentPredictionRepository.updateBonusPoints).toHaveBeenCalledWith(1, 0);
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
