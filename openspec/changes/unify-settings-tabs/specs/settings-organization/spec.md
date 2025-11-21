# Capability: Unified Settings Tab Organization

## Overview

**Capability**: Unified Settings Tab Organization
**Domain**: UI / Settings
**Status**: Proposed

Provide a single, well-organized settings interface for the WeWe RSS plugin with clear navigation between General and AI settings sections.

---

## REMOVED Requirements

### Requirement: Separate AI Settings Tab

The system SHALL NOT register a separate settings tab for AI configuration.

#### Scenario: Settings Sidebar Shows Single Entry

**Given** the WeWe RSS plugin is installed and enabled
**When** the user opens Obsidian Settings
**And** navigates to the Community Plugins section
**Then** only ONE "WeWe RSS" entry should appear in the settings sidebar
**And** there should be NO duplicate "WeWe RSS" entries

---

## ADDED Requirements

### Requirement: Tab-Based Navigation Within Settings

The system MUST provide tab-based navigation within a single settings interface to organize General and AI settings.

#### Scenario: Switch Between General and AI Settings

**Given** the user has opened WeWe RSS settings
**When** the settings page loads
**Then** a tab navigation bar should be visible at the top
**And** the navigation bar should contain "General" and "AI Settings" tabs
**And** the "General" tab should be active by default
**When** the user clicks the "AI Settings" tab
**Then** the content area should switch to display AI-related settings
**And** the "AI Settings" tab should become visually active
**And** the "General" tab should become visually inactive
**When** the user clicks the "General" tab again
**Then** the content area should switch back to general settings
**And** tab switching should occur instantly without page reload

---

### Requirement: Content Organization by Tab

The system MUST organize settings content based on the active tab selection.

#### Scenario: General Tab Shows Core Settings

**Given** the user is viewing WeWe RSS settings
**And** the "General" tab is active
**Then** the following sections should be visible:
- Account Management
- Sync Settings
- Note Settings
- Content Settings
- Title Filtering
- API Settings
- Database Backup
- Advanced Settings
**And** AI-related settings should NOT be visible

#### Scenario: AI Tab Shows AI Configuration

**Given** the user is viewing WeWe RSS settings
**And** the "AI Settings" tab is active
**Then** the following sections should be visible:
- AI Summarization Enable/Disable
- AI Provider Selection
- API Configuration (API Key, Endpoint, Model)
- Summary Configuration
- Manual Summary Generation
**And** general settings should NOT be visible

---

### Requirement: Visual Tab Distinction

The system MUST provide clear visual feedback for active and inactive tab states.

#### Scenario: Active Tab Styling

**Given** a tab is currently active
**Then** the tab button should have a distinct active state style
**And** the active state should include a colored bottom border or background
**And** the styling should follow Obsidian's theme variables

#### Scenario: Inactive Tab Styling

**Given** a tab is not currently active
**Then** the tab button should have a muted appearance
**And** hovering over the inactive tab should provide visual feedback
**And** the tab should remain clickable

---

## MODIFIED Requirements

### Requirement: Settings Tab Registration

The plugin MUST register exactly ONE settings tab with Obsidian.

#### Scenario: Single Tab Registration

**Given** the WeWe RSS plugin is loading
**When** the plugin registers settings tabs
**Then** exactly one `PluginSettingTab` instance should be created
**And** the tab should be registered via `addSettingTab()`
**And** NO additional settings tabs should be registered
**And** the single tab should contain both General and AI settings

---

## Implementation Notes

### Key Files
- `src/main.ts` (lines 136-137) - Tab registration
- `src/ui/settings/WeWeRssSettingTab.ts` - Unified settings tab
- `src/ui/settings/AISettingsTab.ts` - **TO BE DELETED**
- `styles.css` - Tab navigation styles

### Navigation State Management
```typescript
private currentTab: 'general' | 'ai' = 'general';

private switchTab(tab: 'general' | 'ai'): void {
    this.currentTab = tab;
    this.display(); // Re-render
}
```

### DOM Structure
```html
<div class="wewe-rss-settings">
  <div class="wewe-rss-tab-navigation">
    <button class="wewe-rss-tab-button active">General</button>
    <button class="wewe-rss-tab-button">AI Settings</button>
  </div>
  <div class="wewe-rss-tab-content">
    <!-- Content based on currentTab -->
  </div>
</div>
```

### Acceptance Criteria
- [ ] Only one "WeWe RSS" in Obsidian settings sidebar
- [ ] Tab navigation visible and functional
- [ ] All General settings accessible via General tab
- [ ] All AI settings accessible via AI Settings tab
- [ ] Tab switching is instant and smooth
- [ ] Active tab visually distinct from inactive tabs
- [ ] No functionality lost from previous two-tab approach
- [ ] Settings save correctly regardless of active tab
