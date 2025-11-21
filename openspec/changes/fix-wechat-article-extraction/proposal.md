# Fix WeChat Article Content Extraction

## Problem Statement

The plugin fails to extract actual article content from WeChat public account articles. Instead of clean markdown content, notes contain raw JavaScript code and HTML escape sequences.

### Current Behavior

When scraping WeChat articles (e.g., from `硕博留学情报官`), the generated markdown files contain:

```markdown
var biz = "MzkxMDM4ODgxMQ==" || "";
var sn = "fabe4aceca43ff45539237d2d46900b7" || "" || "";
...
content_noencode: JsDecode('\x3csection\x3e\x3cspan style=\x22...\x22\x3e导师简介：\x3c/span\x3e...')
```

**Expected**: Clean markdown with actual article text:
```markdown
导师简介：
李昱亨，博士生导师...
```

### Root Cause

The `fetchArticleContent()` method returns the **entire WeChat HTML page** (including JavaScript), but the actual article HTML is embedded inside a JavaScript variable called `content_noencode` with escape sequences:

- `\x3c` → `<`
- `\x3e` → `>`
- `\x22` → `"`
- `\x27` → `'`
- `\x26` → `&`
- `\x0a` → newline
- `\x0d` → carriage return
- `\x5c` → `\`

The ContentParser tries to parse the raw page HTML directly, missing the actual content.

### Impact

- ❌ Users cannot read article content in Obsidian
- ❌ Notes are filled with useless JavaScript code
- ❌ Search/indexing doesn't work (searching actual content terms finds nothing)
- ❌ AI summarization fails (gets JavaScript instead of article text)

## Proposed Solution

**Add content extraction step before HTML-to-Markdown conversion.**

### Approach: Regex-Based Extraction + Decoding

1. **Extract** `content_noencode` value from JavaScript code using regex
2. **Decode** hex escape sequences (`\xNN`)
3. **Pass** decoded HTML to existing ContentParser
4. **Fallback** to full page HTML if extraction fails

### Implementation Strategy

**New Method** in ContentParser:
```typescript
extractWeChatContent(rawHtml: string): string {
  // 1. Try to extract content_noencode value
  const match = rawHtml.match(/content_noencode:\s*JsDecode\('([^']+)'\)/);

  if (match) {
    // 2. Decode escape sequences
    const escaped = match[1];
    const decoded = this.decodeJsEscapes(escaped);
    return decoded;
  }

  // 3. Fallback to original HTML
  return rawHtml;
}

private decodeJsEscapes(str: string): string {
  return str
    .replace(/\\x5c/g, '\\')
    .replace(/\\x0d/g, '\r')
    .replace(/\\x22/g, '"')
    .replace(/\\x26/g, '&')
    .replace(/\\x27/g, "'")
    .replace(/\\x3c/g, '<')
    .replace(/\\x3e/g, '>')
    .replace(/\\x0a/g, '\n');
}
```

**Update** `parseContent()` method:
```typescript
parseContent(html: string): { markdown: string; cleanHtml: string } {
  // NEW: Extract actual content first
  const extractedHtml = this.extractWeChatContent(html);

  // Existing logic
  const cleanHtml = this.enableCleanHtml ? this.cleanHtml(extractedHtml) : extractedHtml;
  const markdown = this.htmlToMarkdown(cleanHtml);

  return { markdown, cleanHtml };
}
```

### Alternative Approaches Considered

**Alternative 1**: Parse JavaScript AST to extract variable
- **Pros**: More robust, handles complex cases
- **Cons**: Heavy dependency (acorn/esprima), overkill for simple extraction
- **Rejected**: Regex sufficient for this specific pattern

**Alternative 2**: Use headless browser to execute JavaScript
- **Pros**: Gets actual rendered content
- **Cons**: Requires Playwright/Puppeteer, very slow, complex setup
- **Rejected**: Too heavy for plugin environment

**Alternative 3**: Request different API endpoint for clean content
- **Pros**: Server-side extraction
- **Cons**: Requires WeWe RSS API changes, outside our control
- **Rejected**: We need client-side solution

**Selected**: Regex + manual decoding - Simple, fast, no dependencies

## Success Criteria

1. ✅ Extracted content shows actual article text (Chinese characters)
2. ✅ JavaScript code is NOT present in final markdown
3. ✅ Images and formatting are preserved
4. ✅ Fallback works if extraction fails (doesn't break existing articles)
5. ✅ No new dependencies added
6. ✅ Performance: Extraction adds <10ms per article

## Dependencies

- No external dependencies
- Only internal changes to ContentParser

## Timeline

- **Estimated effort**: 45-60 minutes
- **Complexity**: Low
- **Testing**: Manual (check existing scraped articles)
- **Risk**: Low (fallback prevents breaking existing functionality)

## Testing Plan

### Test Cases

1. **WeChat article with content_noencode**:
   - Input: Raw HTML page with JavaScript
   - Expected: Clean markdown with Chinese text

2. **Normal HTML article** (no JavaScript):
   - Input: Plain HTML
   - Expected: Markdown conversion works as before

3. **Malformed content_noencode**:
   - Input: Broken JavaScript code
   - Expected: Falls back to full page HTML

4. **Empty content_noencode**:
   - Input: `content_noencode: JsDecode('')`
   - Expected: Returns empty string (gracefully)

### Manual Testing

1. Delete existing notes from `硕博留学情报官`
2. Re-sync feed to regenerate notes
3. Open notes and verify:
   - Chinese text is visible
   - No JavaScript code
   - Images render
   - Formatting looks good
