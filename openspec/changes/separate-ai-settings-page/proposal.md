# Proposal: Separate AI Settings Page

## Change ID
`separate-ai-settings-page`

## Status
✅ **Implemented** (2025-11-19)

## Overview

Refactor the AI Summarization settings from the main settings tab into a dedicated, separate settings page to improve user experience, reduce settings complexity, and provide better organization for AI-related features.

## Motivation

### Current Problems

1. **Settings Tab Overcrowding**: The main `WeWeRssSettingTab` is becoming increasingly long and complex (762 lines), with 9 distinct sections making it difficult for users to navigate.

2. **Poor Feature Visibility**: AI summarization functionality (lines 558-728) is buried in the middle of the settings tab, reducing discoverability for users interested in AI features.

3. **Lack of Modularity**: AI-specific settings are tightly coupled with general plugin settings, making it harder to maintain and extend AI capabilities independently.

4. **Scalability Issues**: As more AI providers and features are added, the single settings tab will become even more unwieldy.

### Proposed Solution

Create a dedicated "AI Settings" tab that:
- Provides a focused interface for all AI-related configuration
- Improves discoverability and user experience
- Allows for future AI feature expansion without cluttering the main settings
- Maintains consistency with Obsidian's multi-tab settings pattern

## Scope

### In Scope

1. **New UI Component**: `AISettingsTab` extending `PluginSettingTab`
2. **Settings Migration**: Move AI-related settings from main tab to dedicated tab
3. **Registration**: Register new settings tab in `main.ts`
4. **Testing**: Unit tests for new settings tab component
5. **User Experience**: Smooth migration with no data loss

### Out of Scope

1. **New AI Features**: No new AI providers or summarization capabilities
2. **Settings Schema Changes**: Existing `WeWeRssSettings` interface remains unchanged
3. **AI Service Logic**: `SummaryService` and AI clients remain untouched
4. **Database Changes**: No schema modifications

## Design Decisions

### Multi-Tab Approach

**Rationale**: Obsidian supports multiple plugin setting tabs (see core plugins like "Files & Links", "Appearance", etc.). This is the native pattern for organizing complex settings.

**Implementation**:
```typescript
// main.ts
this.addSettingTab(new WeWeRssSettingTab(this.app, this));
this.addSettingTab(new AISettingsTab(this.app, this));
```

### Code Organization

**New File**: `src/ui/settings/AISettingsTab.ts`

**Responsibilities**:
- AI provider selection (OpenAI, Gemini, Claude, DeepSeek, GLM, Generic)
- API credentials (key, endpoint, model)
- Summarization configuration (folder, schedule, auto-run)
- Manual summary generation
- Status display (last run timestamp)

**Shared Logic**: Helper methods (`getDefaultEndpoint`, `getDefaultModel`) will be extracted to a shared utility module if needed.

### Backwards Compatibility

**Data Migration**: None required - settings keys remain unchanged.

**User Impact**:
- Existing users will see a new "WeWe RSS - AI" tab appear
- No configuration loss or reset
- Existing workflows continue to function

## Implementation Plan

See [tasks.md](./tasks.md) for detailed work items.

## Risks and Mitigations

### Risk: User Confusion

**Description**: Users accustomed to all settings in one tab may not find AI settings.

**Mitigation**:
1. Add cross-reference in main settings tab: "AI Summarization settings have moved to the AI tab"
2. Clear tab naming: "WeWe RSS - General" and "WeWe RSS - AI"

### Risk: Code Duplication

**Description**: Helper methods might be duplicated between settings tabs.

**Mitigation**: Extract shared utilities to `src/ui/settings/settingsHelpers.ts` if duplication exceeds 3 methods.

### Risk: Testing Coverage Drop

**Description**: New UI component without tests could reduce overall coverage.

**Mitigation**: Include UI component tests in tasks, targeting 75%+ coverage consistent with existing UI module.

## Success Criteria

1. **Functional**: AI summarization works identically before and after refactor
2. **Usability**: Users can find AI settings in < 10 seconds (informal testing)
3. **Code Quality**: No increase in cyclomatic complexity; improved separation of concerns
4. **Test Coverage**: UI module maintains 75%+ coverage
5. **Build**: No TypeScript errors, successful production build
6. **Documentation**: Updated CLAUDE.md files reflect new architecture

## Dependencies

### Depends On
- None (standalone refactor)

### Blocks
- Future AI feature additions will benefit from dedicated settings page

## Related Changes

- None currently

## Questions and Open Issues

1. **Tab Naming**: Should we use "AI Settings" or "AI Summarization" as the tab name?
   - **Recommendation**: "AI Settings" for future extensibility

2. **Icon**: Should the AI tab have a distinct icon?
   - **Recommendation**: Use "bot" or "sparkles" icon to differentiate from main tab

3. **Settings Order**: Should AI tab appear before or after main tab?
   - **Recommendation**: After main tab (main settings are more frequently accessed)

## References

- Current implementation: `src/ui/settings/WeWeRssSettingTab.ts:558-728`
- AI service: `src/services/SummaryService.ts`
- AI providers: `src/services/ai/providers/*.ts`
- Settings types: `src/types/index.ts:38-48`
- Project documentation: `CLAUDE.md`
