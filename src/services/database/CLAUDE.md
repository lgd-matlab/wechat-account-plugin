[Root Directory](../../../CLAUDE.md) > [src](../../) > [services](../) > **database**

# Database Module

## Change Log (Changelog)

### 2025-11-16 21:32:07
- Initial documentation for database module
- Documented SQLite schema and migration system
- Repository pattern implementation guide

---

## Module Responsibilities

The database module provides **SQLite persistence layer** for the WeWe RSS plugin using sql.js (WebAssembly). It implements:

1. **DatabaseService**: Connection management, migrations, transaction control
2. **Repository Layer**: Type-safe data access objects (DAO pattern)
3. **Schema Management**: SQL migrations with version tracking

**Key Innovation**: Embedded SQLite database with file persistence in Obsidian's plugin directory, enabling full relational queries without external dependencies.

---

## Entry and Startup

### Initialization Sequence

```typescript
// Called from main.ts during plugin load
const databaseService = new DatabaseService(plugin);
await databaseService.initialize();

// Internally performs:
// 1. Load sql.js WASM
// 2. Check for existing .db file
// 3. Load database OR create new + run migrations
// 4. Setup auto-save timer (30s interval)
// 5. Initialize repositories
```

**Database File Path**: `.obsidian/plugins/wewe-rss/wewe-rss.db`

### Auto-Save Mechanism

Database is persisted to disk:
- Every 30 seconds (automatic)
- On plugin unload (manual save)
- After each migration

---

## External Interfaces

### DatabaseService

**Core Methods**:

```typescript
class DatabaseService {
  // Initialization
  async initialize(): Promise<void>
  async close(): Promise<void>

  // Query Execution
  query<T>(sql: string, params?: any[]): T[]
  queryOne<T>(sql: string, params?: any[]): T | null
  execute(sql: string, params?: any[]): void
  getLastInsertId(): number

  // Transactions
  beginTransaction(): void
  commit(): void
  rollback(): void

  // Persistence
  async save(): Promise<void>

  // Repositories (public properties)
  accounts: AccountRepository
  feeds: FeedRepository
  articles: ArticleRepository
}
```

**Usage Pattern**:
```typescript
// Via repository (recommended)
const account = plugin.databaseService.accounts.findById(1);

// Direct SQL (for complex queries)
const result = plugin.databaseService.query<CustomType>(
  'SELECT * FROM feeds WHERE account_id = ?',
  [accountId]
);
```

---

### Repository Interfaces

See [repositories/CLAUDE.md](./repositories/CLAUDE.md) for detailed documentation.

**AccountRepository**:
- `create(name, cookie)`, `findById(id)`, `findAll()`, `findActive()`
- `updateStatus(id, status)`, `blacklist(id)`, `delete(id)`

**FeedRepository**:
- `create(feedId, title, accountId)`, `findById(id)`, `findAll()`
- `findByAccountId(accountId)`, `findNeedingSync(hours)`, `updateLastSync(id)`

**ArticleRepository**:
- `create(articleData)`, `findById(id)`, `findByFeedId(feedId)`
- `findUnsynced()`, `update(id, data)`, `cleanupSynced(retentionDays)`

---

## Key Dependencies and Configuration

### External Dependencies

- **sql.js**: SQLite compiled to WebAssembly
  - Loaded via `src/lib/sql-js-wrapper.ts`
  - WASM file: `node_modules/sql.js/dist/sql-wasm.wasm`

- **Obsidian Vault API**: File I/O operations
  - `vault.adapter.exists(path)`
  - `vault.adapter.readBinary(path)`
  - `vault.adapter.writeBinary(path, data)`

### Configuration Constants

From `src/utils/constants.ts`:
```typescript
export const DB_NAME = 'wewe-rss.db';
export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
```

---

## Data Models

### Database Schema

#### Accounts Table
```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  cookie TEXT NOT NULL,                  -- JSON: {vid, token}
  status TEXT NOT NULL DEFAULT 'active', -- active|disabled|expired|blacklisted
  blacklisted_until INTEGER,             -- Unix timestamp (ms)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

#### Feeds Table
```sql
CREATE TABLE feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id TEXT NOT NULL UNIQUE,          -- WeChat MP ID
  title TEXT NOT NULL,
  description TEXT,
  account_id INTEGER NOT NULL,
  last_sync_at INTEGER,                  -- Unix timestamp (ms)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_feeds_feed_id ON feeds(feed_id);
