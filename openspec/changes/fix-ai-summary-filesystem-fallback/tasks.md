# Tasks: Fix AI Summary Filesystem Fallback

## Overview
Implement filesystem fallback for AI summarization to handle cases where database is empty or out-of-sync with vault notes.

**Estimated Effort**: 8-12 hours
**Dependencies**: None (pure enhancement)
**Validation**: Unit tests + integration tests + manual testing

---

## Task Breakdown

### 1. Add Date Parsing Utility Methods
**Estimated Time**: 1-2 hours
**Priority**: High (foundation for other tasks)

**Subtasks**:
- [ ] Create `parsePublishedDate(dateString: string | number): number` method
  - Support format: "November 19" → infer current year
  - Support format: "2024-11-19" → parse ISO date
  - Support format: "11/19/2024" → parse US format
  - Support format: Unix timestamp (number) → pass through
  - Return 0 for invalid dates (caller handles fallback)

- [ ] Write unit tests for `parsePublishedDate()`
  - Test each date format
  - Test invalid inputs (return 0)
  - Test edge cases (leap years, timezone handling)

**Validation**:
```bash
npm test -- SummaryService.test.ts -t "parsePublishedDate"
```

**Expected Output**: 8-10 passing tests

---

### 2. Add Content Extraction Utility Methods
**Estimated Time**: 1 hour
**Priority**: High

**Subtasks**:
- [ ] Create `stripFrontmatter(content: string): string` method
  - Use regex: `/^---\n[\s\S]*?\n---\n/`
  - Return original content if no frontmatter

- [ ] Create `extractFeedFromPath(filePath: string): string` method
  - Extract parent folder name from path
  - Return "Unknown Feed" if path is invalid
  - Handle Windows/Unix path separators

- [ ] Write unit tests for content extraction
  - Test frontmatter stripping
  - Test path parsing with various structures

**Validation**:
```bash
npm test -- SummaryService.test.ts -t "stripFrontmatter|extractFeedFromPath"
```

---

### 3. Implement Filesystem Scanning Logic
**Estimated Time**: 3-4 hours
**Priority**: High

**Subtasks**:
- [ ] Create `getAllMarkdownFiles(folder: TFolder): TFile[]` recursive helper
  - Traverse folder tree recursively
  - Filter only `.md` files
  - Return flat array of TFile objects

- [ ] Implement `getYesterdayArticlesFromFilesystem(): Promise<SummaryArticle[]>`
  - Get folder from `settings.noteLocation`
  - Call `getAllMarkdownFiles()` to get file list
  - For each file:
    1. Read metadata cache for frontmatter
    2. Parse `published` date with `parsePublishedDate()`
    3. Fallback to file.stat.mtime if date invalid
    4. Filter articles in yesterday's date range
    5. Read file content with `vault.read()`
    6. Strip frontmatter from content
    7. Extract feed name from path
    8. Build `SummaryArticle` object
  - Return filtered articles array
  - Add logging at each stage

- [ ] Handle edge cases:
  - Folder doesn't exist → return empty array
  - File read error → log and skip file
  - Invalid frontmatter → log and use fallback dates

**Validation**: Manual testing + integration tests

---

### 4. Update Main Article Discovery Method
**Estimated Time**: 1 hour
**Priority**: High

**Subtasks**:
- [ ] Modify `getYesterdayArticles()` to be async
  - Change signature: `async getYesterdayArticles(): Promise<SummaryArticle[]>`
  - Keep existing database query logic
  - Add conditional filesystem fallback:
    ```typescript
    if (syncedArticles.length > 0) {
      this.logger.info(`Found ${syncedArticles.length} articles from database`);
      return this.enrichWithFeedNames(syncedArticles);
    }

    this.logger.info('No articles in database, scanning filesystem...');
    const articlesFromFs = await this.getYesterdayArticlesFromFilesystem();
    this.logger.info(`Found ${articlesFromFs.length} articles from filesystem`);
    return articlesFromFs;
    ```

- [ ] Update `generateDailySummary()` to await `getYesterdayArticles()`

- [ ] Update existing helper method signatures if needed

**Validation**: Compilation check (`npm run build`)

---

### 5. Write Comprehensive Tests
**Estimated Time**: 2-3 hours
**Priority**: High

**Subtasks**:
- [ ] Mock Obsidian Vault API for testing:
  - Mock `vault.getAbstractFileByPath()`
  - Mock `vault.read()`
  - Mock `metadataCache.getFileCache()`
  - Create mock TFile/TFolder objects

