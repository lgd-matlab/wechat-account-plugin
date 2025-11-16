[Root Directory](../../CLAUDE.md) > [src](../) > **utils**

# Utils Module

## Change Log (Changelog)

### 2025-11-16 21:32:07
- Initial documentation for utils module
- Documented helpers, logger, and constants

---

## Module Responsibilities

The utils module provides **common utility functions** and **shared constants**:

1. **helpers.ts**: String formatting, filename sanitization, date/time utilities
2. **logger.ts**: Structured logging with log levels
3. **constants.ts**: Application-wide constants

**Principle**: Pure functions with no side effects (except logging).

---

## Entry and Startup

Utilities are imported as needed:

```typescript
import { sanitizeFilename, formatTimestamp } from '../utils/helpers';
import { logger } from '../utils/logger';
import { DB_NAME, SYNC_INTERVAL } from '../utils/constants';
```

**No initialization required**.

---

## External Interfaces

### helpers.ts

#### String Utilities

```typescript
// Sanitize filename for safe file system usage
sanitizeFilename(filename: string): string
// "My Article: Title!" → "My Article - Title"
// Removes: \ / : * ? " < > |

// Truncate string to max length with ellipsis
truncate(str: string, maxLength: number): string
// "Long text here..." → "Long text..."

// Escape regex special characters
escapeRegex(str: string): string
// "test.txt" → "test\\.txt"
```

#### Date/Time Utilities

```typescript
// Format Unix timestamp to human-readable string
formatTimestamp(timestamp: number, format?: string): string
// 1700000000000 → "2023-11-15 12:34:56"

// Get relative time string
getRelativeTime(timestamp: number): string
// 2 minutes ago → "2m ago"
// 3 hours ago → "3h ago"
// 5 days ago → "5d ago"

// Check if timestamp is stale
isStale(timestamp: number, thresholdHours: number): boolean
// Used for determining if feed needs sync
```

#### Validation

```typescript
// Validate WeChat share link format
isValidWeChatLink(url: string): boolean
// Accepts: https://mp.weixin.qq.com/s/...
// Accepts: http://mp.weixin.qq.com/mp/homepage?__biz=...

// Validate RSS feed URL
isValidFeedUrl(url: string): boolean
```

#### Other

```typescript
// Generate unique ID
generateId(): string
// Returns: UUID v4 string

// Sleep for N milliseconds (async)
sleep(ms: number): Promise<void>
```

---

### logger.ts

**Purpose**: Centralized logging with namespaces and log levels

#### Usage Pattern

```typescript
import { Logger } from '../utils/logger';

export class MyService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MyService');
  }

  someMethod() {
    this.logger.info('Operation started');
    this.logger.debug('Debug details:', { data });
    this.logger.warn('Warning message');
    this.logger.error('Error occurred:', error);
  }
}
```

#### API

```typescript
class Logger {
  constructor(namespace: string);

  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// Singleton instance for ad-hoc logging
export const logger: Logger;
```

#### Output Format

```
[WeWe RSS][MyService] INFO: Operation started
[WeWe RSS][DatabaseService] DEBUG: Query executed in 5ms
[WeWe RSS][SyncService] ERROR: Sync failed: Network error
```

**Log Levels**:
- `DEBUG`: Detailed diagnostic info (queries, timings)
- `INFO`: General information (sync started, feed added)
- `WARN`: Warning conditions (blacklist cleared, missing data)
- `ERROR`: Error events (API failures, database errors)

---

### constants.ts

**Application Constants**:

```typescript
// Database
export const DB_NAME = 'wewe-rss.db';
export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// Sync
export const DEFAULT_SYNC_INTERVAL = 60; // minutes
export const DEFAULT_UPDATE_DELAY = 60; // seconds
export const MAX_ARTICLES_PER_FEED = 100;

// API
export const DEFAULT_PLATFORM_URL = 'https://weread.111965.xyz';
export const API_TIMEOUT = 15000; // 15 seconds
export const LOGIN_POLL_TIMEOUT = 120000; // 120 seconds

// Notes
export const DEFAULT_NOTE_FOLDER = 'WeWe RSS';
export const DEFAULT_NOTE_TEMPLATE = `---
title: {{title}}
...
`;

// Blacklist
export const BLACKLIST_DURATION = 24 * 60 * 60 * 1000; // 24 hours
```

