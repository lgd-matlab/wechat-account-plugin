[Root Directory](../../../../CLAUDE.md) > [src](../../../) > [services](../../) > [database](../) > **repositories**

# Repositories Module

## Change Log (Changelog)

### 2025-11-16 21:32:07
- Initial documentation for repositories module
- Comprehensive API reference for all 3 repositories
- 100% test coverage documented

---

## Module Responsibilities

The repositories module implements the **Repository Pattern** for type-safe database access. Each repository encapsulates SQL operations for a specific domain entity, providing:

1. **Abstraction**: Hide SQL details behind method APIs
2. **Type Safety**: Strong TypeScript typing for queries/results
3. **Reusability**: Shared data access logic across services
4. **Testability**: Easy to mock in unit tests

**Pattern**: Repository acts as in-memory collection interface over database tables.

---

## Entry and Startup

Repositories are instantiated by `DatabaseService`:

```typescript
// src/services/database/DatabaseService.ts (lines 26-34)
export class DatabaseService {
  public accounts: AccountRepository;
  public feeds: FeedRepository;
  public articles: ArticleRepository;

  constructor(plugin: WeWeRssPlugin) {
    this.accounts = new AccountRepository(this);
    this.feeds = new FeedRepository(this);
    this.articles = new ArticleRepository(this);
  }
}
```

**Access Pattern**:
```typescript
// From any service
const accounts = this.plugin.databaseService.accounts.findAll();
const feed = this.plugin.databaseService.feeds.findById(123);
```

---

## External Interfaces

### AccountRepository

**Purpose**: Manage WeChat Reading account data

#### Create & Read
```typescript
// Create new account (returns with auto-generated ID)
create(name: string, cookie: string): Account

// Find by ID (returns null if not found)
findById(id: number): Account | null

// Get all accounts (newest first)
findAll(): Account[]

// Get only active/blacklisted accounts
findActive(): Account[]

// Filter by specific status
findByStatus(status: AccountStatus): Account[]
```

#### Update
```typescript
// Change account status (with optional blacklist time)
updateStatus(id: number, status: AccountStatus, blacklistedUntil?: number): void

// Blacklist account for duration (default: 24 hours)
blacklist(id: number, durationMs?: number): void

// Check and clear expired blacklists
checkAndClearBlacklist(id: number): boolean

// Update credentials
updateCookie(id: number, cookie: string): void

// Update display name
updateName(id: number, name: string): void
```

#### Delete & Count
```typescript
// Remove account (cascades to feeds/articles)
delete(id: number): void

// Count total accounts
count(): number

// Count by status
countByStatus(status: AccountStatus): number
```

---

### FeedRepository

**Purpose**: Manage WeChat public account subscriptions

#### Create & Read
```typescript
// Create new feed subscription
create(feedId: string, title: string, description: string, accountId: number): Feed

// Find by database ID
findById(id: number): Feed | null

// Find by WeChat feed ID (unique)
findByFeedId(feedId: string): Feed | null

// Get all feeds (newest first)
findAll(): Feed[]

// Get feeds for specific account
findByAccountId(accountId: number): Feed[]

// Find feeds needing sync (not synced in N hours)
findNeedingSync(staleThresholdHours: number): Feed[]
```

#### Update
```typescript
// Update feed metadata
update(id: number, updates: Partial<Feed>): void

// Record sync timestamp
updateLastSync(id: number, timestamp?: number): void
```

#### Delete & Count
```typescript
// Remove feed (cascades to articles)
delete(id: number): void

// Count total feeds
count(): number

// Count feeds for account
countByAccountId(accountId: number): number
```

---

### ArticleRepository

**Purpose**: Manage downloaded WeChat articles

#### Create & Read
```typescript
// Create new article
create(data: {
  feedId: number;
  title: string;
  content: string;      // Markdown
  contentHtml: string;  // Original HTML
  url: string;          // Must be unique
  publishedAt: number;
}): Article

// Bulk create (returns created count)
createBulk(articles: Array<CreateArticleData>): number

// Find by ID
findById(id: number): Article | null

// Find by URL (for deduplication)
findByUrl(url: string): Article | null

// Get all articles for feed (newest first)
findByFeedId(feedId: number): Article[]

// Get all articles
findAll(): Article[]

// Get unsynced articles (no note created yet)
findUnsynced(): Article[]

// Get recent articles (across all feeds)
findRecent(limit: number): Article[]
```

#### Update
```typescript
// Update article fields
update(id: number, updates: Partial<Article>): void

// Mark as synced with note path
markAsSynced(id: number, noteId: string): void
```

#### Delete & Count
```typescript
// Remove single article
delete(id: number): void

// Delete all articles for feed
deleteByFeedId(feedId: number): void

// Cleanup old synced articles (data retention)
cleanupSynced(retentionDays: number): number

// Count total articles
count(): number

// Count unsynced articles
countUnsynced(): number

// Count articles for feed
countByFeedId(feedId: number): number
```

---

## Key Dependencies and Configuration

### Dependencies

Each repository depends on:
- `DatabaseService` instance (for SQL execution)
- `Logger` utility (for debugging)

Injected via constructor:
```typescript
export class AccountRepository {
  constructor(private db: DatabaseService) {}
}
```

### No External Configuration

Repositories use schema defined in `DatabaseService.runInitialMigration()`.

---

## Data Models

### Type Mappings

**TypeScript → SQLite**:
```typescript
number    → INTEGER
string    → TEXT
boolean   → INTEGER (0/1)
Date      → INTEGER (Unix milliseconds)
undefined → NULL
```

### Domain Entities

