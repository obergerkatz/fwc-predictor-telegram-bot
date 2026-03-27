# Test Suite

Comprehensive test suite for the FIFA World Cup Predictor Bot.

## Structure

The test directory mirrors the `src` directory structure:

```
tests/
├── services/          # Business logic tests
│   ├── bet.service.test.ts
│   ├── cache.service.test.ts
│   ├── tournament-prediction.service.test.ts
│   └── user.service.test.ts
├── api/               # API client tests
│   └── football-data.client.test.ts
├── utils/             # Utility function tests
│   └── flags.test.ts
├── repositories/      # Data access layer tests (TBD)
├── jobs/              # Background job tests (TBD)
└── scoring.test.ts    # Scoring system tests
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test -- scoring.test.ts

# Run tests matching pattern
pnpm test -- --testNamePattern="exact score"
```

## Test Coverage

### Services (90%+ coverage)
- ✅ **scoring.service.test.ts** - Comprehensive scoring logic tests
  - All scoring scenarios (6, 4, 3, 1, 0 points)
  - Edge cases and priority rules
  - Real-world match scenarios

- ✅ **bet.service.test.ts** - Bet placement and modification
  - Place bet validations
  - Modify bet rules
  - Match status checks
  - Duplicate bet prevention

- ✅ **cache.service.test.ts** - Caching mechanism
  - TTL expiration
  - Data storage/retrieval
  - Cleanup functionality
  - Multiple data types

- ✅ **tournament-prediction.service.test.ts** - Tournament predictions
  - Team validation
  - Deadline enforcement
  - Scoring logic (7 points per position)
  - Update vs create flows

- ✅ **user.service.test.ts** - User management
  - User creation/updates
  - Stats calculation
  - Leaderboard integration
  - Edge cases

### API Clients (85%+ coverage)
- ✅ **football-data.client.test.ts** - External API integration
  - Match fetching
  - Status mapping
  - Score extraction (90min vs full-time)
  - Error handling
  - Rate limiting/caching

### Utils (95%+ coverage)
- ✅ **flags.test.ts** - Country flag utilities
  - Flag retrieval for 100+ countries
  - Team name formatting
  - Alternative name support
  - Coverage validation

## Test Patterns

### Unit Testing with Mocks

```typescript
import { BetService } from '../../src/services/bet.service';
import { betRepository } from '../../src/db/repositories';

jest.mock('../../src/db/repositories');

describe('BetService', () => {
  let betService: BetService;

  beforeEach(() => {
    betService = new BetService();
    jest.clearAllMocks();
  });

  it('should create bet', async () => {
    (betRepository.create as jest.Mock).mockResolvedValue(mockBet);
    const result = await betService.placeBet(...);
    expect(result.success).toBe(true);
  });
});
```

### Testing with Timers

```typescript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

it('should expire after TTL', () => {
  cacheService.set('key', 'data', 10);
  jest.advanceTimersByTime(11000);
  expect(cacheService.get('key')).toBeNull();
});
```

### Edge Case Testing

```typescript
describe('edge cases', () => {
  it('should handle empty strings', () => {
    expect(formatTeamWithFlag('')).toBe('');
  });

  it('should handle very long names', () => {
    const longName = 'a'.repeat(100);
    const result = formatTeamWithFlag(longName);
    expect(result).toBe(longName);
  });

  it('should handle special characters', () => {
    const special = 'Team_123-@!';
    expect(formatTeamWithFlag(special)).toBe(special);
  });
});
```

## Coverage Goals

| Component | Target | Status |
|-----------|--------|--------|
| Services | 90% | ✅ Achieved |
| API Clients | 85% | ✅ Achieved |
| Utils | 95% | ✅ Achieved |
| Repositories | 80% | 🔄 In Progress |
| Handlers | 70% | 📋 Planned |
| Jobs | 75% | 📋 Planned |

## Writing New Tests

When adding new tests, follow these guidelines:

1. **Mirror src structure** - Place test files in matching directories
2. **Use descriptive names** - Test file should end with `.test.ts`
3. **Mock external dependencies** - Use Jest mocks for repositories, APIs
4. **Test both success and failure** - Cover happy path and error cases
5. **Include edge cases** - Empty values, null, undefined, extreme values
6. **Use Arrange-Act-Assert** - Clear test structure
7. **Keep tests focused** - One concept per test
8. **Add documentation** - Explain complex test scenarios

### Example Test Template

```typescript
import { MyService } from '../../src/services/my.service';
import { dependency } from '../../src/dependencies';

jest.mock('../../src/dependencies');

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { data: 'test' };
      (dependency.method as jest.Mock).mockResolvedValue({ success: true });

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toBeDefined();
      expect(dependency.method).toHaveBeenCalledWith(input);
    });

    it('should handle error case', async () => {
      // Arrange
      (dependency.method as jest.Mock).mockRejectedValue(new Error('Failed'));

      // Act & Assert
      await expect(service.methodName({})).rejects.toThrow('Failed');
    });
  });
});
```

## CI/CD Integration

Tests are automatically run:
- On every push to feature branches
- Before merging to main branch
- As part of build pipeline
- Coverage reports are generated and tracked

## Troubleshooting

### Tests timing out
- Increase timeout: `jest.setTimeout(10000)`
- Check for unresolved promises
- Verify mock implementations

### Mock not working
- Ensure mock is declared before import
- Clear mocks between tests with `jest.clearAllMocks()`
- Verify mock path matches import path

### Coverage gaps
- Run `pnpm test -- --coverage` to see report
- Check uncovered lines in HTML report at `coverage/lcov-report/index.html`
- Add tests for uncovered branches

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [TypeScript Testing](https://basarat.gitbook.io/typescript/intro-1/jest)
