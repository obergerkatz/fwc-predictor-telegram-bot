import { CacheService } from '../../src/services/cache.service';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  afterEach(() => {
    // Clear all cache entries after each test
    jest.clearAllTimers();
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      const key = 'test-key';
      const data = { value: 'test-data' };
      const ttl = 60; // 60 seconds

      cacheService.set(key, data, ttl);
      const result = cacheService.get(key);

      expect(result).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const result = cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should handle different data types', () => {
      cacheService.set('string', 'hello', 60);
      cacheService.set('number', 42, 60);
      cacheService.set('boolean', true, 60);
      cacheService.set('array', [1, 2, 3], 60);
      cacheService.set('object', { a: 1, b: 2 }, 60);

      expect(cacheService.get('string')).toBe('hello');
      expect(cacheService.get('number')).toBe(42);
      expect(cacheService.get('boolean')).toBe(true);
      expect(cacheService.get('array')).toEqual([1, 2, 3]);
      expect(cacheService.get('object')).toEqual({ a: 1, b: 2 });
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return data before TTL expires', () => {
      const key = 'expiring-key';
      const data = 'test-data';
      const ttl = 10; // 10 seconds

      cacheService.set(key, data, ttl);

      // Advance time by 5 seconds (half of TTL)
      jest.advanceTimersByTime(5000);

      const result = cacheService.get(key);
      expect(result).toBe(data);
    });

    it('should return null after TTL expires', () => {
      const key = 'expiring-key';
      const data = 'test-data';
      const ttl = 10; // 10 seconds

      cacheService.set(key, data, ttl);

      // Advance time beyond TTL
      jest.advanceTimersByTime(11000);

      const result = cacheService.get(key);
      expect(result).toBeNull();
    });

    it('should handle multiple items with different TTLs', () => {
      cacheService.set('short', 'data1', 5);
      cacheService.set('long', 'data2', 20);

      // After 6 seconds, short should be expired, long should still exist
      jest.advanceTimersByTime(6000);

      expect(cacheService.get('short')).toBeNull();
      expect(cacheService.get('long')).toBe('data2');

      // After 21 seconds, both should be expired
      jest.advanceTimersByTime(15000);

      expect(cacheService.get('long')).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete existing entry', () => {
      const key = 'deletable';
      cacheService.set(key, 'data', 60);

      expect(cacheService.get(key)).toBe('data');

      cacheService.delete(key);

      expect(cacheService.get(key)).toBeNull();
    });

    it('should handle deleting non-existent key', () => {
      expect(() => cacheService.delete('non-existent')).not.toThrow();
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should remove expired entries', () => {
      // Add multiple entries with different TTLs
      cacheService.set('expired1', 'data1', 5);
      cacheService.set('expired2', 'data2', 5);
      cacheService.set('valid', 'data3', 100);

      // Advance time to expire first two
      jest.advanceTimersByTime(6000);

      // Run cleanup
      cacheService.cleanup();

      // Expired entries should be gone
      expect(cacheService.get('expired1')).toBeNull();
      expect(cacheService.get('expired2')).toBeNull();

      // Valid entry should remain
      expect(cacheService.get('valid')).toBe('data3');
    });

    it('should not affect valid entries', () => {
      cacheService.set('valid1', 'data1', 60);
      cacheService.set('valid2', 'data2', 120);

      jest.advanceTimersByTime(30000); // 30 seconds

      cacheService.cleanup();

      expect(cacheService.get('valid1')).toBe('data1');
      expect(cacheService.get('valid2')).toBe('data2');
    });
  });

  describe('overwrite behavior', () => {
    it('should overwrite existing key with new value', () => {
      const key = 'overwrite-test';

      cacheService.set(key, 'original', 60);
      expect(cacheService.get(key)).toBe('original');

      cacheService.set(key, 'updated', 60);
      expect(cacheService.get(key)).toBe('updated');
    });

    it('should reset TTL when overwriting', () => {
      jest.useFakeTimers();

      const key = 'ttl-reset';
      cacheService.set(key, 'data', 10);

      // Advance 5 seconds
      jest.advanceTimersByTime(5000);

      // Overwrite with new TTL
      cacheService.set(key, 'new-data', 20);

      // Advance another 15 seconds (total 20 from overwrite)
      jest.advanceTimersByTime(15000);

      // Should still be valid
      expect(cacheService.get(key)).toBe('new-data');

      jest.useRealTimers();
    });
  });
});
