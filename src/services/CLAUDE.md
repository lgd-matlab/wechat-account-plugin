[Root Directory](../../CLAUDE.md) > [src](../) > **services**

# Services Module

## Change Log (Changelog)

### 2025-11-16 21:32:07
- Initial documentation for services module
- Documented all 6 core service classes
- Established service interaction patterns

---

## Module Responsibilities

The services module contains the **core business logic layer** of the WeWe RSS plugin. Services orchestrate operations across repositories, external APIs, and Obsidian's vault system. They implement the application's use cases and coordinate between data persistence, external integrations, and user interfaces.

**Key Principle**: Services are stateless coordinators that compose repository operations and external API calls into higher-level workflows.

---

## Entry and Startup

Services are instantiated in `main.ts` during plugin load:

```typescript
// src/main.ts (lines 30-41)
async onload() {
  // Database initialized first
  this.databaseService = new DatabaseService(this);
  await this.databaseService.initialize();

  // Then services in dependency order
  this.accountService = new AccountService(this);
  this.feedService = new FeedService(this);
  this.noteCreator = new NoteCreator(this);
  this.syncService = new SyncService(this);
  this.taskScheduler = new TaskScheduler(this);

  // Start scheduled tasks
  this.taskScheduler.start();
}
```

**Initialization Order Matters**: DatabaseService must initialize before other services.

---

## External Interfaces

### AccountService
**Purpose**: Manage WeChat Reading accounts (login, status, blacklist handling)

**Key Methods**:
- `createLoginUrl()` → QR code for WeChat login
- `pollLoginResult(uuid)` → Check login status (long-polling)
- `addAccount(name, cookie)` → Save authenticated account
- `updateAccountStatus(id, status)` → Change account state
- `checkBlacklists()` → Auto-clear expired blacklists

**Used By**: AddAccountModal, SyncService

---

### FeedService
**Purpose**: Subscribe to WeChat public accounts and fetch articles

**Key Methods**:
- `subscribeFeed(wxsLink, accountId)` → Add new feed subscription
- `refreshFeed(feedId)` → Download new articles for a feed
- `fetchHistoricalArticles(feedId, maxPages)` → Backfill old articles
- `findAll()` / `findById(id)` → Query feeds

**Used By**: AddFeedModal, SyncService, WeWeRssSidebarView

---

### SyncService
**Purpose**: Orchestrate automated synchronization of feeds and note creation

**Key Methods**:
- `syncAll(options)` → Full sync: refresh feeds + create notes
- `syncFeed(feedId)` → Sync single feed
- `downloadArticlesOnly()` → Fetch without creating notes
- `getSyncStats()` → Metrics for UI display

**Used By**: TaskScheduler (automated), main.ts (manual sync command)

**SyncResult Interface**:
```typescript
{
  feedsRefreshed: number;
  feedsFailed: number;
  articlesDownloaded: number;
  notesCreated: number;
  notesSkipped: number;
  notesFailed: number;
  errors: string[];
}
```

---

### NoteCreator
**Purpose**: Convert articles to Markdown notes using templates

**Key Methods**:
- `createNoteFromArticle(article, feed)` → Generate single note
- `createNotesFromArticles(articles, feedsMap)` → Batch note creation
- `deleteNote(notePath)` → Remove note file
- `updateNote(notePath, content)` → Modify existing note

**Template Variables**:
- `{{title}}`, `{{feedName}}`, `{{author}}`, `{{publishedAt}}`
- `{{url}}`, `{{date}}`, `{{tags}}`, `{{content}}`

**Used By**: SyncService, WeWeRssSidebarView (manual note creation)

---

### TaskScheduler
**Purpose**: Execute recurring background tasks (auto-sync, blacklist checks)

**Key Methods**:
- `start()` → Begin scheduler
- `stop()` → Halt all tasks
- `registerTask(id, callback, intervalMinutes)` → Add scheduled task
- `unregisterTask(id)` → Remove task
- `pauseTask(id)` / `resumeTask(id)` → Control execution

**Built-in Tasks**:
- `auto-sync`: Periodic feed refresh (configurable interval)
- `blacklist-check`: Clear expired account blacklists (hourly)

**Used By**: main.ts (plugin lifecycle)

---

### DatabaseService
(Detailed in [database module docs](./database/CLAUDE.md))

**Purpose**: SQLite database abstraction layer

**Used By**: All services (via repositories)

---

## Key Dependencies and Configuration

### Service Dependencies

All services depend on:
- `WeWeRssPlugin` instance (injected via constructor)
- `Logger` utility (from `src/utils/logger.ts`)

Individual dependencies:
- **AccountService**: WeChatApiClient, AccountRepository
- **FeedService**: WeChatApiClient, FeedRepository, ArticleRepository, ContentParser
- **SyncService**: FeedService, NoteCreator, DatabaseService
- **NoteCreator**: Obsidian Vault API, ArticleRepository
- **TaskScheduler**: None (self-contained)

