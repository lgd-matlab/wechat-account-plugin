# Task: Add Note Deletion to Manual Cleanup

**Date**: 2025-11-18
**Status**: In Progress
**Mode**: Execute

---

## Context

### Original Problem
When users click the "Clean Up Old Articles" button and specify retention days:
- ✅ Articles are deleted from database
- ❌ Note files in Obsidian vault are NOT deleted
- **Result**: Orphaned note files remain in vault

### User Request
"For deleting the notes in inputs desired retention days, it only remove data in database, I want to remove notes in Obsidian"

---

## Solution Design

### Selected Approach: Solution 1 - Unify Cleanup Logic ⭐

**Strategy**: Make manual cleanup use the same logic as automatic cleanup

**Why this solution?**
1. Single source of truth - no code duplication
2. Already tested in auto-sync
3. Consistent behavior
4. Better user feedback (shows both counts)
5. Minimal changes required

---

## Implementation Plan

### Architecture Changes

```
Current Flow (Manual Cleanup):
User clicks button → Modal → cleanupOldArticles() → cleanupSynced() → DB only
                                                                      ❌ No notes deleted

New Flow (Manual Cleanup):
User clicks button → Modal → cleanupOldArticles() → cleanupOldArticlesAndNotes() → DB + Notes
                                                                                   ✅ Both deleted

Existing Flow (Auto Cleanup):
Auto-sync runs → cleanupOldArticlesAndNotes() → DB + Notes
                                                ✅ Both deleted (unchanged)
```

### Code Changes

#### Change 1: SyncService.cleanupOldArticles() Method
**File**: `src/services/SyncService.ts`
**Location**: Line ~300

**Before:**
```typescript
async cleanupOldArticles(retentionDays: number = 30): Promise<number> {
    try {
        const deleted = this.plugin.databaseService.articles.cleanupSynced(retentionDays);
        this.logger.info(`Cleaned up ${deleted} old articles`);
        return deleted;
    } catch (error) {
        this.logger.error('Failed to cleanup old articles:', error);
        throw error;
    }
}
```

**After:**
```typescript
async cleanupOldArticles(retentionDays: number = 30): Promise<{
    articlesDeleted: number;
    notesDeleted: number;
}> {
    try {
        const result = await this.cleanupOldArticlesAndNotes(retentionDays);
        this.logger.info(`Cleaned up ${result.articlesDeleted} articles and ${result.notesDeleted} notes`);
        return result;
    } catch (error) {
        this.logger.error('Failed to cleanup old articles:', error);
        throw error;
    }
}
```

**Changes:**
- Return type: `number` → `{ articlesDeleted: number; notesDeleted: number }`
- Implementation: Call `cleanupOldArticlesAndNotes()` instead of `cleanupSynced()`
- Logging: Show both counts

#### Change 2: Settings Tab Callback
**File**: `src/ui/settings/WeWeRssSettingTab.ts`
**Location**: Line ~331

**Before:**
```typescript
const count = await this.plugin.syncService.cleanupOldArticles(retentionDays);
new Notice(`Cleaned up ${count} old articles (older than ${retentionDays} days)`);
```

**After:**
```typescript
const result = await this.plugin.syncService.cleanupOldArticles(retentionDays);
new Notice(`Cleaned up ${result.articlesDeleted} articles and ${result.notesDeleted} notes (older than ${retentionDays} days)`);
```

**Changes:**
- Variable: `count` → `result`
- Message: Show both article and note counts

---

## Expected Outcomes

### User Experience
1. User clicks "Clean Up Old Articles" button
2. Modal appears, user enters retention days (e.g., 7)
3. System deletes:
   - Articles from database older than 7 days
   - Corresponding note files from vault
4. Success notice shows: "Cleaned up 15 articles and 15 notes (older than 7 days)"

### Technical Benefits
- ✅ No orphaned note files
- ✅ Consistent cleanup behavior (manual = auto)
- ✅ Single source of truth
- ✅ Better user feedback
- ✅ Minimal code changes

### Edge Cases Handled
- If note file doesn't exist: No error (NoteCreator handles gracefully)
- If article has no noteId: Skipped silently
- If note deletion fails: Error logged, doesn't block article deletion

---

## Testing Strategy

### 1. Type Checking
```bash
npm run build
```
Expected: No TypeScript errors

### 2. Manual Testing
1. Create test articles with notes
2. Click cleanup button
3. Enter retention days
4. Verify:
   - Articles deleted from database
   - Note files deleted from vault
   - Success message shows both counts

### 3. Edge Case Testing
- Articles without notes (noteId = null)
- Notes already deleted manually
- Invalid note paths

---

## Implementation Notes

### Reused Code
The `cleanupOldArticlesAndNotes()` method already exists and is well-tested:
```typescript
// src/services/SyncService.ts:191-216
private async cleanupOldArticlesAndNotes(retentionDays: number): Promise<{
    articlesDeleted: number;
    notesDeleted: number;
}> {
    // Get article IDs before deletion
    const { deletedIds, count } = this.plugin.databaseService.articles.cleanupOldArticles(retentionDays);

    // Delete corresponding notes
    const notesDeleted = await this.plugin.noteCreator.deleteNotesByArticleIds(deletedIds);

    return { articlesDeleted: count, notesDeleted };
}
```

**Why it's safe:**
- Used in auto-sync since initial implementation
- Handles errors gracefully
- Returns detailed counts
- Uses `cleanupOldArticles()` (not `cleanupSynced()`) to get IDs

### Breaking Changes
**None** - This is an enhancement, not a breaking change:
- Internal method signature change only
- No public API affected
- Improves functionality without removing features

---

## Rollback Plan

If issues arise:
1. Revert SyncService.cleanupOldArticles() to old implementation
2. Revert settings tab callback changes
3. All changes are isolated and easy to rollback

---

## Progress Tracking

- [x] Plan approved
- [ ] Execution plan stored
- [ ] SyncService updated
- [ ] Settings tab updated
- [ ] Build verified
- [ ] Manual testing complete

---

## References

- Related feature: Article retention cleanup integration
- Related file: `.claude/plan/integrate-article-retention-cleanup.md`
- Service method: `SyncService.cleanupOldArticlesAndNotes()`
- Repository method: `ArticleRepository.cleanupOldArticles()`
- Note deletion: `NoteCreator.deleteNotesByArticleIds()`

---

**Last Updated**: 2025-11-18
**Implementation Started**: 2025-11-18
**Estimated Completion**: 2025-11-18
