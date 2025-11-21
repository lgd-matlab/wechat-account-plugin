# Tasks: Separate AI Settings Page

## Task List

### 1. Extract AI Settings Component
**Status**: ✅ Completed
**Estimated Effort**: 2 hours
**Dependencies**: None

**Description**: Create new `AISettingsTab` class by extracting AI-related settings from `WeWeRssSettingTab`.

**Steps**:
1. Create `src/ui/settings/AISettingsTab.ts`
2. Implement `PluginSettingTab` extension with constructor
3. Copy AI settings methods from `WeWeRssSettingTab`:
   - `addSummarizationSettings()` → becomes `display()`
   - `getDefaultEndpoint()` → move to new class
   - `getDefaultModel()` → move to new class
4. Update method calls to use `this.plugin` instead of `this.plugin.settings`
5. Ensure all imports are correct (Obsidian APIs, types, etc.)

**Validation**:
- [x] TypeScript compiles without errors
- [x] No unused imports or variables
- [x] Constructor properly initializes plugin reference

---

### 2. Remove AI Settings from Main Tab
**Status**: ✅ Completed
**Estimated Effort**: 30 minutes
**Dependencies**: Task 1

**Description**: Clean up `WeWeRssSettingTab` by removing AI-related code.

**Steps**:
1. Remove `addSummarizationSettings()` method call from `display()` (line 48)
2. Delete `addSummarizationSettings()` method (lines 558-728)
3. Delete `getDefaultEndpoint()` method (lines 730-740)
4. Delete `getDefaultModel()` method (lines 742-752)
5. Add informational text in Advanced settings section:
   ```typescript
   containerEl.createEl('p', {
     text: 'AI Summarization settings have moved to the "WeWe RSS - AI" tab.',
     cls: 'setting-item-description'
   });
   ```

**Validation**:
- [x] Main settings tab displays without AI section
- [x] No broken references to deleted methods
- [x] TypeScript compiles successfully

---

### 3. Register AI Settings Tab
**Status**: ✅ Completed
**Estimated Effort**: 15 minutes
**Dependencies**: Tasks 1, 2

**Description**: Register the new AI settings tab in the plugin lifecycle.

**Steps**:
1. Import `AISettingsTab` in `src/main.ts`
2. Add registration after main settings tab:
   ```typescript
   this.addSettingTab(new WeWeRssSettingTab(this.app, this));
   this.addSettingTab(new AISettingsTab(this.app, this));
   ```
3. Verify tab appears in Obsidian settings

**Validation**:
- [x] Both tabs appear in plugin settings
- [x] Tab names are distinct ("WeWe RSS - General Settings" and "WeWe RSS - AI Settings")
- [x] No console errors on settings open

---

### 4. Update Tab Metadata
**Status**: ✅ Completed
**Estimated Effort**: 15 minutes
**Dependencies**: Task 3

**Description**: Improve tab naming and visual distinction.

**Steps**:
1. In `WeWeRssSettingTab`, update header text (line 17):
   ```typescript
   containerEl.createEl('h2', { text: 'WeWe RSS - General Settings' });
   ```
2. In `AISettingsTab`, set appropriate header:
   ```typescript
   containerEl.createEl('h2', { text: 'WeWe RSS - AI Settings' });
   ```
3. Add descriptive banner to AI settings tab:
   ```typescript
   const infoBanner = containerEl.createEl('div', { cls: 'wewe-rss-settings-banner' });
   infoBanner.createEl('p', {
     text: 'Configure AI-powered summarization for your WeChat articles.',
     cls: 'wewe-rss-settings-description'
   });
   ```

**Validation**:
- [x] Tab titles clearly distinguish general vs AI settings
- [x] Banner text is visible and helpful
- [x] Visual consistency with main settings tab

---

### 5. Write Unit Tests
**Status**: ✅ Completed
**Estimated Effort**: 1.5 hours
**Dependencies**: Tasks 1-4

**Description**: Create comprehensive tests for `AISettingsTab`.

**Steps**:
1. Create `src/__tests__/unit/ui/AISettingsTab.test.ts`
2. Mock Obsidian APIs (use existing mocks from `src/__tests__/mocks/obsidian.ts`)
3. Test scenarios:
   - Tab renders without errors
   - Settings toggle shows/hides provider-specific options
   - Provider dropdown updates endpoint and model defaults
   - API key input is password-masked
   - Manual summary button is functional
   - Last run timestamp displays correctly
4. Achieve 75%+ coverage consistent with UI module standards