---

## Key Dependencies and Configuration

### Dependencies

**helpers.ts**:
- `dayjs` (date/time formatting)
- No other external dependencies

**logger.ts**:
- `console` (native browser API)

**constants.ts**:
- None (pure constants)

---

## Data Models

### Helper Function Types

```typescript
// Filename sanitization
type Filename = string;
sanitizeFilename(input: string): Filename;

// Timestamp formatting
type UnixTimestamp = number; // Milliseconds
formatTimestamp(ts: UnixTimestamp): string;

// Relative time
getRelativeTime(ts: UnixTimestamp): string;
```

---

## Testing and Quality

### Test Coverage

**100% coverage** for helpers and logger

### Test Files

- `src/__tests__/unit/utils/helpers.test.ts` (28 tests)
- `src/__tests__/unit/utils/logger.test.ts` (15 tests)

### Sample Tests

```typescript
describe('helpers', () => {
  describe('sanitizeFilename', () => {
    it('should remove illegal characters', () => {
      expect(sanitizeFilename('test:file.txt')).toBe('test-file.txt');
      expect(sanitizeFilename('a<b>c')).toBe('a-b-c');
    });

    it('should preserve safe characters', () => {
      expect(sanitizeFilename('My File (v2).md')).toBe('My File (v2).md');
    });
  });

  describe('formatTimestamp', () => {
    it('should format Unix timestamp', () => {
      const ts = 1700000000000;
      const formatted = formatTimestamp(ts);
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('getRelativeTime', () => {
    it('should return "just now" for recent timestamps', () => {
      const now = Date.now();
      expect(getRelativeTime(now)).toBe('just now');
    });

    it('should return minutes ago', () => {
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      expect(getRelativeTime(twoMinutesAgo)).toBe('2m ago');
    });
  });
});

describe('Logger', () => {
  it('should log with namespace', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const logger = new Logger('TestService');

    logger.info('Test message');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[TestService]'),
      expect.stringContaining('Test message')
    );
  });
});
```

---

## Frequently Asked Questions (FAQ)

### Q: How do I add a new utility function?

**Steps**:
1. Add function to `helpers.ts` (or create new file if category different)
2. Export from module
3. Write tests in `__tests__/unit/utils/`
4. Document in this CLAUDE.md

**Example**:
```typescript
// helpers.ts
export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// helpers.test.ts
it('should capitalize first letter', () => {
  expect(capitalizeFirstLetter('hello')).toBe('Hello');
});
```

### Q: When should I use logger vs console?

**Use Logger**:
- In all service/repository classes
- For debugging during development
- For production error tracking

**Use console** directly:
- Only in `main.ts` for plugin lifecycle events
- Quick debugging (remove before commit)

### Q: How do I change log level in production?

**Current**: All levels logged to console

**Future Enhancement**:
```typescript
// Add to settings
export interface WeWeRssSettings {
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

// In Logger class
if (this.shouldLog(level)) {
  console.log(...);
}
```

### Q: Can I use dayjs for complex date formatting?

**Yes**:
```typescript
import dayjs from 'dayjs';

export function formatCustom(timestamp: number): string {
  return dayjs(timestamp).format('MMMM D, YYYY [at] h:mm A');
}
// "November 15, 2023 at 3:45 PM"
```

---

## Related File List

### Core Files
- `src/utils/helpers.ts` (180 lines)
- `src/utils/logger.ts` (85 lines)
- `src/utils/constants.ts` (45 lines)

### Test Files
- `src/__tests__/unit/utils/helpers.test.ts` (28 tests)
- `src/__tests__/unit/utils/logger.test.ts` (15 tests)

### Usage
- Used by all modules throughout the project

---

**Last Updated**: 2025-11-16 21:32:07
