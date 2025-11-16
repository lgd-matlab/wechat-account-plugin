[Root Directory](../../CLAUDE.md) > [src](../) > **lib**

# Lib Module

## Change Log (Changelog)

### 2025-11-16 21:32:07
- Initial documentation for lib module
- Documented low-level utilities and wrappers

---

## Module Responsibilities

The lib module contains **low-level utility libraries** that wrap external dependencies:

1. **html-parser**: DOM parsing utilities (wrapper around DOMParser)
2. **sql-js-wrapper**: SQLite WASM loader and database creation

**Purpose**: Isolate third-party dependencies behind simple, testable interfaces.

---

## Entry and Startup

Libraries are used by services:

```typescript
// html-parser used by ContentParser
import { parseHtml, htmlToText } from '../../lib/html-parser';

// sql-js-wrapper used by DatabaseService
import { sqlJsWrapper } from '../../lib/sql-js-wrapper';
await sqlJsWrapper.initialize();
```

**No initialization** except sql-js WASM loading.

---

## External Interfaces

### html-parser

**Purpose**: Lightweight HTML parsing without external dependencies

#### Core Functions

```typescript
// Parse HTML string to DOM Document
parseHtml(html: string): Document

// Convert HTML to plain text (strip all tags)
htmlToText(html: string): string

// Extract text from specific element
extractText(html: string, selector: string): string

// Remove elements matching selector
removeElements(html: string, selector: string): string

// Query all elements matching selector
queryAll(html: string, selector: string): Element[]

// Get element attribute value
getAttribute(element: Element, attr: string): string | null
```

#### Implementation

Uses **native DOMParser** API:

```typescript
export function parseHtml(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}
```

**Advantages**:
- Zero dependencies
- Fast (native browser API)
- Full CSS selector support

**Limitations**:
- Requires DOM environment (Electron ✓, Node.js ✗)

---

### sql-js-wrapper

**Purpose**: Simplify sql.js WASM loading and database operations

#### Core Functions

```typescript
// Initialize sql.js WASM (async, call once)
async initialize(): Promise<void>

// Create new in-memory database
createDatabase(): Database

// Load database from Uint8Array
loadDatabase(data: Uint8Array): Database

// Export database to Uint8Array
exportDatabase(db: Database): Uint8Array
```

#### Implementation

**WASM Loading**:
```typescript
import initSqlJs from 'sql.js';

export const sqlJsWrapper = {
  SQL: null as any,

  async initialize() {
    if (!this.SQL) {
      this.SQL = await initSqlJs({
        locateFile: file => `node_modules/sql.js/dist/${file}`
      });
    }
  },

  createDatabase() {
    return new this.SQL.Database();
  }
};
```

**Why Wrapper?**
- Centralize WASM initialization
- Easier to mock in tests
- Hide sql.js API complexity

---

## Key Dependencies and Configuration

### External Dependencies

**html-parser**:
- `DOMParser` (browser API, available in Electron)

**sql-js-wrapper**:
- `sql.js` library (npm package)
- `sql-wasm.wasm` file (~500KB)

### Configuration

**WASM File Path**:
- Default: `node_modules/sql.js/dist/sql-wasm.wasm`
- Bundled by esbuild during build

---

## Data Models

### html-parser Types

```typescript
// Standard DOM types (from TypeScript lib.dom.d.ts)
Document
Element
NodeList
```

### sql-js-wrapper Types

```typescript
import { Database } from 'sql.js';

// Re-exported for convenience
export type { Database };
```

---

## Testing and Quality

### Test Coverage

- **html-parser**: 95% coverage (17 tests)
- **sql-js-wrapper**: Not directly tested (tested via DatabaseService)

### Test File

`src/__tests__/unit/lib/html-parser.test.ts`

### Sample Tests

```typescript
describe('html-parser', () => {
  it('should parse HTML string', () => {
    const html = '<div><p>Hello</p></div>';
    const doc = parseHtml(html);

    expect(doc.querySelector('p')?.textContent).toBe('Hello');
  });

  it('should convert HTML to text', () => {
    const html = '<strong>Bold</strong> <em>italic</em>';
    const text = htmlToText(html);

    expect(text).toBe('Bold italic');
  });

  it('should remove elements by selector', () => {
    const html = '<div><script>alert(1)</script><p>Text</p></div>';
    const clean = removeElements(html, 'script');

    expect(clean).not.toContain('script');
    expect(clean).toContain('<p>Text</p>');
  });
});
```

---

## Frequently Asked Questions (FAQ)

### Q: Why wrap DOMParser instead of using it directly?

**Reasons**:
1. **Testability**: Easier to mock wrapper than global `DOMParser`
2. **Type safety**: Wrapper can add custom types
3. **Consistency**: Single import point for HTML parsing
4. **Future-proofing**: Can swap implementation if needed

### Q: What if sql.js WASM file is missing?

**Error**:
```
Failed to initialize sql.js: Cannot find module 'sql-wasm.wasm'
```

**Fix**:
- Ensure `node_modules/sql.js/dist/sql-wasm.wasm` exists
- Check esbuild config copies WASM file
- In production, bundle WASM with plugin

### Q: Can I use html-parser in Node.js?

**No** - requires browser DOM API.

**Alternative**: Use `jsdom` or `cheerio` for Node.js:
```typescript
import { JSDOM } from 'jsdom';
const doc = new JSDOM(html).window.document;
```

### Q: How do I handle large databases with sql.js?

**Limitations**:
- Entire database loaded into memory
- WASM has ~2GB memory limit

**Optimization**:
- Regular cleanup with `cleanupSynced()`
- Archive old data to separate file
- Consider switching to native SQLite for very large datasets

---

## Related File List

### Core Files
- `src/lib/html-parser.ts` (55 lines)
- `src/lib/sql-js-wrapper.ts` (60 lines)

### Usage
- `src/services/feed/ContentParser.ts` - Uses html-parser
- `src/services/database/DatabaseService.ts` - Uses sql-js-wrapper

### Test Files
- `src/__tests__/unit/lib/html-parser.test.ts` (17 tests)

### Dependencies
- `node_modules/sql.js/` - SQLite WASM
- `node_modules/@types/sql.js/` - TypeScript definitions

---

**Last Updated**: 2025-11-16 21:32:07
