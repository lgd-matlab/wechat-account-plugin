# Tasks: Adjust Sync Filter Default to 5 Days

## Prerequisites
- [ ] Review current `syncDaysFilter` implementation in codebase
- [ ] Verify no hardcoded 30-day assumptions in tests or services

## Implementation Tasks

### 1. Update Default Setting Value
**File**: `src/types/index.ts`
**Estimated Time**: 5 minutes
**Dependencies**: None

- [ ] Change `DEFAULT_SETTINGS.syncDaysFilter` from 30 to 5
- [ ] Verify TypeScript compilation succeeds
- [ ] Run quick manual check of types

**Validation**:
```typescript
// Verify this line changes from:
syncDaysFilter: 30, // Only sync articles from last 30 days
// To:
syncDaysFilter: 5, // Only sync articles from last 5 days
```

### 2. Update Settings UI Description
**File**: `src/ui/settings/WeWeRssSettingTab.ts`
**Estimated Time**: 10 minutes
**Dependencies**: Task 1 complete

- [ ] Locate the `syncDaysFilter` setting UI code
- [ ] Update description text to mention "Default: 5 days"
- [ ] Ensure help text clearly explains the 5-day default
- [ ] Verify UI renders correctly with new description

**Expected Change**:
```typescript
.setDesc('Only sync articles published within the last N days. Older articles will be ignored during sync. (Default: 5 days)')
```

### 3. Update Project Documentation
**File**: `openspec/project.md`
**Estimated Time**: 15 minutes
**Dependencies**: Task 1 complete

- [ ] Locate sync settings documentation section
- [ ] Update default value mention from 30 to 5 days
- [ ] Verify consistency across all documentation references
- [ ] Check for any hardcoded "30 days" mentions

**Sections to Check**:
- "Current Features" → "Content Management"
- Any sync configuration examples

### 4. Update Main Project Documentation
**File**: `CLAUDE.md`
**Estimated Time**: 10 minutes
**Dependencies**: Task 1 complete

- [ ] Search for "syncDaysFilter" or "30 days" mentions
- [ ] Update to reflect 5-day default
- [ ] Update examples if any show the default value
- [ ] Verify module-specific CLAUDE.md files if needed

### 5. Review and Update Tests
**Files**: `src/__tests__/unit/services/FeedService.test.ts`, possibly others
**Estimated Time**: 30 minutes
**Dependencies**: Task 1 complete

- [ ] Search tests for hardcoded 30-day assumptions
- [ ] Update test fixtures to explicitly set retention days if needed
- [ ] Add explicit test case verifying new default
- [ ] Ensure existing tests pass with new default

**Test Cases to Add/Verify**:
```typescript
describe('Default Settings', () => {
  it('should default syncDaysFilter to 5 days', () => {
    expect(DEFAULT_SETTINGS.syncDaysFilter).toBe(5);
  });
});

describe('FeedService with default settings', () => {
  it('should filter articles older than 5 days by default', async () => {
    // Test implementation
  });
});
```

### 6. Run Full Test Suite
**Estimated Time**: 10 minutes
**Dependencies**: All implementation tasks complete

- [ ] Run `npm test` to execute all tests
- [ ] Verify all 390 tests pass
- [ ] Check for any new warnings or errors
- [ ] Review test coverage report

**Commands**:
```bash
npm test
npm run test:coverage
```

### 7. Manual Testing - Fresh Installation Simulation
**Estimated Time**: 15 minutes
**Dependencies**: All implementation tasks complete

- [ ] Clear plugin data (simulate fresh install)
- [ ] Reload plugin in Obsidian
- [ ] Verify settings show 5 as default value
- [ ] Add a test feed
- [ ] Verify only last 5 days of articles are synced
- [ ] Check that no articles older than 5 days appear

### 8. Manual Testing - Existing Configuration
**Estimated Time**: 10 minutes
**Dependencies**: Task 7 complete

- [ ] Test with existing user data (if available)
- [ ] Verify existing syncDaysFilter value is preserved
- [ ] Verify no unexpected behavior changes
- [ ] Confirm sync works as before for existing users

### 9. Update CHANGELOG (if exists)
**File**: `CHANGELOG.md` or similar
**Estimated Time**: 5 minutes
**Dependencies**: All implementation complete

- [ ] Add entry for version with this change
- [ ] Mention default change from 30 to 5 days
- [ ] Explain impact on fresh vs existing installations
- [ ] Note that users can still configure 1-365 days

**Example Entry**:
```markdown
## [Version X.X.X] - 2025-MM-DD

### Changed
- **Sync Days Filter Default**: Changed default sync filter from 30 days to 5 days for new installations. This reduces initial sync overhead and database storage while focusing on recent articles. Existing installations maintain their configured value. Users can adjust this setting between 1-365 days in Settings > General > Sync Settings.
```

### 10. Final Verification
**Estimated Time**: 10 minutes
**Dependencies**: All tasks complete

- [ ] Review all changed files in diff
- [ ] Verify no unintended changes
- [ ] Check TypeScript compilation: `npm run build`
- [ ] Verify plugin loads in Obsidian without errors
- [ ] Quick smoke test: Add account, add feed, sync
- [ ] Verify articles from last 5 days appear, older ones don't

## Post-Implementation

### Documentation Review
- [ ] Review all markdown files for consistency
- [ ] Ensure OpenSpec proposal matches implementation
- [ ] Update any diagrams or architecture docs if needed

### Code Review Checklist
- [ ] All tasks completed and verified
- [ ] No breaking changes introduced
- [ ] Backward compatibility maintained
- [ ] Tests pass (390/390)
- [ ] Documentation updated
- [ ] No hardcoded assumptions remain

## Validation Checklist

Before marking this change as complete, verify:

- [ ] `DEFAULT_SETTINGS.syncDaysFilter === 5` in `src/types/index.ts`
- [ ] Settings UI mentions "Default: 5 days"
- [ ] All tests pass (390/390)
- [ ] Fresh installation uses 5-day default
- [ ] Existing installations preserve their configured value
- [ ] Documentation reflects new default
- [ ] No console errors when loading plugin
- [ ] Sync filtering works correctly with 5-day default

## Estimated Total Time
- Implementation: ~2 hours
- Testing: ~1 hour
- Documentation: ~0.5 hours
- **Total: ~3.5 hours**

## Notes
- This is a low-risk change affecting only a default value
- No database migrations required
- No breaking changes to API or data structures
- Can be reverted easily by changing single line
- Users maintain full control via settings (1-365 days range)
