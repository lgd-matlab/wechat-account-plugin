# Spec: AI Settings UI

## Capability
AI Settings User Interface

## Overview
This specification defines the user interface requirements for the dedicated AI Settings tab in the WeWe RSS plugin. The AI Settings tab provides a focused interface for configuring AI-powered summarization features.

---

## ADDED Requirements

### Requirement: AI Settings Tab Registration

The plugin MUST register a separate settings tab specifically for AI-related configuration.

**Rationale**: Improves settings organization and discoverability by separating AI functionality from general plugin settings.

#### Scenario: Plugin loads and registers AI settings tab

**Given** the WeWe RSS plugin is being initialized
**When** the plugin's `onload()` method executes
**Then** an `AISettingsTab` instance MUST be registered with Obsidian
**And** the tab MUST appear in the plugin's settings interface
**And** the tab MUST be labeled "AI Settings" or similar clear identifier

---

### Requirement: AI Enable/Disable Toggle

The AI Settings tab MUST provide a toggle control to enable or disable AI summarization functionality.

**Rationale**: Allows users to turn off AI features without losing their configuration.

#### Scenario: User enables AI summarization

**Given** the AI Settings tab is displayed
**And** AI summarization is currently disabled
**When** the user toggles the "Enable AI Summarization" setting to ON
**Then** the system MUST set `settings.summarizationEnabled` to `true`
**And** the system MUST save the updated settings
**And** additional AI configuration options MUST become visible

#### Scenario: User disables AI summarization

**Given** the AI Settings tab is displayed
**And** AI summarization is currently enabled
**When** the user toggles the "Enable AI Summarization" setting to OFF
**Then** the system MUST set `settings.summarizationEnabled` to `false`
**And** the system MUST save the updated settings
**And** AI configuration options SHOULD be hidden from view

---

### Requirement: AI Provider Selection

When AI summarization is enabled, the tab MUST provide a dropdown to select the AI service provider.

**Rationale**: Supports multiple AI backends to give users flexibility in choosing their preferred service.

#### Scenario: User selects an AI provider

**Given** AI summarization is enabled
**And** the AI Settings tab is displayed
**When** the user selects a provider from the dropdown (e.g., "OpenAI", "Gemini", "Claude")
**Then** the system MUST set `settings.summarizationProvider` to the selected value
**And** the system MUST update `settings.summarizationApiEndpoint` to the provider's default endpoint
**And** the system MUST update `settings.summarizationModel` to the provider's default model
**And** the system MUST save the updated settings
**And** the UI MUST refresh to show the updated endpoint and model values

#### Scenario: Available AI providers

**Given** the AI provider dropdown is displayed
**Then** it MUST include the following options:
  - OpenAI
  - Google Gemini
  - Anthropic Claude
  - DeepSeek
  - Zhipu GLM
  - Generic (OpenAI-compatible)

---

### Requirement: API Credentials Configuration

The tab MUST provide input fields for API credentials specific to the selected provider.

**Rationale**: Different AI providers require authentication via API keys.

#### Scenario: User enters API key

**Given** AI summarization is enabled
**And** the AI Settings tab is displayed
**When** the user enters a value in the "API Key" field
**Then** the system MUST set `settings.summarizationApiKey` to the entered value
**And** the system MUST save the updated settings
**And** the input field MUST mask the key using password-type input (display as dots/asterisks)

#### Scenario: User configures custom API endpoint

**Given** AI summarization is enabled
**And** the AI Settings tab is displayed
**When** the user enters a custom URL in the "API Endpoint" field
**Then** the system MUST set `settings.summarizationApiEndpoint` to the entered value
**And** the system MUST save the updated settings

#### Scenario: User specifies AI model

**Given** AI summarization is enabled
**And** the AI Settings tab is displayed
**When** the user enters a model name in the "Model" field
**Then** the system MUST set `settings.summarizationModel` to the entered value
**And** the system MUST save the updated settings

---

### Requirement: Summary Output Configuration

The tab MUST provide controls for configuring where and when AI summaries are generated.

**Rationale**: Users need control over summary file locations and automation behavior.

#### Scenario: User sets summary folder

**Given** AI summarization is enabled
**And** the AI Settings tab is displayed
**When** the user enters a folder path in the "Summary Folder" field
**Then** the system MUST set `settings.summarizationFolder` to the entered value
**And** the system MUST save the updated settings

#### Scenario: User enables automatic daily summaries

**Given** AI summarization is enabled
**And** the AI Settings tab is displayed
**When** the user toggles "Auto-run Daily" to ON
**Then** the system MUST set `settings.summarizationAutoRun` to `true`
**And** the system MUST save the updated settings
**And** the system MUST register a scheduled task for daily summary generation

#### Scenario: User disables automatic daily summaries

**Given** AI summarization is enabled
**And** automatic daily summaries are currently enabled
**When** the user toggles "Auto-run Daily" to OFF
**Then** the system MUST set `settings.summarizationAutoRun` to `false`
**And** the system MUST save the updated settings
**And** the system MUST unregister the daily summary scheduled task

