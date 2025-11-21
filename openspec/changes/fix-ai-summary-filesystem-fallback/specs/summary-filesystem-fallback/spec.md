# AI Summary Filesystem Fallback Specification

## ADDED Requirements

### Requirement: Filesystem-Based Article Discovery
**Priority**: High
**Rationale**: Ensure AI summarization works when database is empty, corrupted, or out-of-sync with actual vault notes.

The SummaryService MUST support discovering articles from the vault filesystem when database queries return no results.

#### Scenario: Database empty but filesystem has articles

**Given**:
- User has Markdown notes in `WeWe RSS/{FeedName}/` folder
- Notes have frontmatter with `published` field
- Database `articles` table is empty or has 0 results for date range

**When**:
- User triggers `generateDailySummary()`
- Database query returns 0 articles

**Then**:
- System logs: "No articles in database, scanning filesystem..."
- System recursively scans `settings.noteLocation` folder
- System reads frontmatter from all `.md` files
- System filters articles published yesterday
- System returns articles for AI summarization

**Validation**:
```typescript
// Pseudo-test
const result = await summaryService.generateDailySummary();
expect(result.totalArticles).toBeGreaterThan(0);
expect(result.summaries.length).toBeGreaterThan(0);
```

---

#### Scenario: Database has articles - filesystem fallback skipped

**Given**:
- Database contains 5 articles published yesterday with `synced=true`
- Filesystem also has notes for these articles

**When**:
- User triggers `generateDailySummary()`
- Database query returns 5 articles

**Then**:
- System logs: "Found 5 articles from database"
- System does NOT scan filesystem (performance optimization)
- System uses database results for summarization

**Validation**:
- Verify `getYesterdayArticlesFromFilesystem()` is NOT called
- Verify log output confirms database source

---

#### Scenario: Mixed content types in folder

**Given**:
- Folder contains:
  - 3 markdown files published yesterday
  - 2 markdown files published last week
  - 1 PDF file
  - 1 subfolder with more notes

**When**:
- Filesystem fallback scans folder

**Then**:
- System includes only 3 markdown files from yesterday
- System ignores PDF files
- System recursively scans subfolder

---

### Requirement: Date Parsing from Frontmatter
**Priority**: High
**Rationale**: Support common date formats users might use in frontmatter.

The SummaryService MUST parse publication dates from note frontmatter in multiple formats.

#### Scenario: Parse human-readable date format

**Given**:
- Note frontmatter contains:
  ```yaml
  published: November 19
  ```

**When**:
- System parses `published` field

**Then**:
- System infers current year (e.g., 2024)
- System converts to Unix timestamp: `Date.parse("November 19, 2024")`
- System correctly filters article into yesterday's range

**Validation**:
```typescript
const timestamp = parsePublishedDate("November 19");
expect(timestamp).toBeGreaterThan(0);
expect(new Date(timestamp).getMonth()).toBe(10); // November = 10
```

---

#### Scenario: Parse ISO date format

**Given**:
- Note frontmatter contains:
  ```yaml
  published: 2024-11-19
  ```

**When**:
- System parses `published` field

**Then**:
- System converts to Unix timestamp
- System correctly identifies as November 19, 2024

---

#### Scenario: Fallback to file modification time

**Given**:
- Note frontmatter has invalid `published` field: `published: "sometime yesterday"`

**When**:
- System cannot parse date

**Then**:
- System logs warning: "Invalid published date, using file mtime"
- System uses `file.stat.mtime` as publication timestamp
- System continues processing without error

---

#### Scenario: Handle missing published field

**Given**:
- Note frontmatter exists but has no `published` field

**When**:
- System attempts to read `published`

**Then**:
- System falls back to file modification time
- System logs: "No published date found, using file mtime"

---

### Requirement: Content Extraction from Markdown Files
**Priority**: High
**Rationale**: Extract article content without frontmatter for AI summarization.

The SummaryService MUST strip frontmatter and extract clean content from markdown files.

#### Scenario: Strip frontmatter from content

**Given**:
- Markdown file content:
  ```markdown
  ---
  title: Test Article
  published: November 19
  ---

  # Article Title

  This is the article content.
  ```

**When**:
- System calls `stripFrontmatter(content)`

**Then**:
- System returns:
  ```markdown
  # Article Title

  This is the article content.
  ```
- System removes YAML frontmatter block completely

**Validation**:
```typescript
const result = stripFrontmatter(content);
expect(result).not.toContain('---');
expect(result).toContain('# Article Title');
```

