# Specification: Stats Bar Display Consolidation

**Capability**: `stats-bar-display`
**Change ID**: `consolidate-stats-bar-display`
**Status**: Draft
**Created**: 2025-11-20

---

## Overview

The stats bar in the WeWe RSS sidebar displays aggregated statistics about feeds, articles, and synchronization status. This specification defines the consolidated single-line display format that replaces the previous multi-item layout.

---

## MODIFIED Requirements

### Requirement: Stats Bar Layout
**ID**: `SBD-001`
**Priority**: High
**Category**: UI/Display

The stats bar MUST display all statistics in a single consolidated line with inline separators, rather than as separate disconnected items.

#### Scenario: Normal State with All Statistics

**Given** the sidebar is open
**And** there are 5 feeds with 120 total articles
**And** 97 articles are synced and 23 are unsynced
**And** last sync occurred 2 hours ago

**When** the stats bar renders

**Then** the display MUST show:
```
📚 5 feeds | 📄 97 synced, 23 unsynced | 🕒 2h ago
```

**And** all elements MUST be in a single container
**And** separators MUST use `|` (pipe) for major sections
**And** separators MUST use `,` (comma) within sections

---

#### Scenario: Zero Unsynced Articles

**Given** the sidebar is open
**And** there are 5 feeds with 120 articles
**And** all 120 articles are synced
**And** last sync occurred 1 day ago

**When** the stats bar renders

**Then** the display MUST show:
```
📚 5 feeds | 📄 120 synced | 🕒 1d ago
```

**And** the unsynced count MUST NOT be displayed
**And** the comma separator after "synced" MUST NOT be displayed

---

#### Scenario: No Last Sync Time

**Given** the sidebar is open
**And** there are 3 feeds with 50 articles
**And** 40 articles are synced and 10 are unsynced
**And** no sync has been performed yet

**When** the stats bar renders

**Then** the display MUST show:
```
📚 3 feeds | 📄 40 synced, 10 unsynced
```

**And** the last sync time MUST NOT be displayed
**And** the trailing pipe separator MUST NOT be displayed

---

### Requirement: Warning Styling for Unsynced Count
**ID**: `SBD-002`
**Priority**: Medium
**Category**: UI/Styling

When unsynced articles exist, the unsynced count MUST be visually distinguished with warning styling to draw user attention.

#### Scenario: Warning Color Applied

**Given** there are unsynced articles (count > 0)

**When** the stats bar renders

**Then** the unsynced count text MUST have class `wewe-rss-stat-warning`
**And** the text color MUST use `var(--color-orange)` or theme warning color
**And** the warning styling MUST NOT affect surrounding text

---

#### Scenario: No Warning When Zero Unsynced

**Given** there are zero unsynced articles

**When** the stats bar renders

**Then** no warning class MUST be applied
**And** no orange/warning color MUST be displayed

---

### Requirement: Responsive Layout
**ID**: `SBD-003`
**Priority**: Medium
**Category**: UI/Responsive

The stats bar MUST adapt to narrow sidebar widths without breaking layout or losing information.

#### Scenario: Narrow Sidebar Width

**Given** the sidebar width is less than 300px
**And** the stats bar content exceeds container width

**When** the stats bar renders

**Then** horizontal scrolling MUST be enabled
**And** text MUST NOT wrap to multiple lines
**And** all content MUST remain visible via scroll
**And** the scrollbar MUST be styled consistently with Obsidian theme

---

### Requirement: Time Formatting
**ID**: `SBD-004`
**Priority**: Low
**Category**: Data/Formatting

The last sync time MUST be displayed in a human-readable relative format using the existing `getTimeAgo()` utility.

#### Scenario: Recent Sync (Less than 1 hour)

**Given** last sync occurred 45 minutes ago

**When** the time is formatted

**Then** the display MUST show "45m ago"

---

#### Scenario: Sync Today (1-24 hours)

**Given** last sync occurred 5 hours ago

**When** the time is formatted

**Then** the display MUST show "5h ago"

---

#### Scenario: Sync Multiple Days Ago

**Given** last sync occurred 3 days ago

**When** the time is formatted

**Then** the display MUST show "3d ago"

---

#### Scenario: Sync Over a Week Ago

**Given** last sync occurred 8 days ago

**When** the time is formatted

**Then** the display MUST show the formatted date (e.g., "Nov 12")

---

### Requirement: Separator Styling
**ID**: `SBD-005`
**Priority**: Low
**Category**: UI/Styling

Separators MUST be visually subtle to avoid overpowering the actual data.

#### Scenario: Pipe Separator Styling

**Given** a pipe separator `|` is rendered

**When** the stats bar displays

**Then** the separator color MUST use `var(--text-faint)`
**And** the separator MUST have 4px horizontal margin on each side
**And** the separator MUST use the same font size as stats (0.85em)

---

#### Scenario: Comma Separator Styling

**Given** a comma separator `,` is rendered

**When** the stats bar displays

**Then** the separator MUST use default text color
**And** the separator MUST have standard spacing (CSS default)

---

## REMOVED Requirements

### Requirement: Individual Stat Spans (REMOVED)
**ID**: `SBD-R001`
**Reason**: Replaced by consolidated single-line display

