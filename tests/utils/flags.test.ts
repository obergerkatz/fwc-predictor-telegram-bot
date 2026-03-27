import { getFlag, formatTeamWithFlag, countryFlags } from '../../src/utils/flags';

describe('Flags Utility', () => {
  describe('getFlag', () => {
    it('should return flag for valid country', () => {
      expect(getFlag('Brazil')).toBe('🇧🇷');
      expect(getFlag('Germany')).toBe('🇩🇪');
      expect(getFlag('France')).toBe('🇫🇷');
      expect(getFlag('Argentina')).toBe('🇦🇷');
    });

    it('should return empty string for unknown country', () => {
      expect(getFlag('Unknown Country')).toBe('');
      expect(getFlag('Not A Real Team')).toBe('');
      expect(getFlag('')).toBe('');
    });

    it('should be case-sensitive', () => {
      expect(getFlag('Brazil')).toBe('🇧🇷');
      expect(getFlag('brazil')).toBe(''); // lowercase not found
      expect(getFlag('BRAZIL')).toBe(''); // uppercase not found
    });

    it('should handle special team name variations', () => {
      // Test alternative names
      expect(getFlag('USA')).toBe('🇺🇸');
      expect(getFlag('United States')).toBe('🇺🇸');
      expect(getFlag('Korea Republic')).toBe('🇰🇷');
      expect(getFlag('South Korea')).toBe('🇰🇷');
      expect(getFlag('IR Iran')).toBe('🇮🇷');
      expect(getFlag('Iran')).toBe('🇮🇷');
    });

    it('should handle UK nations separately', () => {
      expect(getFlag('England')).toBe('🏴󠁧󠁢󠁥󠁮󠁧󠁿');
      expect(getFlag('Scotland')).toBe('🏴󠁧󠁢󠁳󠁣󠁴󠁿');
      expect(getFlag('Wales')).toBe('🏴󠁧󠁢󠁷󠁬󠁳󠁿');
      expect(getFlag('Northern Ireland')).toBe('🇬🇧');
      expect(getFlag('Republic of Ireland')).toBe('🇮🇪');
    });
  });

  describe('formatTeamWithFlag', () => {
    it('should format team with flag prefix', () => {
      expect(formatTeamWithFlag('Brazil')).toBe('🇧🇷 Brazil');
      expect(formatTeamWithFlag('Germany')).toBe('🇩🇪 Germany');
      expect(formatTeamWithFlag('Spain')).toBe('🇪🇸 Spain');
    });

    it('should return team name only if no flag found', () => {
      expect(formatTeamWithFlag('Unknown Team')).toBe('Unknown Team');
      expect(formatTeamWithFlag('Fantasy FC')).toBe('Fantasy FC');
    });

    it('should handle empty string', () => {
      expect(formatTeamWithFlag('')).toBe('');
    });

    it('should preserve team name exactly as provided', () => {
      const teamName = 'Brazil FC United';
      const result = formatTeamWithFlag(teamName);
      expect(result).toBe(teamName); // No flag found, returns as-is
    });

    it('should format all qualified teams correctly', () => {
      const sampleTeams = [
        'Argentina',
        'Brazil',
        'France',
        'England',
        'Spain',
        'Germany',
        'Portugal',
        'Netherlands',
        'Belgium',
        'Croatia',
      ];

      for (const team of sampleTeams) {
        const result = formatTeamWithFlag(team);
        expect(result).toContain(team);
        expect(result.length).toBeGreaterThan(team.length); // Should have flag
      }
    });
  });

  describe('countryFlags coverage', () => {
    it('should have flags for major European teams', () => {
      const europeanTeams = [
        'Germany',
        'France',
        'Spain',
        'England',
        'Italy',
        'Portugal',
        'Netherlands',
        'Belgium',
      ];

      europeanTeams.forEach((team) => {
        expect(countryFlags[team]).toBeDefined();
        expect(countryFlags[team].length).toBeGreaterThan(0); // Should be a flag emoji
      });
    });

    it('should have flags for major South American teams', () => {
      const southAmericanTeams = [
        'Brazil',
        'Argentina',
        'Uruguay',
        'Colombia',
        'Chile',
      ];

      southAmericanTeams.forEach((team) => {
        expect(countryFlags[team]).toBeDefined();
      });
    });

    it('should have flags for major Asian teams', () => {
      const asianTeams = [
        'Japan',
        'South Korea',
        'Iran',
        'Saudi Arabia',
        'Australia',
      ];

      asianTeams.forEach((team) => {
        expect(countryFlags[team]).toBeDefined();
      });
    });

    it('should have flags for major African teams', () => {
      const africanTeams = [
        'Senegal',
        'Morocco',
        'Tunisia',
        'Nigeria',
        'Egypt',
      ];

      africanTeams.forEach((team) => {
        expect(countryFlags[team]).toBeDefined();
      });
    });

    it('should have flags for CONCACAF teams', () => {
      const concacafTeams = [
        'United States',
        'Mexico',
        'Canada',
        'Costa Rica',
      ];

      concacafTeams.forEach((team) => {
        expect(countryFlags[team]).toBeDefined();
      });
    });

    it('should have comprehensive coverage (95+ countries)', () => {
      const flagCount = Object.keys(countryFlags).length;
      expect(flagCount).toBeGreaterThanOrEqual(95);
    });
  });

  describe('consistency checks', () => {
    it('should not have duplicate flag values for different teams', () => {
      // Except for alternative names (USA/United States, Korea Republic/South Korea, etc.)
      const flagValues = Object.values(countryFlags);
      const uniqueFlags = new Set(flagValues);

      // Account for legitimate duplicates from alternative names
      const expectedDuplicates = flagValues.length - uniqueFlags.size;
      expect(expectedDuplicates).toBeLessThanOrEqual(8); // Should be small
    });

    it('should have non-empty flag values', () => {
      Object.entries(countryFlags).forEach(([, flag]) => {
        expect(flag).toBeTruthy();
        expect(flag.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty team names', () => {
      Object.keys(countryFlags).forEach((team) => {
        expect(team).toBeTruthy();
        expect(team.length).toBeGreaterThan(0);
      });
    });
  });
});