- [ ] Unit tests for filesystem fallback:
  - Test `getYesterdayArticlesFromFilesystem()` with mock files
  - Test date filtering logic
  - Test content extraction
  - Test error handling (missing folder, read errors)

- [ ] Integration tests:
  - Test full flow: database empty → filesystem fallback
  - Test database-first path (no filesystem call)
  - Test mixed scenarios

- [ ] Edge case tests:
  - Empty vault folder
  - Files with no frontmatter
  - Files with invalid dates
  - Large vault performance (benchmark)

**Validation**:
```bash
npm test -- SummaryService.test.ts
npm run test:coverage
```

**Target Coverage**: >90% for new methods

---

### 6. Add Logging and Observability
**Estimated Time**: 30 minutes
**Priority**: Medium

**Subtasks**:
- [ ] Add structured logging:
  - Log database query results
  - Log filesystem scan start/end
  - Log number of files scanned
  - Log articles found at each stage
  - Log performance metrics (time taken)

- [ ] Add debug logs for troubleshooting:
  - Log file paths being scanned
  - Log date parsing results
  - Log frontmatter values

**Example**:
```typescript
this.logger.info('Article discovery', {
  source: 'filesystem',
  filesScanned: totalFiles,
  articlesFound: articles.length,
  durationMs: Date.now() - startTime
});
```

---

### 7. Manual Testing and Validation
**Estimated Time**: 1-2 hours
**Priority**: High

**Test Scenarios**:
- [ ] **Scenario 1: Empty Database**
  1. Clear SQLite database (delete wewe-rss.db)
  2. Ensure vault has articles from yesterday
  3. Trigger AI summary
  4. Verify: Articles found from filesystem
  5. Verify: Summary generated successfully

- [ ] **Scenario 2: Database Populated**
  1. Ensure database has articles with synced=true
  2. Trigger AI summary
  3. Verify: Articles found from database
  4. Verify: Filesystem scan NOT triggered (check logs)

- [ ] **Scenario 3: Date Parsing**
  1. Create test notes with different date formats
  2. Trigger AI summary
  3. Verify: All date formats parsed correctly

- [ ] **Scenario 4: Performance**
  1. Test with vault containing 100+ articles
  2. Measure time taken for filesystem scan
  3. Verify: Completes in <5 seconds

- [ ] **Scenario 5: Error Handling**
  1. Configure invalid `noteLocation` path
  2. Trigger AI summary
  3. Verify: Graceful failure with helpful error message

**Documentation**: Record test results and any issues found

---

### 8. Update Documentation
**Estimated Time**: 30 minutes
**Priority**: Low

**Subtasks**:
- [ ] Update `src/services/CLAUDE.md`:
  - Document new filesystem fallback behavior
  - Add usage examples
  - Note performance characteristics

- [ ] Update `CLAUDE.md` (root):
  - Add to changelog
  - Update AI usage guidelines if needed

- [ ] Update user-facing docs (if applicable):
  - Explain fallback behavior
  - Note that filesystem is now scanned when database is empty

---

## Parallelizable Work

Tasks 1 and 2 can be done in parallel (utility methods independent).

---

## Testing Checkpoints

**After Task 2**: Run unit tests for utility methods
```bash
npm test -- SummaryService.test.ts -t "parsePublishedDate|stripFrontmatter"
```

**After Task 4**: Run full build and type check
```bash
npm run build
```

**After Task 5**: Run full test suite
```bash
npm test
npm run test:coverage
```

**After Task 7**: Perform manual testing in Obsidian

---

## Definition of Done

- [ ] All unit tests pass (>90% coverage for new code)
- [ ] Integration tests pass
- [ ] Manual testing completed successfully
- [ ] No TypeScript errors (`npm run build` succeeds)
- [ ] Logging provides clear visibility into fallback behavior
- [ ] Performance meets targets (<5s for 500 files)
- [ ] Documentation updated
- [ ] Code review completed
- [ ] User feedback confirms feature works

---

## Rollback Plan

**If Issues Arise**:
1. Filesystem fallback is pure addition - can be disabled with feature flag
2. Database-first path unchanged - no risk to existing functionality
3. Worst case: Comment out filesystem fallback, release hotfix

**Feature Flag** (optional):
```typescript
if (this.settings.enableFilesystemFallback !== false) {
  // New logic
}
```

---

## Post-Deployment Monitoring

**Metrics to Track**:
- Number of users hitting filesystem fallback path (via telemetry if available)
- Performance metrics for filesystem scans
- Error rates for date parsing failures
- User reports of summarization success rate improvement

**Success Indicators**:
- Zero reports of "Found 0 articles" when articles exist in vault
- No performance regressions
- Positive user feedback on summarization reliability