#### Scenario: User sets schedule time

**Given** AI summarization is enabled
**And** automatic daily summaries are enabled
**When** the user enters a time in "Schedule Time" field (format "HH:MM")
**Then** the system MUST set `settings.summarizationScheduleTime` to the entered value
**And** the system MUST save the updated settings
**And** the system MUST restart the scheduler with the new time

---

### Requirement: Manual Summary Generation

The tab MUST provide a button to manually trigger summary generation for yesterday's articles.

**Rationale**: Users need on-demand control to generate summaries outside of the automatic schedule.

#### Scenario: User manually generates summary

**Given** AI summarization is enabled and properly configured
**And** the AI Settings tab is displayed
**When** the user clicks the "Generate Now" button
**Then** the button MUST change text to "Generating..." and become disabled
**And** the system MUST call `summaryService.generateDailySummary()`
**And** upon completion, a success notice MUST display showing the number of articles summarized
**And** the button MUST return to "Generate Now" and become enabled again

#### Scenario: Manual summary generation fails

**Given** AI summarization is enabled
**And** the AI Settings tab is displayed
**When** the user clicks "Generate Now"
**And** an error occurs during summary generation
**Then** an error notice MUST display with a user-friendly error message
**And** the error MUST be logged to the console
**And** the button MUST return to "Generate Now" and become enabled again

#### Scenario: No articles to summarize

**Given** AI summarization is enabled
**And** the AI Settings tab is displayed
**When** the user clicks "Generate Now"
**And** there are no articles from yesterday
**Then** a notice MUST display "No articles from yesterday to summarize"
**And** the button MUST return to normal state

---

### Requirement: Status Information Display

The tab MUST display relevant status information about AI summarization.

**Rationale**: Users need feedback on when summaries were last generated.

#### Scenario: Display last run timestamp

**Given** AI summarization has been run at least once
**And** the AI Settings tab is displayed
**Then** the tab MUST display the last run timestamp
**And** the timestamp MUST be formatted as a human-readable date and time (e.g., "Last run: 12/25/2024, 1:00:00 AM")

#### Scenario: No previous runs

**Given** AI summarization has never been run
**And** the AI Settings tab is displayed
**Then** no "Last run" information SHOULD be displayed

---

### Requirement: Settings Persistence

All AI settings MUST persist across plugin reloads and Obsidian restarts.

**Rationale**: User configuration must be maintained between sessions.

#### Scenario: Settings survive plugin reload

**Given** a user has configured AI settings
**When** the plugin is disabled and re-enabled
**Then** all AI configuration values MUST be restored to their previous state
**And** no data loss MUST occur

---

### Requirement: Visual Consistency

The AI Settings tab MUST maintain visual consistency with the main WeWe RSS settings tab and Obsidian's design language.

**Rationale**: Provides a cohesive user experience across the plugin interface.

#### Scenario: Consistent styling

**Given** the AI Settings tab is displayed
**Then** it MUST use the same CSS classes as the main settings tab
**And** it MUST follow Obsidian's settings panel layout conventions
**And** header formatting, spacing, and control styles MUST match the main tab

---

### Requirement: Cross-Reference from Main Settings

The main WeWe RSS settings tab MUST provide a reference to the AI Settings tab.

**Rationale**: Helps users discover the new AI Settings location after the separation.

#### Scenario: User sees AI settings reference

**Given** the main WeWe RSS settings tab is displayed
**Then** it MUST include text indicating "AI Summarization settings are in the AI Settings tab"
**Or** it MUST include a similar clear reference to the AI Settings location

---

## MODIFIED Requirements

None. This is a new capability with no modifications to existing specifications.

---

## REMOVED Requirements

None. No existing requirements are being removed.

---

## Dependencies

### Internal Dependencies
- Requires `WeWeRssPlugin` instance for settings access
- Requires `SummaryService` for manual summary generation
- Requires `WeWeRssSettings` interface (no changes needed)

### External Dependencies
- Obsidian's `PluginSettingTab` API
- Obsidian's `Setting` control API
- Obsidian's `Notice` notification API

### Related Capabilities
- **Summary Service**: AI Settings UI configures the SummaryService behavior
- **Task Scheduler**: Auto-run toggle integrates with scheduled task system
- **Main Settings Tab**: Cross-references to AI Settings tab

---

## Testing Requirements

### Unit Tests
- Tab renders without errors when enabled
- Settings toggle shows/hides provider options
- Provider dropdown updates endpoint and model
- API key input is password-masked
- Manual generation button triggers service call
- Last run timestamp displays correctly
- Settings persist on reload

### Integration Tests
- Tab registration in plugin lifecycle
- Settings changes update plugin settings object
- Scheduler integration for auto-run feature
- SummaryService integration for manual generation

### Manual Testing
- Visual appearance matches main settings tab
- All controls respond to user input
- No console errors on tab display
- Settings survive plugin reload

---

## Open Questions

None at this time.

---

## Related Specs

None. This is the first and only spec for this change.