### Configuration Sources

Services read from `plugin.settings`:
- `autoSync` (boolean)
- `syncInterval` (minutes)
- `noteLocation` (string path)
- `noteTemplate` (string with variables)
- `platformUrl` (WeChat API base URL)
- `maxArticlesPerFeed` (number)

See `src/types/index.ts` for full `WeWeRssSettings` interface.

---

## Data Models

### Service Layer Models

Services work with domain entities from `src/types/`:

**Account**:
```typescript
{
  id: number;
  name: string;
  cookie: string;  // JSON: {vid, token}
  status: AccountStatus;  // ACTIVE | BLACKLISTED | DISABLED | EXPIRED
  blacklistedUntil?: number;
  createdAt: number;
  updatedAt: number;
}
```

**Feed**:
```typescript
{
  id: number;
  feedId: string;  // WeChat MP ID (e.g., "MP_WXS_123")
  title: string;
  description: string;
  accountId: number;
  lastSyncAt?: number;
  createdAt: number;
  updatedAt: number;
}
```

**Article**:
```typescript
{
  id: number;
  feedId: number;
  title: string;
  content: string;         // Markdown
  contentHtml: string;     // Original HTML
  url: string;
  publishedAt: number;
  synced: boolean;         // Note created?
  noteId?: string;         // Path to note
  createdAt: number;
}
```

---

## Testing and Quality

### Test Coverage

- **AccountService**: 68 tests (95% coverage)
- **FeedService**: 73 tests (97% coverage)
- **SyncService**: Not yet tested (priority for next sprint)
- **NoteCreator**: 16 tests (88% coverage)
- **TaskScheduler**: Not yet tested (low priority - simple logic)

### Test Files

- `src/__tests__/unit/services/AccountService.test.ts`
- `src/__tests__/unit/services/FeedService.test.ts`
- `src/__tests__/unit/services/NoteCreator.test.ts`
- `src/__tests__/unit/services/ContentParser.test.ts`

### Testing Approach

**Mocks Used**:
- Obsidian API: `src/__tests__/mocks/obsidian.ts`
- WeChat API responses: `src/__tests__/mocks/api-responses.ts`
- Database: In-memory SQLite via `src/__tests__/mocks/database.ts`

**Sample Test Pattern**:
```typescript
describe('AccountService', () => {
  let service: AccountService;
  let mockPlugin: any;

  beforeEach(() => {
    mockPlugin = createMockPlugin();
    service = new AccountService(mockPlugin);
  });

  it('should create account after successful login', async () => {
    const result = await service.pollLoginResult('test-uuid');
    expect(result.success).toBe(true);
    // Verify account saved to database
  });
});
```

---

## Frequently Asked Questions (FAQ)

### Q: How do I add a new service?

1. Create file in `src/services/YourService.ts`
2. Implement constructor accepting `WeWeRssPlugin`
3. Add service instantiation to `main.ts onload()`
4. Create corresponding test file
5. Update this CLAUDE.md

### Q: Why are services coupled to the plugin instance?

**Answer**: Services need access to:
- Database service (via `plugin.databaseService`)
- Settings (via `plugin.settings`)
- Obsidian vault (via `plugin.app.vault`)

Alternative would be passing 10+ dependencies individually.

### Q: How do I handle errors in services?

**Pattern**:
```typescript
try {
  // Operation
  this.logger.info('Operation succeeded');
  return result;
} catch (error) {
  this.logger.error('Operation failed:', error);
  throw error; // Re-throw for caller to handle
}
```

Never swallow errors silently!

### Q: When should logic go in a service vs repository?

**Repository**: Pure data access (CRUD operations)
**Service**: Business logic requiring multiple repositories or external APIs

Example:
- `feedRepository.findById(id)` ← Repository
- `feedService.refreshFeed(id)` ← Service (calls API + repository)

### Q: How do I test async operations with timers?

Use Jest's fake timers:
```typescript
jest.useFakeTimers();
taskScheduler.start();
jest.advanceTimersByTime(60000); // Advance 1 minute
expect(taskCallback).toHaveBeenCalled();
jest.useRealTimers();
```

---

## Related File List

### Core Service Files
- `src/services/AccountService.ts` (247 lines)
- `src/services/FeedService.ts` (312 lines)
- `src/services/SyncService.ts` (269 lines)
- `src/services/NoteCreator.ts` (265 lines)
- `src/services/TaskScheduler.ts` (178 lines)

### Sub-Modules
- [database/](./database/CLAUDE.md) - Database service and repositories
- [api/](./api/CLAUDE.md) - WeChat API client
- [feed/](./feed/CLAUDE.md) - Content parsing and feed generation

### Related Files
- `src/main.ts` - Service initialization
- `src/types/index.ts` - Type definitions
- `src/utils/logger.ts` - Logging utility

---

**Last Updated**: 2025-11-16 21:32:07
