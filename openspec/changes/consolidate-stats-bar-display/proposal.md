# Proposal: Consolidate Stats Bar Display

**Change ID**: `consolidate-stats-bar-display`
**Status**: Draft
**Created**: 2025-11-20
**Author**: AI Assistant

---

## Problem Statement

Currently, the stats bar in the sidebar displays multiple separate stat items as individual spans:
- 📚 X feeds
- 📄 X articles
- ⚠️ X unsynced (conditional)
- 🕒 Last sync: X ago (conditional)

This creates visual clutter and makes it harder to scan the information at a glance. Users want a **single consolidated display** showing aggregated statistics in one cohesive format.

### Current Behavior

```
[📚 5 feeds] [📄 120 articles] [⚠️ 23 unsynced] [🕒 Last sync: 2h ago]
```

### Desired Behavior

```
[📚 5 feeds | 📄 97 synced, 23 unsynced | 🕒 2h ago]
```

Or even more compact:

```
[5 feeds • 97/120 synced • Last: 2h ago]
```

---

## Objectives

1. **Consolidate display**: Show all stats in a single formatted string
2. **Improve readability**: Use separators (|, •, ,) to group related information
3. **Maintain information**: Don't lose any data currently displayed
4. **Keep conditional logic**: Only show unsynced count if > 0
5. **Preserve styling**: Maintain warning color for unsynced articles

---

## Scope

### In Scope
- Modify `WeWeRssSidebarView.renderStats()` to create single consolidated stat element
- Update stat formatting to use inline separators
- Preserve existing stat calculation logic (`getSyncStats()`)
- Update CSS styling if needed for inline format

### Out of Scope
- Changing `getSyncStats()` return structure
- Adding new statistics
- Modifying stats bar position or size
- Internationalizing stat labels

---

## Technical Approach

### Current Implementation

**File**: `src/ui/views/WeWeRssSidebarView.ts:98-127`

```typescript
private async renderStats(container: HTMLElement) {
    const stats = await this.plugin.syncService.getSyncStats();
    const statsBar = container.createEl('div', { cls: 'wewe-rss-stats-bar' });

    // Creates multiple span elements
    statsBar.createEl('span', { text: `📚 ${stats.totalFeeds} feeds`, cls: 'wewe-rss-stat' });
    statsBar.createEl('span', { text: `📄 ${stats.totalArticles} articles`, cls: 'wewe-rss-stat' });

    if (stats.unsyncedArticles > 0) {
        statsBar.createEl('span', {
            text: `⚠️ ${stats.unsyncedArticles} unsynced`,
            cls: 'wewe-rss-stat wewe-rss-stat-warning'
        });
    }

    if (stats.lastSyncTime) {
        const timeAgo = this.getTimeAgo(stats.lastSyncTime);
        statsBar.createEl('span', {
            text: `🕒 Last sync: ${timeAgo}`,
            cls: 'wewe-rss-stat wewe-rss-stat-muted'
        });
    }
}
```

### Proposed Implementation

**Option 1: Single Span with Inline HTML**

```typescript
private async renderStats(container: HTMLElement) {
    const stats = await this.plugin.syncService.getSyncStats();
    const statsBar = container.createEl('div', { cls: 'wewe-rss-stats-bar' });

    // Build consolidated text
    let statText = `📚 ${stats.totalFeeds} feeds | 📄 ${stats.syncedArticles} synced`;

    if (stats.unsyncedArticles > 0) {
        statText += `, <span class="wewe-rss-stat-warning">${stats.unsyncedArticles} unsynced</span>`;
    }

    if (stats.lastSyncTime) {
        const timeAgo = this.getTimeAgo(stats.lastSyncTime);
        statText += ` | 🕒 ${timeAgo}`;
    }

    const statSpan = statsBar.createEl('span', { cls: 'wewe-rss-stat-consolidated' });
    statSpan.innerHTML = statText;
}
```

**Option 2: Multiple Inline Spans with Separators**

```typescript
private async renderStats(container: HTMLElement) {
    const stats = await this.plugin.syncService.getSyncStats();
    const statsBar = container.createEl('div', { cls: 'wewe-rss-stats-bar-inline' });

    // Feeds
    statsBar.createEl('span', { text: `📚 ${stats.totalFeeds} feeds`, cls: 'wewe-rss-stat' });

    // Separator
    statsBar.createEl('span', { text: ' | ', cls: 'wewe-rss-stat-separator' });

    // Articles (synced)
    statsBar.createEl('span', { text: `📄 ${stats.syncedArticles} synced`, cls: 'wewe-rss-stat' });

    if (stats.unsyncedArticles > 0) {
        statsBar.createEl('span', { text: ', ', cls: 'wewe-rss-stat-separator' });
        statsBar.createEl('span', {
            text: `${stats.unsyncedArticles} unsynced`,
            cls: 'wewe-rss-stat wewe-rss-stat-warning'
        });
    }

    if (stats.lastSyncTime) {
        const timeAgo = this.getTimeAgo(stats.lastSyncTime);
        statsBar.createEl('span', { text: ' | ', cls: 'wewe-rss-stat-separator' });
        statsBar.createEl('span', {
            text: `🕒 ${timeAgo}`,
            cls: 'wewe-rss-stat wewe-rss-stat-muted'
        });
    }
}
```

