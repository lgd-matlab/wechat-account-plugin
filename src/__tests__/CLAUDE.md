[Root Directory](../../CLAUDE.md) > [src](../) > **__tests__**

# Tests Module

## Change Log (Changelog)

### 2025-11-16 21:32:07
- Initial documentation for tests module
- Documented 390 passing tests across all layers
- Testing infrastructure and best practices guide

---

## Module Responsibilities

The tests module provides **comprehensive test coverage** for the WeWe RSS plugin:

1. **unit/**: Unit tests for isolated components (390 tests)
2. **mocks/**: Test doubles for external dependencies
3. **fixtures/**: Reusable test data

**Achievement**: 100% passing tests with 70-100% coverage across modules.

---

## Entry and Startup

Tests run via Jest:

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific suite
npm run test:unit
npm test -- AccountRepository
```

**Configuration**: `jest.config.js` in project root.

---

## External Interfaces

### Test Directory Structure

```
src/__tests__/
├── unit/
│   ├── database/                # Repository layer tests (141 tests)
│   │   ├── AccountRepository.test.ts      (48 tests)
│   │   ├── FeedRepository.test.ts         (52 tests)
│   │   └── ArticleRepository.test.ts      (41 tests)
│   ├── services/                # Service layer tests (189 tests)
│   │   ├── AccountService.test.ts         (68 tests)
│   │   ├── FeedService.test.ts            (73 tests)
│   │   ├── ContentParser.test.ts          (32 tests)
│   │   └── NoteCreator.test.ts            (16 tests)
│   ├── utils/                   # Utility tests (43 tests)
│   │   ├── helpers.test.ts                (28 tests)
│   │   └── logger.test.ts                 (15 tests)
│   └── lib/                     # Library tests (17 tests)
│       └── html-parser.test.ts            (17 tests)
├── mocks/                       # Test doubles
│   ├── obsidian.ts              # Mock Obsidian API
│   ├── database.ts              # In-memory SQLite helpers
│   └── api-responses.ts         # Mock WeChat API responses
└── fixtures/                    # Test data
    ├── sample-accounts.ts       # Account fixtures
    ├── sample-feeds.ts          # Feed fixtures
    ├── sample-articles.ts       # Article fixtures
    └── sample-html.ts           # HTML content samples
```

---

## Key Dependencies and Configuration

### Testing Stack

- **Jest**: Test runner and assertion library
- **ts-jest**: TypeScript preprocessor
- **jest-environment-jsdom**: DOM environment for ContentParser tests
- **jest-mock-extended**: Enhanced mocking utilities

### Jest Configuration

```javascript
// jest.config.js
{
  preset: 'ts-jest',
  testEnvironment: 'jsdom',  // For DOMParser support
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^obsidian$': '<rootDir>/src/__tests__/mocks/obsidian.ts'
  },
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70
    }
  }
}
```

---

## Data Models

### Mock Database Helpers (mocks/database.ts)

```typescript
// Create fresh in-memory SQLite database
export async function createMockDatabase(): Promise<Database> {
  await sqlJsWrapper.initialize();
  const db = sqlJsWrapper.createDatabase();

  // Run schema creation
  db.run(`CREATE TABLE accounts (...)`);
  db.run(`CREATE TABLE feeds (...)`);
  db.run(`CREATE TABLE articles (...)`);

  return db;
}

// Seed database with test data
export function seedDatabaseWith(
  db: Database,
  data: {
    accounts?: Array<Partial<Account>>;
    feeds?: Array<Partial<Feed>>;
    articles?: Array<Partial<Article>>;
  }
): void {
  // Insert test data
}

// Debug utilities
export function getAllRows(db: Database, table: string): any[];
export function countRows(db: Database, table: string): number;
export function clearAllTables(db: Database): void;
```

---

### Test Fixtures (fixtures/)

**Sample Account**:
```typescript
// fixtures/sample-accounts.ts
export const sampleAccount1 = {
  id: 1,
  name: 'test_user',
  cookie: JSON.stringify({vid: 12345, token: 'test-token'}),
  status: AccountStatus.ACTIVE,
  created_at: Date.now(),
  updated_at: Date.now()
};

export const sampleAccountBlacklisted = {
  id: 2,
  status: AccountStatus.BLACKLISTED,
  blacklisted_until: Date.now() + 24 * 60 * 60 * 1000,
  // ...
};
```

**Sample Feed**:
```typescript
// fixtures/sample-feeds.ts
export const sampleFeed1 = {
  id: 1,
  feed_id: 'MP_WXS_12345',
  title: 'Tech Blog',
  description: 'Latest tech news',
  account_id: 1,
  // ...
};
```

**Sample Article**:
```typescript
// fixtures/sample-articles.ts
export const sampleArticle1 = {
  id: 1,
  feed_id: 1,
  title: 'Article Title',
  content: 'Markdown content',
  content_html: '<p>HTML content</p>',
  url: 'https://example.com/article',
  published_at: Date.now(),
  synced: 0,
  // ...
};
```

---

### Mock Obsidian API (mocks/obsidian.ts)

```typescript
export class App {
  vault = {
    adapter: {
      exists: jest.fn(),
      readBinary: jest.fn(),
      writeBinary: jest.fn(),
      mkdir: jest.fn()
    },
    getAbstractFileByPath: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    modify: jest.fn()
  };
}

export class Plugin {
  app = new App();
  manifest = { dir: '.obsidian/plugins/wewe-rss' };
}

export class Modal {
  open = jest.fn();
  close = jest.fn();
  onOpen = jest.fn();
}

export class Notice {
  constructor(message: string, timeout?: number) {}
}

export const requestUrl = jest.fn();
```

---

## Testing and Quality

### Coverage Report

**Overall Coverage**: 70-100% across modules

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| **Database Layer** | 100% | 100% | 100% | 100% |
| **Services** | 95% | 92% | 95% | 96% |
| **Utils** | 100% | 100% | 100% | 100% |
| **Lib** | 95% | 90% | 95% | 95% |
| **UI** | 75% | 70% | 75% | 75% |

**Uncovered Areas**:
- `main.ts` (plugin entry - hard to test)
- UI event handlers (requires Electron environment)
- Error recovery paths (edge cases)

---

### Test Patterns

#### Repository Tests

```typescript
describe('AccountRepository', () => {
  let db: Database;
  let repository: AccountRepository;

  beforeEach(async () => {
    db = await createMockDatabase();
    const mockDbService = createMockDatabaseService(db);
    repository = new AccountRepository(mockDbService);
  });

  afterEach(() => {
    db.close();
  });

  it('should create account with default status', async () => {
    const account = await repository.create('user', 'cookie');

    expect(account.id).toBeDefined();
    expect(account.status).toBe(AccountStatus.ACTIVE);
  });
});
```

#### Service Tests

```typescript
describe('AccountService', () => {
  let service: AccountService;
  let mockApiClient: jest.Mocked<WeChatApiClient>;

  beforeEach(() => {
    mockApiClient = {
      createLoginUrl: jest.fn(),
      getLoginResult: jest.fn()
    } as any;

    const mockPlugin = createMockPlugin();
    service = new AccountService(mockPlugin);
    (service as any).apiClient = mockApiClient;
  });

  it('should create login URL', async () => {
    mockApiClient.createLoginUrl.mockResolvedValue({
      uuid: 'test-uuid',
      qrcode: 'data:image/png;base64,...'
    });

    const result = await service.createLoginUrl();

    expect(result.uuid).toBe('test-uuid');
  });
});
```

#### Content Parser Tests

```typescript
describe('ContentParser', () => {
  let parser: ContentParser;

  beforeEach(() => {
    parser = new ContentParser(false);
  });

  it('should convert HTML to Markdown', () => {
    const html = '<h1>Title</h1><p>Paragraph</p>';

    const { markdown } = parser.parseContent(html);

    expect(markdown).toContain('# Title');
    expect(markdown).toContain('Paragraph');
  });
});
```

---

## Frequently Asked Questions (FAQ)

### Q: How do I run a single test file?

```bash
npm test -- AccountRepository.test.ts
```

Or specific test:
```bash
npm test -- -t "should create account"
```

### Q: How do I debug failing tests?

**Add console logs**:
```typescript
it('should do something', () => {
  const result = someFunction();
  console.log('Result:', result);  // Debug output
  expect(result).toBe(expected);
});
```

**Use debugger**:
```typescript
it('should do something', () => {
  debugger;  // Breakpoint
  const result = someFunction();
});
```

Run with Node debugger:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Q: Why are tests slow?

**Common causes**:
- Database creation overhead (each test creates new DB)
- Async operations without proper mocking
- Large fixture data

**Optimization**:
```typescript
// Reuse database across tests (with cleanup)
let db: Database;

beforeAll(async () => {
  db = await createMockDatabase();
});

beforeEach(() => {
  clearAllTables(db);
});

afterAll(() => {
  db.close();
});
```

### Q: How do I test async code?

**Use async/await**:
```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

**Or return Promise**:
```typescript
it('should handle async operation', () => {
  return asyncFunction().then(result => {
    expect(result).toBeDefined();
  });
});
```

### Q: How do I mock timers?

```typescript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

it('should execute after timeout', () => {
  const callback = jest.fn();
  setTimeout(callback, 1000);

  jest.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
});
```

---

## Related File List

### Test Files (390 tests)
- `src/__tests__/unit/database/AccountRepository.test.ts` (48 tests)
- `src/__tests__/unit/database/FeedRepository.test.ts` (52 tests)
- `src/__tests__/unit/database/ArticleRepository.test.ts` (41 tests)
- `src/__tests__/unit/services/AccountService.test.ts` (68 tests)
- `src/__tests__/unit/services/FeedService.test.ts` (73 tests)
- `src/__tests__/unit/services/ContentParser.test.ts` (32 tests)
- `src/__tests__/unit/services/NoteCreator.test.ts` (16 tests)
- `src/__tests__/unit/utils/helpers.test.ts` (28 tests)
- `src/__tests__/unit/utils/logger.test.ts` (15 tests)
- `src/__tests__/unit/lib/html-parser.test.ts` (17 tests)

### Mock Files
- `src/__tests__/mocks/obsidian.ts` (120 lines)
- `src/__tests__/mocks/database.ts` (180 lines)
- `src/__tests__/mocks/api-responses.ts` (85 lines)

### Fixture Files
- `src/__tests__/fixtures/sample-accounts.ts`
- `src/__tests__/fixtures/sample-feeds.ts`
- `src/__tests__/fixtures/sample-articles.ts`
- `src/__tests__/fixtures/sample-html.ts`

### Configuration
- `jest.config.js` (project root)
- `package.json` (test scripts)

---

**Last Updated**: 2025-11-16 21:32:07