Previously, each statistic was rendered as a separate `<span>` element with independent spacing and gaps. This requirement is REMOVED in favor of the consolidated inline layout defined in `SBD-001`.

**Old Behavior** (REMOVED):
```html
<div class="wewe-rss-stats-bar">
    <span class="wewe-rss-stat">📚 5 feeds</span>
    <span class="wewe-rss-stat">📄 120 articles</span>
    <span class="wewe-rss-stat wewe-rss-stat-warning">⚠️ 23 unsynced</span>
    <span class="wewe-rss-stat wewe-rss-stat-muted">🕒 Last sync: 2h ago</span>
</div>
```

**New Behavior** (from `SBD-001`):
```html
<div class="wewe-rss-stats-bar-inline">
    <span class="wewe-rss-stat">📚 5 feeds</span>
    <span class="wewe-rss-stat-separator"> | </span>
    <span class="wewe-rss-stat">📄 97 synced</span>
    <span class="wewe-rss-stat-separator">, </span>
    <span class="wewe-rss-stat wewe-rss-stat-warning">23 unsynced</span>
    <span class="wewe-rss-stat-separator"> | </span>
    <span class="wewe-rss-stat wewe-rss-stat-muted">🕒 2h ago</span>
</div>
```

---

### Requirement: Gap-Based Spacing (REMOVED)
**ID**: `SBD-R002`
**Reason**: Replaced by explicit separator elements

Previously, the stats bar used CSS `gap: 15px` to space elements. This is REMOVED in favor of explicit separator spans with controlled margins (defined in `SBD-005`).

**Old CSS** (REMOVED):
```css
.wewe-rss-stats-bar {
    display: flex;
    gap: 15px;  /* REMOVED */
}
```

**New CSS** (from `SBD-005`):
```css
.wewe-rss-stats-bar-inline {
    display: flex;
    gap: 0;  /* No gap, use separators */
}

.wewe-rss-stat-separator {
    margin: 0 4px;  /* Explicit margin */
}
```

---

## ADDED Requirements

### Requirement: Stats Data Aggregation
**ID**: `SBD-A001`
**Priority**: High
**Category**: Data/Calculation

The stats bar MUST display both synced and unsynced article counts, calculated from total articles.

#### Scenario: Calculate Synced Count

**Given** there are 120 total articles
**And** 23 articles are unsynced

**When** calculating synced count

**Then** synced count MUST equal `totalArticles - unsyncedArticles`
**And** the result MUST be 97
**And** both counts MUST be displayed together

---

### Requirement: Conditional Display Logic
**ID**: `SBD-A002`
**Priority**: High
**Category**: UI/Logic

Stats bar elements MUST be conditionally rendered based on data availability to avoid empty placeholders.

#### Scenario: All Data Available

**Given** feeds exist, articles exist, and last sync time exists

**When** rendering stats bar

**Then** ALL sections MUST be displayed:
1. Feeds count
2. Synced/unsynced articles
3. Last sync time

**And** separators MUST appear between all sections

---

#### Scenario: Missing Last Sync Time

**Given** feeds exist and articles exist
**And** last sync time is null

**When** rendering stats bar

**Then** feeds and articles sections MUST display
**And** last sync section MUST NOT display
**And** trailing separator MUST NOT display

---

#### Scenario: Zero Articles

**Given** feeds exist but no articles exist

**When** rendering stats bar

**Then** feeds count MUST display
**And** articles section MUST show "0 synced"
**And** unsynced count MUST NOT display

---

## Cross-Capability Dependencies

- **None**: This capability is self-contained within the stats bar UI component

---

## Implementation Notes

### File Locations
- **Component**: `src/ui/views/WeWeRssSidebarView.ts:98-127`
- **Styling**: `styles.css:25-46`
- **Data Source**: `src/services/SyncService.ts:275-295` (`getSyncStats()`)

### Key Methods
- `renderStats(container: HTMLElement)`: Main rendering logic
- `getTimeAgo(date: Date)`: Time formatting utility

### CSS Classes
- `.wewe-rss-stats-bar-inline`: Main container (replaces `.wewe-rss-stats-bar`)
- `.wewe-rss-stat`: Individual stat text
- `.wewe-rss-stat-separator`: Pipe and comma separators
- `.wewe-rss-stat-warning`: Orange color for unsynced count
- `.wewe-rss-stat-muted`: Muted color for time

---

## Acceptance Criteria Summary

✅ All scenarios pass manual testing
✅ Stats display in single consolidated line
✅ Separators (`|`, `,`) properly placed
✅ Unsynced count hidden when zero
✅ Last sync time hidden when null
✅ Warning color applied to unsynced count
✅ Responsive on narrow sidebars (horizontal scroll)
✅ Time formatting uses relative format
✅ No console errors or warnings
✅ Compatible with light and dark themes

---

## References

- **Feature Mapping**: [FEATURE-CODE-MAPPING.md](../../../../FEATURE-CODE-MAPPING.md#📊-侧边栏---统计信息栏)
- **Proposal**: [proposal.md](../../proposal.md)
- **Tasks**: [tasks.md](../../tasks.md)

---

**Last Updated**: 2025-11-20
**Reviewers**: TBD
**Approval Status**: Draft
