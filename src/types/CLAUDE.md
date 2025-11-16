[Root Directory](../../CLAUDE.md) > [src](../) > **types**

# Types Module

## Change Log (Changelog)

### 2025-11-16 21:32:07
- Initial documentation for types module
- Complete TypeScript interface reference

---

## Module Responsibilities

The types module contains **all TypeScript type definitions** for the WeWe RSS plugin:

1. **index.ts**: Core domain entities (Account, Feed, Article) and settings
2. **obsidian-ext.ts**: Extensions to Obsidian's type definitions
3. **wewe-rss.ts**: WeWe RSS server API types (external integration)

**Purpose**: Single source of truth for type safety across the project.

---

## Entry and Startup

Types are imported throughout the codebase:

```typescript
import { Account, Feed, Article, WeWeRssSettings } from '../types';
import { AccountStatus } from '../types';
```

**No runtime code** - types are erased during compilation.

---

## External Interfaces

### Core Domain Types (index.ts)

#### WeWeRssSettings

**Plugin configuration interface**:

```typescript
interface WeWeRssSettings {
  // Database
  databasePath: string;

  // Sync settings
  syncSchedule: string;        // Cron expression
  autoSync: boolean;
  syncInterval: number;        // Minutes
  updateDelay: number;         // Seconds between requests
  maxArticlesPerFeed: number;

  // Note creation
  noteFolder: string;
  noteLocation: string;        // Alias for noteFolder
  noteTemplate: string;        // Markdown with variables
  addTags: boolean;

  // Title filtering
  titleIncludePatterns: string[];  // Regex
  titleExcludePatterns: string[];  // Regex

  // API settings
  platformUrl: string;
  maxRequestsPerMinute: number;

  // Content settings
  feedMode: 'summary' | 'fulltext';
  enableCleanHtml: boolean;
}
```

**Default Values**: See `DEFAULT_SETTINGS` constant in `index.ts`

---

#### Account

**WeChat Reading account**:

```typescript
interface Account {
  id: number;                    // Database ID
  name: string;                  // Display name
  cookie: string;                // JSON: {vid: number, token: string}
  status: AccountStatus;
  blacklistedUntil?: number;     // Unix timestamp (ms)
  createdAt: number;             // Unix timestamp (ms)
  updatedAt: number;
}

enum AccountStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
  BLACKLISTED = 'blacklisted'
}
```

**Cookie Format**:
```json
{
  "vid": 12345,
  "token": "abc123xyz..."
}
```

---

#### Feed

**WeChat public account subscription**:

```typescript
interface Feed {
  id: number;                    // Database ID
  feedId: string;                // WeChat MP ID (e.g., "MP_WXS_123")
  title: string;                 // Public account name
  description: string;
  accountId: number;             // FK to Account
  lastSyncAt?: number;           // Unix timestamp (ms)
  createdAt: number;
  updatedAt: number;
}
```

---

#### Article

**Downloaded WeChat article**:

```typescript
interface Article {
  id: number;                    // Database ID
  feedId: number;                // FK to Feed
  title: string;
  content: string;               // Markdown
  contentHtml: string;           // Original HTML
  url: string;                   // Permanent link (unique)
  publishedAt: number;           // Unix timestamp (ms)
  synced: boolean;               // Note created?
  noteId?: string;               // Obsidian note path
  createdAt: number;
}
```

---

#### Database Schema Type

**Internal type for SQL query results**:

```typescript
interface DBTables {
  accounts: Account;
  feeds: Feed;
  articles: Article;
  settings: {
    key: string;
    value: string;
  };
}
```

---

### Obsidian Extensions (obsidian-ext.ts)

**Type augmentations for Obsidian API**:

```typescript
// Extend Obsidian's Plugin class
declare module 'obsidian' {
  interface Plugin {
    // Add custom properties to plugin instance
    databaseService: DatabaseService;
    accountService: AccountService;
    // ... other services
  }
}
```

