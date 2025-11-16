[Root Directory](../../../CLAUDE.md) > [src](../../) > [services](../) > **feed**

# Feed Module

## Change Log (Changelog)

### 2025-11-16 21:32:07
- Initial documentation for feed module
- ContentParser HTML→Markdown conversion guide
- FeedGenerator for RSS/Atom (future feature)

---

## Module Responsibilities

The feed module handles **content processing** for WeChat articles:

1. **ContentParser**: Convert HTML to clean Markdown
2. **FeedGenerator**: Generate RSS/Atom feeds (planned feature)
3. **HTML Cleaning**: Remove scripts, styles, empty paragraphs
4. **Link/Image Extraction**: Parse embedded media

**Core Innovation**: Native DOM parsing (no heavy dependencies like cheerio/turndown)

---

## Entry and Startup

Content parser is instantiated by services:

```typescript
// In FeedService or NoteCreator
import { ContentParser } from './feed/ContentParser';

export class FeedService {
  private contentParser: ContentParser;

  constructor(plugin: WeWeRssPlugin) {
    const enableClean = plugin.settings.enableCleanHtml;
    this.contentParser = new ContentParser(enableClean);
  }
}
```

**No persistent state** - parser is stateless transformer.

---

## External Interfaces

### ContentParser

#### Primary Method

```typescript
parseContent(html: string): {
  markdown: string;   // Converted Markdown
  cleanHtml: string;  // Cleaned HTML (if enabled)
}
```

**Usage**:
```typescript
const parser = new ContentParser(true);
const article = {
  content_html: '<h1>Title</h1><p>Paragraph</p>'
};

const { markdown, cleanHtml } = parser.parseContent(article.content_html);
// markdown: "# Title\n\nParagraph\n\n"
```

---

#### Utility Methods

```typescript
// Extract all images from HTML
extractImages(html: string): Array<{
  src: string;
  alt: string;
}>

// Extract all links
extractLinks(html: string): Array<{
  href: string;
  text: string;
}>

// Get text excerpt (first N chars)
getExcerpt(html: string, maxLength?: number): string

// Update clean HTML setting
setEnableCleanHtml(enable: boolean): void
```

---

### FeedGenerator (Future)

**Planned Features**:
- Generate RSS 2.0 feed XML
- Generate Atom feed XML
- Export OPML

**Not yet implemented** - placeholder for future RSS export feature.

---

## Key Dependencies and Configuration

### Dependencies

- **Native DOMParser**: Browser API for HTML parsing
  - Available in Electron (Obsidian's runtime)
  - No external dependencies needed

- **html-parser lib**: Wrapper around DOMParser
  - Location: `src/lib/html-parser.ts`
  - Functions: `parseHtml()`, `removeElements()`, `queryAll()`

### Configuration

From plugin settings:
- `enableCleanHtml` (boolean): Strip scripts/styles/inline CSS

---

## Data Models

### Conversion Rules

**HTML → Markdown Mapping**:

| HTML Tag | Markdown Output | Notes |
|----------|----------------|-------|
| `<h1>` | `# Text` | Six levels supported |
| `<p>` | `Text\n\n` | Double newline |
| `<strong>`, `<b>` | `**Text**` | Bold |
| `<em>`, `<i>` | `*Text*` | Italic |
| `<code>` | `` `Text` `` | Inline code |
| `<pre>` | ` ```\nText\n``` ` | Code block |
| `<blockquote>` | `> Text` | Quote |
| `<ul><li>` | `- Item` | Unordered list |
| `<ol><li>` | `1. Item` | Ordered list |
| `<a href="url">` | `[Text](url)` | Link |
| `<img src="url">` | `![alt](url)` | Image |
| `<table>` | Markdown table | With header separator |

**Unsupported Tags**: Rendered as plain text (no special formatting)

---

### HTML Cleaning

When `enableCleanHtml: true`:

**Removed Elements**:
- `<script>` tags
- `<style>` tags
- HTML comments
- Empty `<p>` tags

**Removed Attributes**:
- `style` (inline CSS)

**Preserved**:
- `src`, `href`, `alt` (functional attributes)
- Semantic HTML structure

---

## Testing and Quality

### Test Coverage

**98% coverage** for ContentParser

**Test File**: `src/__tests__/unit/services/ContentParser.test.ts` (32 tests)

### Test Categories

1. **Basic Conversion** (8 tests)
   - Headings, paragraphs, line breaks
   - Bold, italic, inline code

2. **Lists** (4 tests)
   - Unordered lists
   - Ordered lists
   - Nested lists

3. **Links & Images** (6 tests)
   - Anchor tags
   - Image tags with alt text
   - Missing href/src handling

4. **Tables** (3 tests)
   - Simple tables
   - Multi-row tables
   - Header row detection

5. **HTML Cleaning** (5 tests)
   - Script removal
   - Style removal
   - Comment removal
   - Empty paragraph removal

6. **Utilities** (6 tests)
   - Image extraction
   - Link extraction
   - Excerpt generation

### Sample Test

```typescript
describe('ContentParser', () => {
  it('should convert heading tags to markdown', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2>';
    const parser = new ContentParser();

    const { markdown } = parser.parseContent(html);

    expect(markdown).toContain('# Title');
    expect(markdown).toContain('## Subtitle');
  });
});
```

---

## Frequently Asked Questions (FAQ)

### Q: Why not use turndown library?

**Reasons for custom implementation**:
1. **Bundle size**: turndown + dependencies ~50KB
2. **Control**: Custom rules for WeChat HTML quirks
3. **Performance**: Native DOM parsing faster
4. **Zero dependencies**: Simpler build pipeline

**Tradeoff**: Less comprehensive than turndown (but sufficient for WeChat articles)

### Q: How do I handle custom HTML elements?

**Extend `nodeToMarkdown()` method**:
```typescript
// In ContentParser.ts
private nodeToMarkdown(node: Node): string {
  // ... existing code ...

  switch (tagName) {
    // Add new case
    case 'custom-element':
      return `**${children}**`; // Custom rendering
    default:
      return children;
  }
}
```

### Q: What about embedded videos?

**Current Behavior**: Video tags rendered as plain text

**Future Enhancement**:
```typescript
case 'video':
  const src = element.getAttribute('src');
  return `![Video](${src})`;
```

Or use Obsidian's embed syntax: `![[video.mp4]]`

### Q: How do I preserve HTML for certain elements?

**Disable cleaning for specific content**:
```typescript
const parser = new ContentParser(false); // Disable cleaning
const { cleanHtml } = parser.parseContent(html);
// cleanHtml === html (unchanged)
```

### Q: Can I customize Markdown output style?

**Yes**, modify conversion rules:

Example - Change bold syntax:
```typescript
// Instead of **text**
case 'strong':
case 'b':
  return `__${children}__`; // Use underscores
```

---

## Related File List

### Core Files
- `src/services/feed/ContentParser.ts` (262 lines)
- `src/services/feed/FeedGenerator.ts` (placeholder, ~50 lines)
- `src/services/feed/index.ts` (exports)

### Dependencies
- `src/lib/html-parser.ts` - DOM parsing utilities

### Test Files
- `src/__tests__/unit/services/ContentParser.test.ts` (32 tests)
- `src/__tests__/fixtures/sample-html.ts` - Test HTML snippets

### Usage
- `src/services/FeedService.ts` - Article content parsing
- `src/services/NoteCreator.ts` - Note generation

---

**Last Updated**: 2025-11-16 21:32:07