---

#### Scenario: Handle content without frontmatter

**Given**:
- Markdown file has no frontmatter:
  ```markdown
  # Just Content

  No frontmatter here.
  ```

**When**:
- System calls `stripFrontmatter(content)`

**Then**:
- System returns original content unchanged

---

### Requirement: Feed Name Extraction
**Priority**: Medium
**Rationale**: Display feed/source information in summary even without database.

The SummaryService MUST extract feed name from file path when not in database.

#### Scenario: Extract feed from nested folder path

**Given**:
- File path: `WeWe RSS/程序那些事儿/Article Title.md`

**When**:
- System calls `extractFeedFromPath(path)`

**Then**:
- System returns: `"程序那些事儿"`
- System uses immediate parent folder name

**Validation**:
```typescript
const feedName = extractFeedFromPath("WeWe RSS/程序那些事儿/Article.md");
expect(feedName).toBe("程序那些事儿");
```

---

#### Scenario: Handle root-level notes

**Given**:
- File path: `WeWe RSS/Article Title.md` (no subfolder)

**When**:
- System calls `extractFeedFromPath(path)`

**Then**:
- System returns: `"Unknown Feed"`
- System handles gracefully without error

---

### Requirement: Performance Optimization
**Priority**: Medium
**Rationale**: Avoid slow filesystem scans when database is populated.

The SummaryService MUST prioritize database queries over filesystem scans for performance.

#### Scenario: Skip filesystem scan when database has results

**Given**:
- Database query returns 10 articles
- Vault contains 1000 markdown files

**When**:
- System calls `getYesterdayArticles()`

**Then**:
- System does NOT scan filesystem
- System completes in <100ms (database query only)
- System logs: "Found 10 articles from database"

**Validation**:
- Performance benchmark: database path <100ms
- Verify filesystem methods not invoked

---

#### Scenario: Filesystem scan completes in reasonable time

**Given**:
- Database query returns 0 articles
- Vault contains 500 markdown files in `WeWe RSS/` folder

**When**:
- System scans filesystem

**Then**:
- System completes scan in <5 seconds
- System processes only files in `noteLocation` folder
- System logs progress: "Scanning filesystem... found N articles"

**Performance Target**: <5s for 500 files, <30s for 5000 files

---

## MODIFIED Requirements

### Requirement: AI Summary Generation
**Priority**: High
**Previous Behavior**: Only queried database
**New Behavior**: Queries database with filesystem fallback

The SummaryService MUST attempt filesystem fallback when database queries return no results, ensuring article discovery works even when database is empty or out-of-sync.

#### Scenario: Graceful fallback with logging

**Given**:
- Database query returns 0 articles
- Filesystem has 3 articles from yesterday

**When**:
- User triggers daily summary

**Then**:
- System logs:
  1. "Starting daily summary generation"
  2. "Found 0 articles from database"
  3. "No articles in database, scanning filesystem..."
  4. "Found 3 articles from filesystem"
  5. "Successfully summarized 3/3 articles"

**Validation**: Check log output for complete flow visibility

---

#### Scenario: Error handling in filesystem fallback

**Given**:
- Database query returns 0 articles
- Filesystem folder does not exist (misconfigured `noteLocation`)

**When**:
- System attempts filesystem fallback

**Then**:
- System logs: "Note folder not found: {path}"
- System returns empty result:
  ```typescript
  {
    date: "2024-11-21",
    summaries: [],
    totalArticles: 0,
    filePath: ""
  }
  ```
- System does NOT throw error

---

## REMOVED Requirements

None. This is a pure addition without removing existing functionality.

---

## Cross-References

- **Related to**: `DatabaseService` - database query methods
- **Related to**: `NoteCreator` - file path conventions
- **Related to**: `WeWeRssSettings` - `noteLocation` configuration
- **Depends on**: Obsidian Vault API (`TFolder`, `TFile`, `MetadataCache`)

---

## Non-Functional Requirements

### Logging
- MUST log when switching from database to filesystem fallback
- MUST log number of articles found from each source
- SHOULD log performance metrics for filesystem scan

### Error Handling
- MUST handle missing folders gracefully
- MUST handle invalid frontmatter without crashing
- SHOULD log warnings for unparseable dates

### Backward Compatibility
- MUST NOT break existing database-based summarization
- MUST NOT require settings migration
- SHOULD prefer database when both sources available
