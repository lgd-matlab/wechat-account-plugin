# Fix AI Summary Filesystem Fallback

## Problem Statement

The AI summarization feature fails to find articles to summarize, returning "Found 0 articles from yesterday" even when articles exist as Markdown notes in the vault filesystem. The current implementation only queries the SQLite database, which may be empty or not synchronized with the actual note files.

### Current Behavior

When users trigger daily AI summarization:

```
[SummaryService] Starting daily summary generation
[SummaryService] Found 0 articles from yesterday
[SummaryService] No articles to summarize
```

**However**: Users have articles stored in the vault at:
- Path: `WeWe RSS/{MP Account Name}/{Article Title}.md`
- Format: Markdown files with frontmatter containing publication date
- Example structure:
  ```markdown
  ---
  title: 炼金术士的秘密武器：为什么说 Matter...
  published: November 19
  feed: 程序那些事儿
  ---

  # Article content...
  ```

### Root Cause

The `SummaryService.getYesterdayArticles()` method (line 111-136) exclusively queries the SQLite database:

```typescript
private getYesterdayArticles(): SummaryArticle[] {
  const { start, end } = this.getYesterdayDateRange();

  // ONLY queries database - ignores filesystem
  const articles = this.db.articles.findByDateRange(start, end);

  // Filters only synced articles
  const syncedArticles = articles.filter(a => a.synced);

  // ... enrich with feed names
}
```

**Problem**: If articles are downloaded directly to filesystem (bypassing database), or if database gets corrupted/cleared, AI summarization breaks completely.

### Impact

- ❌ **Feature Completely Broken**: AI summarization returns 0 articles even when notes exist
- ❌ **User Confusion**: Users see articles in their vault but can't summarize them
- ❌ **Data Loss Vulnerability**: Database corruption means losing summarization capability
- ❌ **Sync Dependency**: Requires `synced=true` in database, fragile assumption

## Proposed Solution

**Add filesystem fallback to AI summarization with intelligent date parsing.**

### Approach: Two-Phase Article Discovery

1. **Phase 1: Database Query** (existing behavior)
   - Query SQLite for articles with `published_at` in yesterday's range
   - Fast and efficient when database is populated

2. **Phase 2: Filesystem Fallback** (new)
   - If database returns 0 articles, scan vault filesystem
   - Parse frontmatter to extract publication dates
   - Filter articles published yesterday
   - Use file content directly for summarization

### Implementation Strategy

#### New Method: `getYesterdayArticlesFromFilesystem()`

```typescript
private async getYesterdayArticlesFromFilesystem(): Promise<SummaryArticle[]> {
  const noteFolder = this.settings.noteLocation; // "WeWe RSS"
  const folder = this.app.vault.getAbstractFileByPath(noteFolder);

  if (!folder || !(folder instanceof TFolder)) {
    return [];
  }

  const articles: SummaryArticle[] = [];
  const { start, end } = this.getYesterdayDateRange();

  // Recursively scan all markdown files
  for (const file of this.getAllMarkdownFiles(folder)) {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;

    if (!frontmatter) continue;

    // Parse publication date from frontmatter
    const publishedAt = this.parsePublishedDate(frontmatter.published);

    if (publishedAt >= start && publishedAt < end) {
      const content = await this.app.vault.read(file);
      const feedName = frontmatter.feed || this.extractFeedFromPath(file.path);

      articles.push({
        id: 0, // Filesystem-based, no DB ID
        title: frontmatter.title || file.basename,
        content: this.stripFrontmatter(content),
        url: frontmatter.url || '',
        publishedAt,
        feedName,
        noteId: file.path
      });
    }
  }

  return articles;
}
```

#### Updated Main Method

```typescript
private async getYesterdayArticles(): Promise<SummaryArticle[]> {
  // Phase 1: Try database first
  const { start, end } = this.getYesterdayDateRange();
  const articlesFromDb = this.db.articles.findByDateRange(start, end);
  const syncedArticles = articlesFromDb.filter(a => a.synced);

  if (syncedArticles.length > 0) {
    this.logger.info(`Found ${syncedArticles.length} articles from database`);
    return this.enrichWithFeedNames(syncedArticles);
  }

  // Phase 2: Fallback to filesystem
  this.logger.info('No articles in database, scanning filesystem...');
  const articlesFromFs = await this.getYesterdayArticlesFromFilesystem();
  this.logger.info(`Found ${articlesFromFs.length} articles from filesystem`);

  return articlesFromFs;
}
```

### Date Parsing Strategy

**Supported Formats**:
- `"November 19"` → Parse with current year
- `"2024-11-19"` → ISO format
- `"11/19/2024"` → US format
- Unix timestamp (number)

**Fallback**: Use file creation/modification time if frontmatter date is invalid

### Benefits

✅ **Robustness**: Works even if database is empty/corrupted
✅ **User Expectation**: Summarizes articles that users can see in vault
✅ **No Breaking Changes**: Database path still preferred (performance)
✅ **Graceful Degradation**: Automatic fallback without user intervention

## Alternatives Considered

### Alternative 1: Always Scan Filesystem
**Pros**: Simple, always accurate
**Cons**: Slow for large vaults, unnecessary when database works

### Alternative 2: Require Database Rebuild
**Pros**: Keeps single source of truth
**Cons**: User friction, doesn't solve root cause

### Alternative 3: Hybrid Approach (REJECTED - too complex)
**Pros**: Merges both sources
**Cons**: Complex deduplication, unclear which source wins

**Decision**: Chosen fallback approach balances reliability with performance.

## Dependencies

- ✅ Requires Obsidian Vault API (`TFolder`, `TFile`, `MetadataCache`)
- ✅ No new external dependencies
- ⚠️ Performance concern: Filesystem scan on large vaults (mitigated by database-first approach)

## Testing Strategy

### Unit Tests
1. Test `parsePublishedDate()` with various formats
2. Test `stripFrontmatter()` content extraction
3. Test `extractFeedFromPath()` folder name parsing
4. Test date range filtering logic

### Integration Tests
1. Mock vault with sample markdown files
2. Test filesystem fallback when database is empty
3. Test database-first path when articles exist
4. Test mixed scenarios (some in DB, some only in filesystem)

### Manual Testing
1. Clear database, verify fallback works
2. Test with user's actual vault structure
3. Verify performance on large vaults (100+ articles)

## Migration Path

**No migration needed** - this is a pure enhancement with backward compatibility.

**User Communication**: Add to release notes:
> AI summarization now includes filesystem fallback, ensuring articles are found even if database is missing or out-of-sync.

## Related Issues

- Related to database sync issues (articles not marked as synced)
- Complements database health monitoring (DatabaseHealthService)
- Aligns with user expectation that filesystem is source of truth

## Success Criteria

- [ ] AI summarization successfully processes articles from filesystem when database is empty
- [ ] Database-first path still prioritized for performance
- [ ] Date parsing handles common frontmatter formats
- [ ] All tests pass with >90% coverage
- [ ] No performance regression on typical vaults (<500 articles)
- [ ] User feedback confirms feature works as expected