**Account** (from `src/types/index.ts`):
```typescript
interface Account {
  id: number;                    // AUTO INCREMENT
  name: string;                  // Display name
  cookie: string;                // JSON: {vid, token}
  status: AccountStatus;         // Enum: ACTIVE|BLACKLISTED|DISABLED|EXPIRED
  blacklistedUntil?: number;     // Optional timestamp
  createdAt: number;             // Unix ms
  updatedAt: number;             // Unix ms
}
```

**Feed**:
```typescript
interface Feed {
  id: number;                    // AUTO INCREMENT
  feedId: string;                // WeChat MP ID (UNIQUE)
  title: string;
  description: string;
  accountId: number;             // FK → accounts.id
  lastSyncAt?: number;           // Optional timestamp
  createdAt: number;
  updatedAt: number;
}
```

**Article**:
```typescript
interface Article {
  id: number;                    // AUTO INCREMENT
  feedId: number;                // FK → feeds.id
  title: string;
  content: string;               // Markdown
  contentHtml: string;           // Original HTML
  url: string;                   // UNIQUE
  publishedAt: number;           // Unix ms
  synced: boolean;               // Note created?
  noteId?: string;               // Path to note
  createdAt: number;
}
```

---

## Testing and Quality

### Test Coverage

**100% coverage** across all repositories:

- **AccountRepository**: 48 tests
  - Create: 3 tests
  - Find: 16 tests (by ID, all, active, by status)
  - Update: 14 tests (status, blacklist, cookie, name)
  - Delete: 3 tests
  - Count: 6 tests

- **FeedRepository**: 52 tests
  - Create: 4 tests
  - Find: 18 tests (by ID, feedId, account, stale)
  - Update: 8 tests
  - Delete: 6 tests
  - Count: 7 tests

- **ArticleRepository**: 41 tests
  - Create: 7 tests (single, bulk, duplicates)
  - Find: 12 tests (by ID, URL, feed, unsynced, recent)
  - Update: 5 tests
  - Delete: 8 tests (single, by feed, cleanup)
  - Count: 5 tests

### Test Patterns

**Setup**:
```typescript
beforeEach(async () => {
  db = await createMockDatabase();
  dbService = new DatabaseService(mockPlugin);
  dbService.db = db;
  repository = new AccountRepository(dbService);
});
```

**Using Fixtures**:
```typescript
import { sampleAccount1, sampleAccount2 } from '../../fixtures/sample-accounts';

insertAccount(db, sampleAccount1);
const account = repository.findById(sampleAccount1.id);
```

**Assertions**:
```typescript
expect(account).toBeDefined();
expect(account?.name).toBe('test_user');
expect(repository.count()).toBe(1);
```

---

## Frequently Asked Questions (FAQ)

### Q: Should I add business logic to repositories?

**No**. Repositories should only handle data access.

**Correct** (in repository):
```typescript
findActive(): Account[] {
  return this.db.query(`
    SELECT * FROM accounts
    WHERE status IN ('active', 'blacklisted')
  `);
}
```

**Incorrect** (belongs in service):
```typescript
// DON'T do this in repository
refreshFeed(id: number) {
  const feed = this.findById(id);
  const articles = apiClient.fetchArticles(feed.feedId);
  // ...business logic...
}
```

### Q: How do I handle NULL values?

**Pattern**:
```typescript
findById(id: number): Account | null {
  const result = this.db.queryOne<Account>(...);
  return result; // null if not found
}
```

Always return `null` for missing records (never `undefined`).

### Q: What about transactions?

**Use DatabaseService**:
```typescript
// In service layer, not repository
this.db.beginTransaction();
try {
  this.db.accounts.create('user', 'cookie');
  this.db.feeds.create('feed123', 'title', 1);
  this.db.commit();
} catch (error) {
  this.db.rollback();
  throw error;
}
```

### Q: How do I add a new query method?

1. Add method to repository class
2. Write SQL query using `this.db.query()` or `this.db.execute()`
3. Map result to TypeScript type
4. Write tests in corresponding test file
5. Update this documentation

**Example**:
```typescript
// In FeedRepository
findByTitle(title: string): Feed[] {
  return this.db.query<Feed>(
    'SELECT * FROM feeds WHERE title LIKE ?',
    [`%${title}%`]
  );
}
```

### Q: Why are timestamps stored as numbers?

**Reason**: SQLite doesn't have native Date type.

**Convention**:
- Store as Unix milliseconds (`Date.now()`)
- Convert to Date object in application layer if needed

```typescript
const account = repository.findById(1);
const createdDate = new Date(account.createdAt);
```

---

## Related File List

### Repository Implementations
- `src/services/database/repositories/AccountRepository.ts` (186 lines)
- `src/services/database/repositories/FeedRepository.ts` (214 lines)
- `src/services/database/repositories/ArticleRepository.ts` (193 lines)
- `src/services/database/repositories/index.ts` (10 lines)

### Test Files
- `src/__tests__/unit/database/AccountRepository.test.ts` (462 lines, 48 tests)
- `src/__tests__/unit/database/FeedRepository.test.ts` (512 lines, 52 tests)
- `src/__tests__/unit/database/ArticleRepository.test.ts` (438 lines, 41 tests)

### Test Utilities
- `src/__tests__/mocks/database.ts` - Mock database helpers
- `src/__tests__/fixtures/sample-accounts.ts` - Test data
- `src/__tests__/fixtures/sample-feeds.ts` - Test data
- `src/__tests__/fixtures/sample-articles.ts` - Test data

### Dependencies
- `src/services/database/DatabaseService.ts` - Parent service
- `src/types/index.ts` - Domain entity types
- `src/utils/logger.ts` - Logging utility

---

**Last Updated**: 2025-11-16 21:32:07
