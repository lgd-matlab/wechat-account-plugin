# Tasks: Fix WeChat Article Content Extraction

## Task Breakdown

### 1. Add JavaScript Escape Decoder Method
**File**: `src/services/feed/ContentParser.ts`
**Estimated Time**: 10 minutes

- [ ] Add `decodeJsEscapes(str: string): string` private method
- [ ] Implement replacements for all escape sequences:
  - `\x5c` → `\`
  - `\x0d` → `\r`
  - `\x22` → `"`
  - `\x26` → `&`
  - `\x27` → `'`
  - `\x3c` → `<`
  - `\x3e` → `>`
  - `\x0a` → `\n`
- [ ] Add JSDoc comment explaining WeChat's escape format

**Validation**:
```typescript
const input = "\\x3cspan\\x3eHello\\x3c/span\\x3e";
const output = decodeJsEscapes(input);
expect(output).toBe("<span>Hello</span>");
```

---

### 2. Add Content Extraction Method
**File**: `src/services/feed/ContentParser.ts`
**Estimated Time**: 15 minutes

- [ ] Add `extractWeChatContent(rawHtml: string): string` private method
- [ ] Implement regex to extract `content_noencode` value:
  ```typescript
  const match = rawHtml.match(/content_noencode:\s*JsDecode\('([^']+)'\)/);
  ```
- [ ] Handle match success: decode and return
- [ ] Handle match failure: return original HTML (fallback)
- [ ] Add logging for debugging

**Validation**:
- Test with actual WeChat HTML page
- Test with normal HTML (no JavaScript)
- Test with malformed JavaScript

---

### 3. Integrate Extraction into parseContent
**File**: `src/services/feed/ContentParser.ts`
**Estimated Time**: 5 minutes

- [ ] Update `parseContent()` method
- [ ] Call `extractWeChatContent()` BEFORE cleaning/conversion
- [ ] Ensure existing logic flow is preserved
- [ ] Update method JSDoc

**Before**:
```typescript
parseContent(html: string) {
  const cleanHtml = this.cleanHtml(html);
  const markdown = this.htmlToMarkdown(cleanHtml);
  return { markdown, cleanHtml };
}
```

**After**:
```typescript
parseContent(html: string) {
  const extracted = this.extractWeChatContent(html);
  const cleanHtml = this.cleanHtml(extracted);
  const markdown = this.htmlToMarkdown(cleanHtml);
  return { markdown, cleanHtml };
}
```

**Validation**:
- Existing unit tests should still pass
- New WeChat content extraction works

---

### 4. Add Unit Tests
**File**: `src/__tests__/unit/services/ContentParser.test.ts`
**Estimated Time**: 20 minutes

- [ ] Add test suite: `describe('WeChat content extraction')`
- [ ] Test successful extraction:
  ```typescript
  it('should extract content_noencode from WeChat HTML')
  ```
- [ ] Test escape sequence decoding:
  ```typescript
  it('should decode JavaScript escape sequences')
  ```
- [ ] Test fallback behavior:
  ```typescript
  it('should fallback to full HTML if extraction fails')
  ```
- [ ] Test with actual WeChat HTML snippet (from fixtures)

**Validation**:
- All new tests pass
- Existing 32 tests still pass
- Coverage remains >95%

---

### 5. Add WeChat HTML Fixture
**File**: `src/__tests__/fixtures/sample-html.ts`
**Estimated Time**: 5 minutes

- [ ] Add `sampleWeChatPageHtml` constant
- [ ] Include realistic JavaScript structure
- [ ] Include `content_noencode` with escape sequences
- [ ] Export for use in tests

**Example**:
```typescript
export const sampleWeChatPageHtml = `
<html>
<body>
<script>
window.cgiDataNew = {
  content_noencode: JsDecode('\\x3ch1\\x3e标题\\x3c/h1\\x3e\\x3cp\\x3e内容\\x3c/p\\x3e')
};
</script>
</body>
</html>
`;
```

**Validation**:
- Fixture matches actual WeChat HTML structure
- Can be imported in tests

---

### 6. Manual Testing with Real Articles
**Estimated Time**: 15 minutes

Test scenarios:
- [ ] Test with article from `硕博留学情报官`
- [ ] Delete existing note
- [ ] Trigger re-sync for that feed
- [ ] Verify note content:
  - Chinese text is readable
  - No JavaScript code visible
  - Images display correctly
  - Formatting looks good
- [ ] Test with article from different MP account
- [ ] Verify old articles (without JavaScript) still work

**Success Criteria**:
- New notes show clean content
- No regression in existing articles
- No console errors

---

### 7. Build and Deploy
**Estimated Time**: 5 minutes

- [ ] Run `npm run build`
- [ ] Verify no TypeScript errors
- [ ] Copy `main.js` to test vault
- [ ] Reload Obsidian plugin
- [ ] Confirm everything works

**Validation**:
- Build succeeds
- Plugin loads without errors
- Manual tests pass

---

### 8. Update Documentation (Optional)
**File**: `src/services/feed/CLAUDE.md`
**Estimated Time**: 5 minutes

- [ ] Add section on WeChat content extraction
- [ ] Document the escape sequence format
- [ ] Explain extraction strategy
- [ ] Note fallback behavior

**Validation**:
- Documentation is clear and accurate

---

## Total Estimated Time: 80 minutes (~1.5 hours)

## Dependencies
- Task 2 depends on Task 1 (decoder method used by extractor)
- Task 3 depends on Task 2 (extraction method integrated)
- Task 4 depends on Task 5 (needs fixture)
- Task 6 depends on Tasks 1-3 (needs implementation complete)
- Task 7 depends on all code tasks (1-4)

## Parallel Work Opportunities
- Task 5 (fixture) can be done in parallel with Task 1-2
- Task 8 (docs) can be done in parallel with Task 6-7

## Risk Level: Low
- Changes isolated to ContentParser
- Fallback prevents breaking existing functionality
- No database changes
- No external dependencies
- Easy to revert if issues arise
