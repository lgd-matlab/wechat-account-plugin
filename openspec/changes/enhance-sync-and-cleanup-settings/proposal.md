# Proposal: Enhance Sync and Cleanup Settings

## Change ID
`enhance-sync-and-cleanup-settings`

## Overview
This proposal enhances the general settings with two improvements:

1. **Sync Days Filter**: Add a setting to control how many days of historical articles to sync from WeChat public accounts
2. **Cleanup Notes Deletion Fix**: Fix the cleanup feature to properly delete both database records AND corresponding markdown notes from the Obsidian vault

## Problem Statement

### Issue 1: No Control Over Sync History Depth
Currently, when syncing articles from WeChat public accounts, the plugin fetches and saves all articles without a time-based filter. Users want to control the sync history window:
- If set to 5 days, only articles published within the last 5 days are fetched and saved
- Articles older than N days are ignored during sync

This prevents database bloat from old articles that users don't need.

### Issue 2: Cleanup Doesn't Delete Notes
The current "Clean Up Old Articles" feature in General Settings only deletes article records from the database but does NOT delete the corresponding markdown notes from the Obsidian vault. Users expect this cleanup to remove both:
- Database records (currently working)
- Markdown note files in the vault (currently NOT working)

According to code inspection at `SyncService.ts:207`, the feature is supposed to call `noteCreator.deleteNotesByArticleIds()` but it's not functioning correctly.

## Goals
1. Add `syncDaysFilter` setting (1-365 days, default 30) to control article sync window
2. Fix cleanup to delete both database records AND markdown notes
3. Make cleanup behavior clear in UI (indicate that both database and notes will be deleted)
4. Maintain backward compatibility with existing settings

## Non-Goals
- Changing the existing `articleRetentionDays` setting (different purpose - controls FeedService filtering)
- Implementing automatic cleanup scheduling (cleanup remains manual via button)
- Adding preview/dry-run mode for cleanup (future enhancement)

## Success Criteria
1. Users can set `syncDaysFilter` in General Settings → Sync Settings section
2. During sync, only articles published within `syncDaysFilter` days are saved to database
3. Manual cleanup via "Clean Up Old Articles" button successfully deletes both:
   - Database records from articles table
   - Corresponding markdown note files from vault
4. Cleanup modal clearly indicates that both database and notes will be deleted
5. All 390 existing tests continue to pass
6. New tests validate sync filtering and cleanup behavior

## Out of Scope
- Changing how `articleRetentionDays` works (used by FeedService for API filtering)
- Adding undo/restore functionality for cleanup
- Implementing automatic scheduled cleanup

## Timeline
- Spec creation: 1 day
- Implementation: 2-3 days
- Testing: 1 day
- Total: 4-5 days

## Dependencies
- No external dependencies
- Depends on existing:
  - `WeWeRssSettings` interface
  - `SyncService.cleanupOldArticlesAndNotes()`
  - `NoteCreator.deleteNotesByArticleIds()`
  - `CleanupArticlesModal`

## Affected Components
- `src/types/index.ts` - Add `syncDaysFilter` to settings
- `src/services/SyncService.ts` - Apply sync filter, fix cleanup
- `src/ui/settings/WeWeRssSettingTab.ts` - Add sync filter UI
- `src/ui/modals/CleanupArticlesModal.ts` - Update description
- `src/services/NoteCreator.ts` - Fix note deletion logic
- Tests: Add/update tests for new behavior

## Related Changes
None

## Alternatives Considered

### Alternative 1: Single Unified Retention Setting
**Considered**: Merge `articleRetentionDays`, `syncDaysFilter`, and cleanup into one setting
**Rejected**: These serve different purposes:
- `articleRetentionDays`: FeedService API filtering
- `syncDaysFilter`: Sync window control
- Cleanup retention: Manual cleanup threshold

### Alternative 2: Automatic Cleanup on Sync
**Considered**: Run cleanup automatically during sync
**Rejected**: Users want explicit control over cleanup timing and scope

### Alternative 3: Separate Cleanup Buttons
**Considered**: One button for "Delete Database Only", another for "Delete Database + Notes"
**Rejected**: Adds complexity; users expect cleanup to remove everything related to old articles
