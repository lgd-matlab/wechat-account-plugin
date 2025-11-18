# Task: Integrate Article Retention into Cleanup Button

**Date**: 2025-11-18
**Status**: In Progress
**Mode**: Execute

---

## Context

### Original Requirement
User wants to integrate the article retention days setting into the "Clean up old articles" button functionality:
- **Current behavior**: Button deletes synced articles older than 30 days (hardcoded)
- **Sync settings**: Shows "Only sync articles published in N days. Older articles and notes will be automatically deleted during sync"
- **Goal**: Make cleanup button interactive with user-input dialog for retention days, remove retention setting from sync settings UI

### User Example
- User clicks "Clean up old articles" button
- Modal pops up asking "Keep articles from the last N days?"
- User inputs "7" → deletes articles older than 7 days
- Remove article retention selection from sync settings, keep only cleanup checkbox

---

## Solution Design

### Selected Approach: Solution 1 - Interactive Modal with Input Validation ⭐

**Why this solution?**
1. Aligns with existing codebase patterns (AddAccountModal, AddFeedModal)
2. Best user experience with clear, professional interaction
3. Future-proof and extensible
4. Follows Obsidian's Modal API design patterns
5. Provides input validation and preview functionality

**Key Features:**
- New `CleanupArticlesModal` component
- Preview of affected articles count
- Input validation (1-365 days)
- Remembers last used value in settings
- Consistent with plugin's existing UI patterns

---

## Implementation Plan

### Architecture Changes

```
New Components:
├── src/ui/modals/CleanupArticlesModal.ts (new)
├── src/__tests__/unit/ui/CleanupArticlesModal.test.ts (new)
└── .claude/plan/integrate-article-retention-cleanup.md (this file)

Modified Components:
├── src/types/index.ts (add lastCleanupRetentionDays setting)
├── src/services/database/repositories/ArticleRepository.ts (add count method)
├── src/ui/settings/WeWeRssSettingTab.ts (remove setting, update button)
├── src/services/SyncService.ts (update cleanup parameter)
└── src/__tests__/unit/database/ArticleRepository.test.ts (add tests)
```

### Detailed Steps

#### Step 1: Create CleanupArticlesModal Component
- File: `src/ui/modals/CleanupArticlesModal.ts`
- Class extends `Modal`
- Parameters: app, onConfirm callback, defaultDays, estimatedCount
- Features: input validation, preview, confirm/cancel buttons

#### Step 2: Add Helper Method to ArticleRepository
- File: `src/services/database/repositories/ArticleRepository.ts`
- Method: `countArticlesOlderThan(days: number): Promise<number>`
- SQL: `SELECT COUNT(*) FROM articles WHERE published_at < ?`
- For preview functionality in modal

#### Step 3: Update Settings Interface
- File: `src/types/index.ts`
- Add: `lastCleanupRetentionDays: number` (default: 30)
- Remove: `articleRetentionDays` (if exists)

#### Step 4: Update Cleanup Logic in Service Layer
- File: `src/services/SyncService.ts` or similar
- Add parameter: `retentionDays: number` to cleanup method
- Replace hardcoded 30 with dynamic parameter
- Maintain DB + note file deletion

#### Step 5: Modify Settings Tab - Remove Retention Setting
- File: `src/ui/settings/WeWeRssSettingTab.ts`
- Remove: article retention days input/dropdown from sync settings
- Keep: cleanup checkbox (if exists)

#### Step 6: Modify Settings Tab - Update Cleanup Button Handler
- File: `src/ui/settings/WeWeRssSettingTab.ts`
- Open modal with last used value
- Get article count preview
- Handle confirmation with save + cleanup
- Show success/error notices

#### Step 7: Update Auto-Cleanup During Sync
- File: `src/services/SyncService.ts`
- Use `lastCleanupRetentionDays` instead of removed setting
- Ensure consistency between manual and auto cleanup

#### Step 8-10: Testing
- Add unit tests for new modal
- Add tests for repository count method
- Update integration tests as needed

---

## Expected Outcomes

### User Experience
1. User clicks "Clean up old articles" button
2. Modal appears with:
   - Title: "Clean Up Old Articles"
   - Input field for retention days (default: last used value)
   - Preview: "Approximately X articles will be deleted"
   - Confirm/Cancel buttons
3. User enters desired days (e.g., 7)
4. System deletes articles older than 7 days
5. Success notice shows: "Deleted X articles older than 7 days"
6. Next time defaults to 7 days

### Code Quality
- Follows repository → service → UI pattern
- Comprehensive test coverage maintained
- Type-safe with TypeScript
- No breaking changes to existing functionality
- Clean separation of concerns

### Estimated Impact
- New code: ~250-300 lines (including tests)
- Modified code: ~80-120 lines
- Removed code: ~20-30 lines
- Net addition: ~300-400 lines

---

## Implementation Notes

### Dependencies
- Obsidian Modal API
- Existing ArticleRepository
- Plugin settings system
- DatabaseService for SQL queries

### Testing Strategy
- Unit tests for modal component
- Unit tests for repository method
- Integration tests for cleanup flow
- Manual testing in Obsidian environment

### Rollback Plan
If issues arise:
1. Revert settings interface changes
2. Restore original hardcoded cleanup
3. Restore sync settings UI
4. All changes are additive/modular - easy to rollback

---

## Progress Tracking

- [x] Plan created and approved
- [ ] Execution plan stored
- [ ] CleanupArticlesModal created
- [ ] ArticleRepository updated
- [ ] Settings interface updated
- [ ] Service layer updated
- [ ] Settings UI updated
- [ ] Tests added
- [ ] Manual testing complete
- [ ] Code review
- [ ] Deployment ready

---

## References

- Project Documentation: `D:\obsidian-plugin\wechat-account-assemble\CLAUDE.md`
- Module Documentation: `src/ui/CLAUDE.md`, `src/services/CLAUDE.md`
- Existing Modals: `src/ui/modals/AddAccountModal.ts`, `src/ui/modals/AddFeedModal.ts`
- Repository Pattern: `src/services/database/repositories/`
- Testing Patterns: `src/__tests__/unit/`

---

**Last Updated**: 2025-11-18
**Implementation Started**: 2025-11-18
**Estimated Completion**: 2025-11-18
