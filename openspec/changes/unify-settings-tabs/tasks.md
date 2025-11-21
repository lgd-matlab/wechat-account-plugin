# Tasks: Unify Settings Tabs into Single Tab

## Task Breakdown

### 1. Read and Extract AI Settings Code
**File**: `src/ui/settings/AISettingsTab.ts`
**Estimated Time**: 10 minutes

- [x] Read AISettingsTab implementation
- [ ] Identify all setting methods (addSummarizationSettings, etc.)
- [ ] Note all dependencies and imports
- [ ] Document setting structure for migration

**Validation**:
- Full understanding of AI settings structure

---

### 2. Add Tab Navigation UI to WeWeRssSettingTab
**File**: `src/ui/settings/WeWeRssSettingTab.ts`
**Estimated Time**: 15 minutes

- [ ] Add navigation state tracking (currentTab: 'general' | 'ai')
- [ ] Create tab button group in display() method
- [ ] Add CSS classes for tab styling
- [ ] Implement tab switching logic

**Code Pattern**:
```typescript
private currentTab: 'general' | 'ai' = 'general';

display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Tab navigation
    this.addTabNavigation(containerEl);

    // Content area
    if (this.currentTab === 'general') {
        this.displayGeneralSettings(containerEl);
    } else {
        this.displayAISettings(containerEl);
    }
}
```

**Validation**:
- Tab buttons appear and switch correctly

---

### 3. Migrate AI Settings Methods into WeWeRssSettingTab
**File**: `src/ui/settings/WeWeRssSettingTab.ts`
**Estimated Time**: 15 minutes

- [ ] Copy addSummarizationSettings() method from AISettingsTab
- [ ] Copy any helper methods
- [ ] Update method to work within new structure
- [ ] Create displayAISettings() wrapper method

**Validation**:
- AI settings render correctly when AI tab is active

---

### 4. Refactor displayGeneralSettings Method
**File**: `src/ui/settings/WeWeRssSettingTab.ts`
**Estimated Time**: 10 minutes

- [ ] Wrap existing display() content into displayGeneralSettings()
- [ ] Ensure all existing settings work
- [ ] Keep header and description

**Validation**:
- General settings render correctly when General tab is active

---

### 5. Remove AISettingsTab Registration
**File**: `src/main.ts`
**Estimated Time**: 2 minutes

- [ ] Remove `import { AISettingsTab }` line
- [ ] Remove `this.addSettingTab(new AISettingsTab(this.app, this));` line
- [ ] Keep only WeWeRssSettingTab registration

**Validation**:
- Only one "WeWe RSS" appears in settings sidebar

---

### 6. Delete AISettingsTab File
**File**: `src/ui/settings/AISettingsTab.ts`
**Estimated Time**: 1 minute

- [ ] Delete AISettingsTab.ts file
- [ ] Verify no other files import it

**Validation**:
- Build succeeds without errors
- No import errors

---

### 7. Add Tab Styling
**File**: `styles.css`
**Estimated Time**: 10 minutes

- [ ] Add tab navigation styles
- [ ] Add active/inactive tab styles
- [ ] Ensure consistent with Obsidian theme

**CSS Pattern**:
```css
.wewe-rss-tab-navigation {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--background-modifier-border);
}

.wewe-rss-tab-button {
    padding: 8px 16px;
    background: transparent;
    border: none;
    cursor: pointer;
}

.wewe-rss-tab-button.active {
    border-bottom: 2px solid var(--interactive-accent);
}
```

**Validation**:
- Tabs look clean and professional

---

### 8. Build and Test
**Estimated Time**: 15 minutes

- [ ] Run `npm run build`
- [ ] Copy files to Obsidian vault
- [ ] Reload Obsidian
- [ ] Test General settings work
- [ ] Test AI settings work
- [ ] Test tab switching
- [ ] Verify only one settings entry

**Test Scenarios**:
1. Settings sidebar shows only one "WeWe RSS"
2. General tab shows all account/sync/note settings
3. AI tab shows all AI provider/summary settings
4. Switching tabs preserves state
5. All settings save correctly

**Validation**:
- All tests pass
- No console errors
- Settings persist correctly

---

### 9. Update Documentation
**File**: `src/ui/CLAUDE.md`
**Estimated Time**: 5 minutes

- [ ] Update settings tab documentation
- [ ] Remove references to AISettingsTab
- [ ] Add tab navigation documentation

**Validation**:
- Documentation matches new implementation

---

## Total Estimated Time: 83 minutes (~1.5 hours)

## Dependencies
- Task 2 depends on Task 1 (understand AI settings structure)
- Task 3 depends on Task 2 (tab navigation exists)
- Task 5 depends on Task 3 (AI settings migrated)
- Task 6 depends on Task 5 (no longer referenced)
- Task 8 depends on all previous tasks

## Parallel Work Opportunities
- Task 7 (styling) can be done in parallel with Tasks 2-4
- Task 9 (docs) can be done in parallel with Task 8

## Risk Level: Low
- No database changes
- No settings schema changes
- Easily reversible by git revert
- Incremental approach allows testing at each step
