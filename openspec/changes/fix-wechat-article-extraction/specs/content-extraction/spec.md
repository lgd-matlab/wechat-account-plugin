# Capability: WeChat Article Content Extraction

## Overview

**Capability**: WeChat Article Content Extraction
**Domain**: Content Processing / Parsing
**Status**: Proposed

Extract actual article content from WeChat public account HTML pages that embed content as escaped JavaScript strings.

---

## ADDED Requirements

### Requirement: Extract Embedded Article Content

The system MUST extract article content from WeChat HTML pages where content is embedded in JavaScript variables.

#### Scenario: WeChat Page with content_noencode Variable

**Given** the system fetches a WeChat article HTML page
**And** the page contains JavaScript code with `content_noencode: JsDecode('...')`
**When** the content parser processes the HTML
**Then** the system should extract the value of the `content_noencode` variable
**And** decode all JavaScript escape sequences in the extracted value
**And** pass the decoded HTML to the HTML-to-Markdown converter
**And** the final markdown should contain the actual article text
**And** the final markdown should NOT contain JavaScript code

---

### Requirement: Decode JavaScript Escape Sequences

The system MUST decode hex escape sequences used in WeChat's JavaScript encoding.

#### Scenario: Decode HTML Entity Escapes

**Given** a string contains JavaScript hex escapes
**When** the decoder processes: `"\x3ch1\x3eTitle\x3c/h1\x3e"`
**Then** it should output: `"<h1>Title</h1>"`

#### Scenario: Decode All Supported Escape Sequences

**Given** content with various escape sequences
**When** the decoder processes the content
**Then** it MUST correctly decode:
- `\x3c` → `<`
- `\x3e` → `>`
- `\x22` → `"`
- `\x27` → `'`
- `\x26` → `&`
- `\x0a` → newline character
- `\x0d` → carriage return
- `\x5c` → `\`

---

### Requirement: Fallback for Non-WeChat HTML

The system MUST gracefully handle HTML pages that do not contain embedded JavaScript content.

#### Scenario: Normal HTML Without JavaScript Embedding

**Given** the system receives standard HTML without `content_noencode`
**When** the extraction method attempts to find the JavaScript variable
**Then** extraction should fail gracefully
**And** the system should use the original HTML as-is
**And** the HTML-to-Markdown conversion should proceed normally
**And** no errors should be thrown

---

### Requirement: Preserve Existing Functionality

The content extraction enhancement MUST NOT break existing article parsing for non-WeChat sources.

#### Scenario: Backwards Compatibility with Existing Articles

**Given** an article was previously scraped without JavaScript extraction
**And** the article contains plain HTML
**When** the content parser re-processes the article
**Then** the markdown output should be identical to before
**And** no content should be lost
**And** no new errors should occur

---

## MODIFIED Requirements

### Requirement: Content Parsing Pipeline

The content parsing pipeline SHALL extract embedded JavaScript content before HTML cleaning and conversion.

#### Scenario: Parsing Order for WeChat Articles

**Given** a WeChat article HTML page is being parsed
**When** the `parseContent()` method is called
**Then** the system MUST follow this order:
1. Extract `content_noencode` from JavaScript
2. Decode escape sequences
3. Clean HTML (remove scripts/styles)
4. Convert to Markdown
**And** each step should receive the output of the previous step

---

## Implementation Notes

### Key Files
- `src/services/feed/ContentParser.ts` (lines 19-33) - Main parsing pipeline
- `src/services/feed/ContentParser.ts` (new methods) - Extraction and decoding

### Extraction Pattern
```typescript
// Regex to match: content_noencode: JsDecode('...')
const pattern = /content_noencode:\s*JsDecode\('([^']+)'\)/;
```

### Escape Sequence Decoding Order
Decode `\x5c` (backslash) FIRST to avoid double-escaping other sequences.

### Performance Considerations
- Regex matching: O(n) where n = HTML length
- Escape decoding: O(n) where n = content length
- Total overhead: <10ms for typical article (~50KB)

### Acceptance Criteria
- [ ] WeChat articles show clean content (no JavaScript)
- [ ] Chinese characters display correctly
- [ ] Images and links are preserved
- [ ] Non-WeChat HTML still works
- [ ] All existing unit tests pass
- [ ] New tests cover extraction logic
- [ ] No performance regression (parsing <50ms per article)
