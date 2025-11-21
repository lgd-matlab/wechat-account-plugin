# Implementation Tasks: Consolidate Stats Bar Display

**Change ID**: `consolidate-stats-bar-display`
**Status**: Implemented

---

## Task Breakdown

### Phase 1: Core Implementation

#### Task 1.1: Update `renderStats()` Method
**File**: `src/ui/views/WeWeRssSidebarView.ts:98-127`

**Actions**:
1. Replace multiple `createEl('span')` calls with consolidated inline approach
2. Build stat text with inline separators (`|` for sections, `,` within sections)
3. Create single parent container with inline child spans
4. Add separator spans between stat groups
5. Preserve conditional logic for unsynced count and last sync time

**Acceptance Criteria**:
- Stats display in single line with separators
- Unsynced count only shows when > 0
- Last sync time only shows when available
- All existing stat values are preserved
- Warning class still applies to unsynced count

**Estimated Time**: 30 minutes

---

#### Task 1.2: Update CSS Styling
**File**: `styles.css:25-46`

**Actions**:
1. Add `.wewe-rss-stats-bar-inline` class (or modify existing `.wewe-rss-stats-bar`)
2. Change `gap` to 0 (use separators instead)
3. Add `.wewe-rss-stat-separator` styling (color, margin)
4. Ensure inline layout with `display: flex; align-items: center`
5. Test overflow behavior (horizontal scroll on narrow screens)

**Acceptance Criteria**:
- Stats bar maintains same height and padding
- Separators have appropriate color (faint)
- No visual gaps between elements
- Responsive on narrow sidebars
- Compatible with light/dark themes

**Estimated Time**: 15 minutes

---

### Phase 2: Testing & Validation

#### Task 2.1: Manual Testing
**Prerequisites**: Tasks 1.1 and 1.2 complete

**Test Cases**:
1. **Normal state**: 5 feeds, 97 synced, 23 unsynced, last sync 2h ago
   - Expected: `📚 5 feeds | 📄 97 synced, 23 unsynced | 🕒 2h ago`

2. **Zero unsynced**: 5 feeds, 120 synced, 0 unsynced
   - Expected: `📚 5 feeds | 📄 120 synced | 🕒 2h ago`

3. **No last sync**: Fresh install, no sync yet
   - Expected: `📚 5 feeds | 📄 97 synced, 23 unsynced`

4. **Narrow sidebar**: Resize to minimum width
   - Expected: Horizontal scroll, no text wrap

5. **Theme toggle**: Switch between light/dark themes
   - Expected: Colors adapt correctly

**Acceptance Criteria**:
- All test cases pass visual inspection
- No console errors
- No layout shifts or glitches

**Estimated Time**: 20 minutes

---

#### Task 2.2: Write Unit Tests (Optional but Recommended)
**File**: `src/__tests__/unit/ui/WeWeRssSidebarView.test.ts` (create if not exists)

**Test Coverage**:
```typescript
describe('WeWeRssSidebarView - renderStats', () => {
    test('displays consolidated stats with separators', async () => {
        // Mock getSyncStats
        // Render stats
        // Verify structure and content
    });

    test('hides unsynced count when zero', async () => {
        // Mock stats with unsyncedArticles: 0
        // Verify no unsynced text in output
    });

    test('hides last sync time when null', async () => {
        // Mock stats with lastSyncTime: null
        // Verify no time text in output
    });

    test('applies warning class to unsynced count', async () => {
        // Mock stats with unsyncedArticles > 0
        // Verify warning class present
    });
});
```

**Acceptance Criteria**:
- All tests pass
- Coverage maintained or improved
- Tests are fast (< 100ms each)

**Estimated Time**: 45 minutes

---

### Phase 3: Documentation & Polish

#### Task 3.1: Update Feature Mapping Documentation
**File**: `FEATURE-CODE-MAPPING.md:240-270` (Stats Bar section)

**Actions**:
1. Update "视觉标识" section with new consolidated format
2. Update "修改指引" with new implementation details
3. Add notes about separator customization
4. Update examples to show new format

**Acceptance Criteria**:
- Documentation accurately reflects new behavior
- Examples show current output format
- Modification guide includes separator styling

**Estimated Time**: 15 minutes

---

#### Task 3.2: Update Module Documentation (Optional)
**File**: `src/ui/CLAUDE.md` (Stats Bar section)

**Actions**:
1. Note the consolidation change in UI documentation
2. Update any diagrams or ASCII art showing stats bar
3. Add design rationale (reduced visual clutter)

**Acceptance Criteria**:
- Module docs reflect current implementation
- Design decisions documented

**Estimated Time**: 10 minutes

---

## Task Dependencies

```
Task 1.1 (renderStats update)
    ↓
Task 1.2 (CSS update)
    ↓
Task 2.1 (Manual testing) ──→ Task 3.1 (Doc update)
    ↓                            ↓
Task 2.2 (Unit tests)    ←──── Task 3.2 (Module doc)
```

**Critical Path**: 1.1 → 1.2 → 2.1 → 3.1

**Parallel Work**: Tasks 2.2 and 3.2 can be done independently after 2.1

---

## Total Estimated Time

- **Core Implementation**: 45 minutes (Tasks 1.1, 1.2)
- **Testing**: 65 minutes (Tasks 2.1, 2.2)
- **Documentation**: 25 minutes (Tasks 3.1, 3.2)

**Total**: ~2 hours 15 minutes (with unit tests)
**Minimum**: ~1 hour 20 minutes (without unit tests)

---

## Rollback Plan

If issues arise:
1. **Revert code changes**: Git revert commits for tasks 1.1, 1.2
2. **Restore original CSS**: Revert `styles.css` changes
3. **No database impact**: Change is UI-only, no data affected
4. **No settings migration**: No plugin settings changed

**Risk Level**: Low (cosmetic UI change only)

---

## Success Metrics

- [x] Stats display in consolidated format
- [x] Zero console errors in browser devtools
- [x] Manual tests pass all scenarios
- [ ] Unit tests pass (if written)
- [x] Documentation updated
- [ ] No user complaints about readability
- [ ] Positive feedback on reduced visual clutter

---

## Notes for Implementation

### Code Style
- Use existing `createEl()` pattern (don't use innerHTML for security)
- Follow existing indentation and naming conventions
- Add JSDoc comments for new methods/logic
- Use TypeScript strict mode (no `any` types)

### CSS Best Practices
- Use Obsidian CSS variables (e.g., `var(--text-faint)`)
- Test with multiple themes
- Avoid hardcoded pixel values (use em/rem)
- Maintain accessibility contrast ratios

### Testing Tips
- Use `src/__tests__/mocks/obsidian.ts` for Obsidian API mocks
- Mock `getSyncStats()` to return predictable data
- Test edge cases (0 feeds, 0 articles, null timestamps)
- Verify conditional rendering logic

---

## Open Items

- [ ] Decide on final separator style (current: `|` and `,`)
- [ ] Confirm emoji retention in final design
- [ ] Verify accessibility (screen reader compatibility)
- [ ] Consider adding keyboard navigation (if needed)

---

**Last Updated**: 2025-11-20
**Assignee**: TBD
**Priority**: Medium (UI improvement, not critical bug)
