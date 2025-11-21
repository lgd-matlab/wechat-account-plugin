# Unify Settings Tabs into Single Tab with Sections

## Problem Statement

Currently, the WeWe RSS plugin creates **two separate tabs** in Obsidian's settings sidebar, both named "WeWe RSS". This creates confusion because:

1. Users see duplicate "WeWe RSS" entries in the settings sidebar
2. It's unclear which tab contains which settings
3. The separation seems arbitrary (General vs AI settings)
4. Users expect all plugin settings in one location

### Current Behavior

```
Obsidian Settings Sidebar:
├── WeWe RSS          ← General Settings tab
└── WeWe RSS          ← AI Settings tab (duplicate name)
```

**Files Involved**:
- `src/main.ts` - Registers both tabs via `addSettingTab()`
- `src/ui/settings/WeWeRssSettingTab.ts` - General settings
- `src/ui/settings/AISettingsTab.ts` - AI settings

### Root Cause

The plugin registers two separate `PluginSettingTab` instances:

```typescript
// src/main.ts lines 136-137
this.addSettingTab(new WeWeRssSettingTab(this.app, this));
this.addSettingTab(new AISettingsTab(this.app, this));
```

This was done to separate concerns, but creates UX confusion.

## Proposed Solution

**Unify into a single settings tab with multiple sections/pages within it.**

### Approach: Tab-Based Navigation Within Single Settings Tab

Merge AI settings back into `WeWeRssSettingTab` but organize content using **tab/section navigation** for better UX.

**Visual Design**:
```
┌─────────────────────────────────────────────────┐
│ WeWe RSS Settings                               │
├─────────────────────────────────────────────────┤
│ [General] [AI Settings]  ← Tab navigation      │
├─────────────────────────────────────────────────┤
│                                                 │
│ (Content area - switches based on active tab)  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Implementation Strategy

1. **Keep** `WeWeRssSettingTab` as the single registered tab
2. **Delete** `AISettingsTab` class
3. **Move** AI settings methods into `WeWeRssSettingTab`
4. **Add** tab navigation UI (button group or sections)
5. **Update** `main.ts` to register only one tab

### Alternative Approaches Considered

**Alternative 1**: Merge all settings into one long page
- **Pros**: Simple implementation, no navigation needed
- **Cons**: Very long scrolling page, poor UX
- **Rejected**: Too cluttered

**Alternative 2**: Collapsible sections (accordions)
- **Pros**: Clean, compact, all visible at once
- **Cons**: More complex DOM manipulation
- **Considered**: Good option, but tabs are simpler

**Alternative 3**: Keep two tabs but rename them distinctly
- **Pros**: Minimal code changes
- **Cons**: Doesn't solve the duplicate name issue (Obsidian API limitation)
- **Rejected**: Doesn't address root problem

**Selected**: Tab-based navigation (Alternative 2 variant) - Best balance of UX and simplicity

## Success Criteria

1. ✅ Only ONE "WeWe RSS" entry appears in Obsidian settings sidebar
2. ✅ All settings (General + AI) accessible from single tab
3. ✅ Clear visual separation between General and AI settings
4. ✅ No functionality lost in the merge
5. ✅ Existing settings continue to work without migration

## Dependencies

- No external dependencies
- No database schema changes
- No breaking changes to settings interface

## Impact Analysis

### Files to Modify
- `src/main.ts` - Remove second `addSettingTab()` call
- `src/ui/settings/WeWeRssSettingTab.ts` - Add AI settings section
- `src/ui/settings/AISettingsTab.ts` - **DELETE** (code moved)

### Files to Add
- None (reusing existing components)

### Migration Needed
- None (settings structure unchanged)

## Timeline

- **Estimated effort**: 45-60 minutes
- **Complexity**: Low-Medium
- **Testing**: Manual (verify all settings work)
- **Risk**: Low (no data changes, easily reversible)

## Rollback Plan

If issues arise, revert to two-tab approach:
```bash
git revert <commit-hash>
```

Or quick fix: Re-add `AISettingsTab` registration in `main.ts`
