# Cleanup Notes Deletion

## MODIFIED Requirements

### Requirement: Article Cleanup Deletes Both Database and Notes
When users trigger the "Clean Up Old Articles" feature, the system MUST delete both database records AND corresponding markdown note files from the Obsidian vault.

**Rationale**: Users expect cleanup to fully remove old articles, not leave orphaned note files in the vault. The current implementation has a bug where note deletion is not working correctly.

#### Scenario: Cleanup deletes database records and note files
**Given** the database contains 100 articles
**And** 40 of these articles have `noteId` set (notes were created)
**And** 30 of these 40 articles are older than the retention threshold
**When** the user runs "Clean Up Old Articles" with 30-day retention
**Then** the 30 old articles are deleted from the database
**And** the 30 corresponding markdown note files are deleted from the vault
**And** the sync result reports:
```javascript
{
  articlesDeleted: 30,
  notesDeleted: 30
}
```

#### Scenario: Cleanup handles missing note files gracefully
**Given** an article in the database has `noteId = "WeWe RSS/Article.md"`
**And** the note file no longer exists in the vault (manually deleted)
**When** cleanup runs
**Then** the article is deleted from the database
**And** the missing note file is skipped without error
**And** a warning is logged: "Note file not found: WeWe RSS/Article.md"
**And** the operation continues for remaining articles

#### Scenario: Cleanup handles articles without notes
**Given** an article in the database has `synced = false` (no note created)
**When** cleanup runs
**Then** the article is deleted from the database
**And** no note deletion is attempted
**And** `notesDeleted` count excludes this article

#### Scenario: Cleanup uses correct file deletion method
**Given** an article has `noteId = "WeWe RSS/2025-01-15/Article.md"`
**When** the cleanup deletes this note
**Then** it calls `this.plugin.app.vault.adapter.remove(noteId)`
**Or** `this.plugin.app.vault.delete(file)` if using TFile
**And** the file is moved to Obsidian's trash (if trash is enabled)
**Or** permanently deleted (if trash is disabled)

#### Scenario: Cleanup is atomic per article
**Given** cleanup is processing 50 articles
**And** article #25 has a note deletion error
**When** the error occurs
**Then** articles 1-24 are fully deleted (database + notes)
**And** article #25 database record is deleted
**And** article #25 note deletion failure is logged
**And** articles 26-50 continue processing
**And** the final result includes partial `notesDeleted` count

### Requirement: Cleanup Modal Indicates Note Deletion
The cleanup modal UI MUST clearly communicate that both database records and note files will be deleted.

**Rationale**: Users need to understand the full impact before confirming cleanup. Current description says "Note files in your vault will be preserved" which is incorrect.

#### Scenario: Modal description warns about note deletion
**Given** the user clicks "Clean Up Old Articles" in settings
**When** the CleanupArticlesModal opens
**Then** the description reads:
```
Delete articles older than a specified number of days from both
the database and your Obsidian vault.

⚠️ Warning: This will permanently delete the corresponding markdown
note files from your vault. Consider backing up important notes first.
```
**And** the warning is styled with a warning color

#### Scenario: Preview shows both counts
**Given** the modal estimates 25 articles will be deleted
**And** 20 of these have notes created
**When** the preview is displayed
**Then** it shows:
```
📊 Preview:
Approximately 25 database records and 20 note files will be deleted
```

#### Scenario: Confirm button clearly indicates action
**Given** the cleanup modal is open
**When** the user views the confirm button
**Then** the button text reads "Delete Articles & Notes"
**And** the button has a warning style (red/orange)

### Requirement: NoteCreator Implements Bulk Note Deletion
The NoteCreator service MUST implement reliable bulk note deletion by article IDs.

**Rationale**: Core implementation to fix the bug. Must handle various edge cases gracefully.

#### Scenario: deleteNotesByArticleIds implementation
**Given** the method receives article IDs `[1, 2, 3, 4, 5]`
**When** `deleteNotesByArticleIds([1, 2, 3, 4, 5])` is called
**Then** it:
1. Queries database for `noteId` for each article
2. Filters out articles with `noteId = null`
3. Calls `vault.adapter.remove()` or `vault.delete()` for each noteId
4. Logs success for each deletion
5. Catches and logs errors without stopping
6. Returns count of successfully deleted notes

#### Scenario: Note path resolution
**Given** an article has `noteId = "WeWe RSS/Tech Blog/Article Title.md"`
**When** the deletion method resolves the path
**Then** it handles the path as-is (already includes folder structure)
**And** no path manipulation is needed
**And** the vault adapter handles the full path

#### Scenario: Parallel deletion for performance
**Given** 100 articles need note deletion
**When** the bulk deletion runs
**Then** note deletions are executed in parallel using `Promise.all()`
**And** the operation completes in reasonable time (< 5 seconds for 100 notes)
**And** individual failures don't block other deletions

## ADDED Requirements

### Requirement: Cleanup Result Includes Notes Deleted Count
The sync result object MUST separately track articles deleted from database vs notes deleted from vault.

**Rationale**: Provides visibility into cleanup effectiveness and helps debug note deletion issues.

#### Scenario: SyncResult interface includes notesDeleted
**Given** the `SyncResult` interface in `SyncService.ts`
**When** TypeScript compilation occurs
**Then** the interface includes:
```typescript
interface SyncResult {
  // ... existing fields ...
  articlesDeleted: number;  // Database records
  notesDeleted: number;     // Vault note files
}
```

#### Scenario: Cleanup reports separate counts
**Given** cleanup deletes 30 database records
**And** successfully deletes 28 note files (2 were already missing)
**When** the cleanup completes
**Then** the result shows:
```javascript
{
  articlesDeleted: 30,
  notesDeleted: 28
}
```
**And** a notice displays: "Cleaned up 30 articles and 28 notes"

### Requirement: Cleanup Logging for Debugging
The cleanup process MUST log detailed information to help users understand what was deleted and debug issues.

**Rationale**: Note deletion failures can be silent. Logging helps diagnose problems.

#### Scenario: Cleanup logs operation summary
**Given** cleanup runs with 30-day retention
**When** the operation completes
**Then** logs include:
```
[SyncService] Cleaning up articles older than 30 days...
[ArticleRepository] Old articles deleted: 25 (older than 30 days)
[NoteCreator] Attempting to delete 20 notes
[NoteCreator] Note deleted: WeWe RSS/Article1.md
[NoteCreator] Note deleted: WeWe RSS/Article2.md
...
[NoteCreator] Note file not found: WeWe RSS/Article5.md
[NoteCreator] Successfully deleted 19 of 20 notes
[SyncService] Cleanup complete: 25 articles and 19 notes deleted
```

#### Scenario: Error logging for failed deletions
**Given** a note deletion fails due to file system error
**When** the error occurs
**Then** an error log entry is created:
```
[NoteCreator] Failed to delete note WeWe RSS/Article.md: Error: EACCES permission denied
```
**And** the error doesn't throw (cleanup continues)

## REMOVED Requirements

None - existing cleanup functionality is enhanced, not replaced.
