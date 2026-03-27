import { UserService } from '../../src/services/user.service';
import { userRepository, leaderboardRepository } from '../../src/db/repositories';

jest.mock('../../src/db/repositories', () => ({
  userRepository: {
    upsert: jest.fn(),
    findByTelegramId: jest.fn(),
    findById: jest.fn(),
  },
  leaderboardRepository: {
    getLeaderboard: jest.fn(),
    getUserRank: jest.fn(),
  },
}));

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('getOrCreateUser', () => {
    it('should create new user', async () => {
      const telegramId = '123456789';
      const username = 'testuser';
      const firstName = 'Test';

      const mockUser = {
        id: 1,
        telegram_id: telegramId,
        username,
        first_name: firstName,
        created_at: new Date(),
      };

      (userRepository.upsert as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getOrCreateUser(telegramId, username, firstName);

      expect(result).toEqual(mockUser);
      expect(userRepository.upsert).toHaveBeenCalledWith(telegramId, username, firstName);
    });

    it('should handle null username', async () => {
      const telegramId = '123456789';
      const firstName = 'Test';

      const mockUser = {
        id: 1,
        telegram_id: telegramId,
        username: null,
        first_name: firstName,
        created_at: new Date(),
      };

      (userRepository.upsert as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getOrCreateUser(telegramId, null, firstName);

      expect(result).toEqual(mockUser);
      expect(userRepository.upsert).toHaveBeenCalledWith(telegramId, null, firstName);
    });

    it('should update existing user', async () => {
      const telegramId = '123456789';
      const newUsername = 'updated_user';
      const firstName = 'Test';

      const updatedUser = {
        id: 1,
        telegram_id: telegramId,
        username: newUsername,
        first_name: firstName,
        created_at: new Date(),
      };

      (userRepository.upsert as jest.Mock).mockResolvedValue(updatedUser);

      const result = await userService.getOrCreateUser(telegramId, newUsername, firstName);

      expect(result.username).toBe(newUsername);
    });

    it('should handle database errors', async () => {
      (userRepository.upsert as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(
        userService.getOrCreateUser('123', 'user', 'Test')
      ).rejects.toThrow('DB Error');
    });
  });

  describe('getUserByTelegramId', () => {
    it('should return user if exists', async () => {
      const mockUser = {
        id: 1,
        telegram_id: '123456789',
        username: 'testuser',
        first_name: 'Test',
        created_at: new Date(),
      };

      (userRepository.findByTelegramId as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserByTelegramId('123456789');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      (userRepository.findByTelegramId as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserByTelegramId('999999999');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user if exists', async () => {
      const mockUser = {
        id: 1,
        telegram_id: '123456789',
        username: 'testuser',
        first_name: 'Test',
        created_at: new Date(),
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserById(1);

      expect(result).toEqual(mockUser);
    });

    it('should return null if not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserStats', () => {
    it('should return complete user stats', async () => {
      const userId = 1;

      const mockUser = {
        id: userId,
        telegram_id: '123456789',
        username: 'testuser',
        first_name: 'Test',
        created_at: new Date(),
      };

      const mockLeaderboard = [
        {
          user_id: userId,
          telegram_id: '123456789',
          username: 'testuser',
          first_name: 'Test',
          total_points: 42,
          total_bets: 10,
          scored_bets: 8,
          exact_scores: 2,
          goal_diffs: 3,
          three_pt_scores: 2,
          one_pt_scores: 1,
          zero_scores: 2,
          bonus_points: 14,
          rank: 1,
        },
        {
          user_id: 2,
          total_points: 30,
          rank: 2,
        },
      ];

      const mockRankInfo = {
        rank: 1,
        total_users: 100,
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (leaderboardRepository.getLeaderboard as jest.Mock).mockResolvedValue(mockLeaderboard);
      (leaderboardRepository.getUserRank as jest.Mock).mockResolvedValue(mockRankInfo);

      const result = await userService.getUserStats(userId);

      expect(result).toMatchObject({
        user: mockUser,
        total_points: 42,
        total_bets: 10,
        scored_bets: 8,
        pending_bets: 2, // total_bets - scored_bets
        rank: 1,
        total_users: 2, // leaderboard.length
        exact_scores: 2,
        goal_diffs: 3,
        bonus_points: 14,
      });
    });

    it('should return null if user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserStats(999);

      expect(result).toBeNull();
    });

    it('should return default stats for new user', async () => {
      const mockUser = {
        id: 1,
        telegram_id: '123456789',
        username: 'newuser',
        first_name: 'New',
        created_at: new Date(),
      };

      const mockLeaderboard: any[] = []; // Empty leaderboard

      const mockRankInfo = {
        rank: 0,
        total_users: 10,
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (leaderboardRepository.getLeaderboard as jest.Mock).mockResolvedValue(mockLeaderboard);
      (leaderboardRepository.getUserRank as jest.Mock).mockResolvedValue(mockRankInfo);

      const result = await userService.getUserStats(1);

      expect(result).toBeDefined();
      expect(result!.total_points).toBe(0);
      expect(result!.total_bets).toBe(0);
      expect(result!.scored_bets).toBe(0);
      expect(result!.rank).toBe(0);
    });

    it('should calculate pending bets correctly', async () => {
      const mockUser = {
        id: 1,
        telegram_id: '123',
        username: 'test',
        first_name: 'Test',
        created_at: new Date(),
      };

      const mockLeaderboard = [
        {
          user_id: 1,
          total_bets: 20,
          scored_bets: 15,
          total_points: 60,
          rank: 1,
        },
      ];

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (leaderboardRepository.getLeaderboard as jest.Mock).mockResolvedValue(mockLeaderboard);
      (leaderboardRepository.getUserRank as jest.Mock).mockResolvedValue({
        rank: 1,
        total_users: 50,
      });

      const result = await userService.getUserStats(1);

      expect(result).toBeDefined();
      expect(result!.pending_bets).toBe(5); // 20 - 15
    });
  });

  describe('edge cases', () => {
    it('should handle very long usernames', async () => {
      const longUsername = 'a'.repeat(100);

      const mockUser = {
        id: 1,
        telegram_id: '123',
        username: longUsername,
        first_name: 'Test',
        created_at: new Date(),
      };

      (userRepository.upsert as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getOrCreateUser('123', longUsername, 'Test');

      expect(result.username).toBe(longUsername);
    });

    it('should handle special characters in names', async () => {
      const specialName = 'Test_User-123@!';

      const mockUser = {
        id: 1,
        telegram_id: '123',
        username: null,
        first_name: specialName,
        created_at: new Date(),
      };

      (userRepository.upsert as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getOrCreateUser('123', null, specialName);

      expect(result.first_name).toBe(specialName);
    });

    it('should handle concurrent requests for same user', async () => {
      const telegramId = '123456789';

      const mockUser = {
        id: 1,
        telegram_id: telegramId,
        username: 'test',
        first_name: 'Test',
        created_at: new Date(),
      };

      (userRepository.upsert as jest.Mock).mockResolvedValue(mockUser);

      // Simulate concurrent requests
      const promises = [
        userService.getOrCreateUser(telegramId, 'test', 'Test'),
        userService.getOrCreateUser(telegramId, 'test', 'Test'),
        userService.getOrCreateUser(telegramId, 'test', 'Test'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.telegram_id).toBe(telegramId);
      });
    });
  });
});