**Recommendation**: **Option 2** is preferred as it:
- Maintains DOM structure for styling flexibility
- Avoids innerHTML security concerns
- Easier to test and modify
- Clear separation between data and presentation

---

## CSS Changes

**File**: `styles.css`

Add new styles:

```css
/* Inline stats bar layout */
.wewe-rss-stats-bar-inline {
    display: flex;
    align-items: center;
    gap: 0; /* Remove gaps, use separators instead */
    padding: 10px 15px;
    background-color: var(--background-primary-alt);
    border-bottom: 1px solid var(--background-modifier-border);
    font-size: 0.85em;
    overflow-x: auto;
}

/* Separator styling */
.wewe-rss-stat-separator {
    color: var(--text-faint);
    margin: 0 4px;
}

/* Adjust stat item spacing for inline display */
.wewe-rss-stats-bar-inline .wewe-rss-stat {
    white-space: nowrap;
    margin: 0;
}
```

---

## Testing Strategy

### Manual Testing
1. **Normal state**: Verify consolidated display with feeds, synced/unsynced articles
2. **Zero unsynced**: Verify unsynced count is hidden when 0
3. **No last sync**: Verify time display is hidden when null
4. **Responsive**: Check display on narrow sidebars
5. **Theme compatibility**: Test with light/dark themes

### Unit Testing
```typescript
describe('WeWeRssSidebarView.renderStats', () => {
    it('should display consolidated stats with separators', async () => {
        // Mock getSyncStats to return test data
        // Verify single container with inline elements
        // Check separator presence
    });

    it('should hide unsynced count when zero', async () => {
        // Mock stats with unsyncedArticles: 0
        // Verify no warning span created
    });

    it('should apply warning class to unsynced count', async () => {
        // Mock stats with unsyncedArticles > 0
        // Verify .wewe-rss-stat-warning class applied
    });
});
```

---

## Migration & Rollout

### Breaking Changes
None - purely visual change

### Backward Compatibility
Existing CSS classes remain functional. Old styling will be overridden by new layout.

### Feature Flags
Not required - low-risk UI change

### Rollout Plan
1. Implement code changes
2. Update styles.css
3. Manual test in development
4. Include in next plugin release

---

## Alternatives Considered

### Alternative 1: Keep Multiple Spans, Add Background Container
**Pros**: Minimal code change
**Cons**: Doesn't address core issue of visual separation

### Alternative 2: Tooltip for Details
**Pros**: Ultra-compact main view
**Cons**: Hides information, requires hover interaction

### Alternative 3: Dropdown/Expandable Stats
**Pros**: Can show more details
**Cons**: Over-engineering a simple display issue

---

## Success Criteria

- [ ] Stats display in single consolidated line
- [ ] Separators (|, ,) visually group related information
- [ ] Unsynced count only shows when > 0
- [ ] Warning styling preserved for unsynced count
- [ ] Last sync time only shows when available
- [ ] Display remains readable on narrow sidebars
- [ ] No layout shift or visual glitches
- [ ] CSS follows existing theme conventions

---

## Open Questions

1. **Separator style**: Use `|` (pipe), `•` (bullet), or `:` (colon)?
   - **Recommendation**: Mix - Use `|` for major sections, `,` within sections

2. **Emoji retention**: Keep 📚, 📄, 🕒 emojis or simplify?
   - **Recommendation**: Keep for visual continuity

3. **Synced vs Total**: Show "97/120 synced" or "97 synced, 23 unsynced"?
   - **Recommendation**: "97 synced, 23 unsynced" (clearer semantics)

4. **CSS class naming**: Use `-inline` suffix or new naming?
   - **Recommendation**: Add `-inline` modifier to existing class

---

## Related Changes

- None currently

---

## References

- **Feature Mapping**: [FEATURE-CODE-MAPPING.md](../../FEATURE-CODE-MAPPING.md#📊-侧边栏---统计信息栏)
- **Current Implementation**: `src/ui/views/WeWeRssSidebarView.ts:98-127`
- **Styling**: `styles.css:25-46`
- **Data Source**: `src/services/SyncService.ts:275-295` (`getSyncStats()`)