**Purpose**: Add type safety for plugin-specific properties.

---

### WeWe RSS Server Types (wewe-rss.ts)

**External API integration types**:

```typescript
// Login response from WeWe RSS server
interface WeWeLoginResponse {
  token: string;
  vid: number;
  username: string;
}

// Public account metadata
interface WeMpInfo {
  id: string;        // MP ID
  name: string;      // Account name
  description: string;
  avatar?: string;   // Avatar URL
}

// Article from WeWe RSS API
interface WeWeArticle {
  id: string;
  title: string;
  content_html: string;
  url: string;
  published_at: number;  // Unix seconds
  author?: string;
}
```

**Note**: These types match the external WeWe RSS server API format.

---

## Key Dependencies and Configuration

### No Dependencies

Types module is **pure TypeScript** with no runtime dependencies.

### Type-Only Imports

```typescript
// Correct: Type-only import
import type { Account, Feed } from '../types';

// Also correct: Named import (tree-shaking removes at runtime)
import { Account, Feed } from '../types';
```

---

## Data Models

### Type Relationships

```
Account (1) ─── (N) Feed
                  │
                  └─── (N) Article (1) ─── (1) Obsidian Note
```

**Foreign Keys**:
- `Feed.accountId` → `Account.id`
- `Article.feedId` → `Feed.id`
- `Article.noteId` → Obsidian vault path

### Type Guards

**User-defined type guards for runtime checking**:

```typescript
// In helpers or services
export function isAccount(obj: any): obj is Account {
  return typeof obj === 'object' &&
         typeof obj.id === 'number' &&
         typeof obj.name === 'string' &&
         typeof obj.cookie === 'string';
}

export function isValidStatus(status: string): status is AccountStatus {
  return Object.values(AccountStatus).includes(status as AccountStatus);
}
```

---

## Testing and Quality

### No Direct Tests

Types are validated by:
1. **TypeScript compiler** during build
2. **Usage in test files** (type errors fail compilation)
3. **Repository tests** (ensure types match database schema)

### Type Coverage

**100%** - All domain entities, settings, and API responses typed.

---

## Frequently Asked Questions (FAQ)

### Q: When should I add a new type?

**Add to types module when**:
- Representing a domain entity (Account, Feed, etc.)
- Defining a service interface (SyncResult, etc.)
- Typing external API responses

**Keep local when**:
- Internal to single file/class
- Private implementation detail

### Q: How do I extend an existing interface?

**Pattern**:
```typescript
// types/index.ts
export interface Account {
  id: number;
  name: string;
  // ... existing fields
}

// Extend in another file
import { Account } from '../types';

interface ExtendedAccount extends Account {
  customField: string;
}
```

### Q: Should I use interface or type?

**Guidelines**:
- **Interface**: For objects that can be extended
  ```typescript
  interface Account { ... }
  ```

- **Type**: For unions, primitives, mapped types
  ```typescript
  type AccountStatus = 'active' | 'disabled' | 'expired';
  type Nullable<T> = T | null;
  ```

### Q: How do I type async functions?

**Pattern**:
```typescript
async function fetchData(): Promise<Account> {
  // Implementation
}

// Or with explicit return type
const fetchData = async (): Promise<Account> => {
  // Implementation
};
```

### Q: What about generic types?

**Example**:
```typescript
interface Repository<T> {
  findById(id: number): T | null;
  findAll(): T[];
}

class AccountRepository implements Repository<Account> {
  // ...
}
```

---

## Related File List

### Core Files
- `src/types/index.ts` (120 lines) - Main types
- `src/types/obsidian-ext.ts` (30 lines) - Obsidian extensions
- `src/types/wewe-rss.ts` (60 lines) - External API types

### Usage
- Imported by **all modules** throughout the project

### Related
- `src/services/database/repositories/` - Uses domain types
- `src/services/api/types.ts` - API-specific types

---

**Last Updated**: 2025-11-16 21:32:07