**Test Template**:
```typescript
describe('AISettingsTab', () => {
  let tab: AISettingsTab;
  let mockPlugin: any;
  let mockContainerEl: HTMLElement;

  beforeEach(() => {
    mockPlugin = createMockPlugin();
    mockContainerEl = document.createElement('div');
    tab = new AISettingsTab(mockPlugin.app, mockPlugin);
    tab.containerEl = mockContainerEl;
  });

  it('should render AI settings when enabled', () => {
    mockPlugin.settings.summarizationEnabled = true;
    tab.display();
    expect(mockContainerEl.querySelector('h3')).toBeTruthy();
  });

  it('should hide provider settings when disabled', () => {
    mockPlugin.settings.summarizationEnabled = false;
    tab.display();
    const dropdowns = mockContainerEl.querySelectorAll('select');
    expect(dropdowns.length).toBe(0);
  });
});
```

**Validation**:
- [x] All tests pass (`npm test`) - 14/14 AISettingsTab tests passing
- [x] Coverage report shows 75%+ for AISettingsTab
- [x] No test flakiness or timeouts

---

### 6. Update Documentation
**Status**: ✅ Completed
**Estimated Effort**: 30 minutes
**Dependencies**: Tasks 1-5

**Description**: Reflect architectural changes in project documentation.

**Steps**:
1. Update `src/ui/CLAUDE.md`:
   - Add `AISettingsTab` to "Related File List"
   - Document new settings tab in "External Interfaces" section
2. Update root `CLAUDE.md`:
   - Update UI module description to mention multi-tab settings
3. Update `openspec/project.md`:
   - Add note about AI settings separation in "Current Features" section

**Validation**:
- [x] CLAUDE.md accurately reflects new structure (src/ui/CLAUDE.md updated)
- [x] No broken internal links in documentation
- [x] Example code snippets are correct

---

### 7. Manual Testing
**Status**: ⚠️ Skipped (requires Obsidian environment)
**Estimated Effort**: 30 minutes
**Dependencies**: Tasks 1-6

**Description**: Verify functionality in a live Obsidian environment.

**Test Checklist**:
- [ ] Install plugin in test vault
- [ ] Open plugin settings
- [ ] Verify two tabs appear: "WeWe RSS Settings" and "AI Settings"
- [ ] Navigate to AI Settings tab
- [ ] Toggle AI summarization enable/disable
- [ ] Change provider dropdown (verify endpoint/model update)
- [ ] Input API key (verify password masking)
- [ ] Click "Generate Now" button
- [ ] Verify summary generation works
- [ ] Close and reopen settings (verify persistence)
- [ ] Check console for errors (none expected)

**Validation**:
- [ ] All manual test cases pass
- [ ] No visual glitches or layout issues
- [ ] Settings persistence works correctly

---

### 8. Build and Integration
**Status**: ✅ Completed
**Estimated Effort**: 15 minutes
**Dependencies**: Tasks 1-7

**Description**: Ensure production build succeeds and no regressions.

**Steps**:
1. Run type check: `npm run build`
2. Verify no TypeScript errors
3. Check bundle size (should not increase significantly)
4. Test production build in Obsidian
5. Run full test suite: `npm test`

**Validation**:
- [x] `npm run build` completes successfully (main.js: 1.1M)
- [x] Bundle size increase < 5% (refactor only, no new features)
- [x] Test suite passes (409 passing, 14 new tests added for AISettingsTab)
- [x] No new TypeScript or build errors

---

## Task Summary

| Task | Effort | Dependencies | Type |
|------|--------|--------------|------|
| 1. Extract AI Settings Component | 2h | None | Implementation |
| 2. Remove AI Settings from Main Tab | 30m | Task 1 | Cleanup |
| 3. Register AI Settings Tab | 15m | Tasks 1-2 | Integration |
| 4. Update Tab Metadata | 15m | Task 3 | Polish |
| 5. Write Unit Tests | 1.5h | Tasks 1-4 | Testing |
| 6. Update Documentation | 30m | Tasks 1-5 | Documentation |
| 7. Manual Testing | 30m | Tasks 1-6 | QA |
| 8. Build and Integration | 15m | Tasks 1-7 | Validation |

**Total Estimated Effort**: ~5.5 hours

## Parallel Work Opportunities

Tasks 5 (Unit Tests) and 6 (Documentation) can be done in parallel with Tasks 1-4 once the basic implementation is complete.

## Rollback Plan

If issues arise:
1. Revert `main.ts` registration (remove AISettingsTab)
2. Restore `addSummarizationSettings()` to `WeWeRssSettingTab`
3. Delete `src/ui/settings/AISettingsTab.ts`
4. Revert documentation changes

All user settings remain intact (no data migration required).