```

#### Articles Table
```sql
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,                 -- Markdown
  content_html TEXT NOT NULL,            -- Original HTML
  url TEXT NOT NULL UNIQUE,
  published_at INTEGER NOT NULL,         -- Unix timestamp (ms)
  synced INTEGER NOT NULL DEFAULT 0,     -- Boolean: note created?
  note_id TEXT,                          -- Path to Obsidian note
  created_at INTEGER NOT NULL,
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE INDEX idx_articles_feed_id ON articles(feed_id);
CREATE INDEX idx_articles_url ON articles(url);
CREATE INDEX idx_articles_synced ON articles(synced);
```

#### Migrations Table
```sql
CREATE TABLE migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at INTEGER NOT NULL            -- Unix timestamp (ms)
);
```

---

## Migration System

### How Migrations Work

1. **Check migrations table** for applied migrations
2. **Run pending migrations** in order (001_initial, 002_xxx, etc.)
3. **Record each migration** with timestamp

### Adding a New Migration

**File Location**: Inline in `DatabaseService.ts` (for now)

**Pattern**:
```typescript
private async runMigrations(): Promise<void> {
  // Check migration 001_initial
  const result = this.db.exec(`
    SELECT name FROM migrations WHERE name = '001_initial'
  `);

  if (result.length === 0) {
    await this.runInitialMigration();
    this.db.run(`INSERT INTO migrations VALUES ('001_initial', ?)`);
  }

  // Add new migration here
  const result002 = this.db.exec(`
    SELECT name FROM migrations WHERE name = '002_add_column'
  `);

  if (result002.length === 0) {
    await this.run002Migration();
    this.db.run(`INSERT INTO migrations VALUES ('002_add_column', ?)`);
  }
}
```

**Future Improvement**: Extract to `src/services/database/migrations/` directory.

---

## Testing and Quality

### Test Coverage

- **DatabaseService**: 100% coverage (initialization, query methods, transactions)
- **AccountRepository**: 100% coverage (48 tests)
- **FeedRepository**: 100% coverage (52 tests)
- **ArticleRepository**: 100% coverage (41 tests)

**Total Database Tests**: 141 tests

### Test Infrastructure

**In-Memory Testing**:
```typescript
import { createMockDatabase } from '../../mocks/database';

// Each test gets fresh database
beforeEach(async () => {
  db = await createMockDatabase();
  // No file I/O - pure in-memory SQLite
});
```

**Helper Functions** (`src/__tests__/mocks/database.ts`):
- `createMockDatabase()` → Fresh SQLite instance
- `seedDatabaseWith(db, {accounts, feeds, articles})` → Populate test data
- `insertAccount(db, account)` → Raw SQL insert
- `getAllRows(db, table)` → Debug query
- `clearAllTables(db)` → Reset state

### Sample Test
```typescript
it('should create account with default ACTIVE status', async () => {
  const account = await repository.create('user', 'cookie');

  expect(account.status).toBe(AccountStatus.ACTIVE);
  expect(repository.count()).toBe(1);
});
```

---

## Frequently Asked Questions (FAQ)

### Q: Why sql.js instead of IndexedDB?

**Advantages**:
- Relational queries with JOINs
- SQL syntax (familiar)
- Easy migrations
- File-based persistence (fits Obsidian's vault model)

**Tradeoffs**:
- Larger bundle size (~500KB WASM)
- Must load entire database into memory
- Manual save required (not automatic like IndexedDB)

### Q: How big can the database get?

**Practical Limits**:
- Memory: Limited by available RAM (typically 100MB+)
- File size: No hard limit, but 10-50MB is comfortable
- Performance: Queries slow down after 100k+ rows

**Optimization**:
- Use `cleanupSynced(retentionDays)` to prune old articles
- Add indexes to frequently queried columns

### Q: What happens if database file is corrupted?

**Recovery**:
1. Plugin will fail to load database
2. Error logged to console
3. Manual fix: Delete `.db` file, plugin will recreate on next load
4. **Data loss**: All accounts/feeds/articles must be re-added

**Prevention**: Auto-save every 30s reduces risk.

### Q: Can I use raw SQL instead of repositories?

**Yes**, for complex queries:
```typescript
const result = databaseService.query<{feed_title: string, article_count: number}>(
  `SELECT f.title as feed_title, COUNT(a.id) as article_count
   FROM feeds f
   LEFT JOIN articles a ON a.feed_id = f.id
   GROUP BY f.id`,
  []
);
```

**But**: Use repositories for standard CRUD to maintain type safety.

### Q: How do I debug SQL queries?

**Enable Debug Logging**:
```typescript
// In DatabaseService.ts
logger.debug('Executing SQL:', sql, params);
```

**Inspect Database File**:
- Copy `.obsidian/plugins/wewe-rss/wewe-rss.db`
- Open with [DB Browser for SQLite](https://sqlitebrowser.org/)

---

## Related File List

### Core Files
- `src/services/database/DatabaseService.ts` (346 lines)
- `src/lib/sql-js-wrapper.ts` (60 lines)

### Repositories
- `src/services/database/repositories/AccountRepository.ts` (186 lines)
- `src/services/database/repositories/FeedRepository.ts` (214 lines)
- `src/services/database/repositories/ArticleRepository.ts` (193 lines)
- `src/services/database/repositories/index.ts` (10 lines - exports)

### Test Files
- `src/__tests__/unit/database/AccountRepository.test.ts`
- `src/__tests__/unit/database/FeedRepository.test.ts`
- `src/__tests__/unit/database/ArticleRepository.test.ts`
- `src/__tests__/mocks/database.ts` (mock helpers)

---

**Last Updated**: 2025-11-16 21:32:07
