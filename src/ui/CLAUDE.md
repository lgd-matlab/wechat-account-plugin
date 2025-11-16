[Root Directory](../../CLAUDE.md) > [src](../) > **ui**

# UI Module

## Change Log (Changelog)

### 2025-11-16 21:32:07
- Initial documentation for UI module
- Documented all views, modals, and settings components
- Obsidian API usage patterns

---

## Module Responsibilities

The UI module provides **user interface components** for the WeWe RSS plugin:

1. **Views**: Sidebar panel for feed/article management
2. **Modals**: Dialog boxes for account login and feed subscription
3. **Settings**: Plugin configuration interface

**Framework**: Obsidian's custom UI framework (extends HTMLElement, Modal, etc.)

---

## Entry and Startup

UI components are registered in `main.ts`:

```typescript
async onload() {
  // Register sidebar view
  this.registerView(
    VIEW_TYPE_WEWE_RSS,
    (leaf) => new WeWeRssSidebarView(leaf, this)
  );

  // Add ribbon icon to open sidebar
  this.addRibbonIcon('rss', 'WeWe RSS', () => {
    this.activateView();
  });

  // Register settings tab
  this.addSettingTab(new WeWeRssSettingTab(this.app, this));
}
```

**User Activation**:
- Click RSS icon in ribbon
- Command palette: "WeWe RSS: Open Sidebar"
- Settings: Plugin settings tab auto-registered

---

## External Interfaces

### WeWeRssSidebarView

**Purpose**: Main interface for viewing feeds and articles

**Location**: Right sidebar (docked panel)

**View Type**: `VIEW_TYPE_WEWE_RSS = 'wewe-rss-sidebar'`

#### Key Methods

```typescript
class WeWeRssSidebarView extends ItemView {
  // Lifecycle
  onload(): void              // Build DOM
  onClose(): Promise<void>    // Cleanup

  // View metadata
  getViewType(): string       // Return 'wewe-rss-sidebar'
  getDisplayText(): string    // Return 'WeWe RSS'
  getIcon(): string           // Return 'rss'

  // Rendering
  private renderStats(): void         // Stats bar (feeds, articles, sync time)
  private renderFeedsList(): void     // Feed cards
  private renderArticlesList(): void  // Article list
  private renderEmpty(): void         // Empty state
}
```

#### UI Structure

```
┌─────────────────────────────────────┐
│ WeWe RSS                        [X] │  ← Header
├─────────────────────────────────────┤
│ Stats Bar:                          │
│ 🔢 5 Feeds | 📄 23 Articles        │
│ ⏱️ Last sync: 2 mins ago           │
├─────────────────────────────────────┤
│ [+ Account] [+ Feed] [⟳ Sync]     │  ← Actions
├─────────────────────────────────────┤
│ Feeds:                              │
│ ┌─────────────────────────────────┐ │
│ │ 📰 Tech Blog        (5 articles)│ │
│ │ 📰 News Feed        (12 articles│ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Recent Articles:                    │
│ • Article Title 1    [2h ago]      │
│ • Article Title 2    [5h ago]      │
│ • Article Title 3    [1d ago]      │
└─────────────────────────────────────┘
```

**User Interactions**:
- Click "+ Account" → Opens AddAccountModal
- Click "+ Feed" → Opens AddFeedModal
- Click "⟳ Sync" → Triggers manual sync
- Click article → Creates note and opens it

---

### AddAccountModal

**Purpose**: WeChat Reading login via QR code

**Extends**: `Modal` (Obsidian base class)

#### Workflow

```typescript
class AddAccountModal extends Modal {
  onOpen(): void {
    // 1. Call apiClient.createLoginUrl()
    // 2. Display QR code image
    // 3. Start long-polling apiClient.getLoginResult()
    // 4. On success: save account, close modal
  }
}
```

#### UI Elements

```
┌─────────────────────────────────┐
│ Add WeChat Account          [X] │
├─────────────────────────────────┤
│ Scan QR Code with WeChat:      │
│                                 │
│    ┌─────────────┐              │
│    │  QR CODE    │              │
│    │   IMAGE     │              │
│    └─────────────┘              │
│                                 │
│ Status: Waiting for scan...     │
│                                 │
│        [Cancel]                 │
└─────────────────────────────────┘
```

**Auto-Close**: Modal closes on successful login or timeout

---

### AddFeedModal

**Purpose**: Subscribe to WeChat public account

**Extends**: `Modal`

#### Workflow

```typescript
class AddFeedModal extends Modal {
  onOpen(): void {
    // 1. Show input for WeChat share link
    // 2. Call apiClient.getMpInfo(link)
    // 3. Display feed preview
    // 4. On confirm: feedService.subscribeFeed()
  }
}
```

#### UI Elements

```
┌─────────────────────────────────┐
│ Add Feed                    [X] │
├─────────────────────────────────┤
│ WeChat Share Link:              │
│ ┌─────────────────────────────┐ │
│ │ https://mp.weixin.qq.com/...│ │
│ └─────────────────────────────┘ │
│                                 │
│ Feed Preview:                   │
│ Name: Tech Blog                 │
│ Description: Latest tech news   │
│                                 │
│ ☑ Fetch historical articles    │
│                                 │
│   [Cancel]      [Subscribe]     │
└─────────────────────────────────┘
```

---

### WeWeRssSettingTab

**Purpose**: Plugin configuration interface

**Extends**: `PluginSettingTab`

#### Settings Sections

**1. Sync Settings**
- Auto Sync (toggle)
- Sync Interval (number input, minutes)
- Update Delay (number input, seconds)
- Max Articles Per Feed (number input)

**2. Note Settings**
- Note Folder (text input, path)
- Note Template (textarea, Markdown template)
- Add Tags (toggle)

**3. Content Settings**
- Feed Mode (dropdown: summary/fulltext)
- Enable Clean HTML (toggle)

**4. Advanced**
- Platform URL (text input)
- Title Include Patterns (text area, regex list)
- Title Exclude Patterns (text area, regex list)

#### Pattern

```typescript
class WeWeRssSettingTab extends PluginSettingTab {
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Add settings
    new Setting(containerEl)
      .setName('Auto Sync')
      .setDesc('Enable automatic feed synchronization')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSync)
        .onChange(async (value) => {
          this.plugin.settings.autoSync = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
```

---

## Key Dependencies and Configuration

### Obsidian UI APIs

**Base Classes**:
- `ItemView` - For custom views (sidebar panels)
- `Modal` - For dialog boxes
- `PluginSettingTab` - For settings interface

**Utilities**:
- `Setting` - Fluent API for form controls
- `setIcon()` - Add icons to elements
- `Notice` - Toast notifications

**Styling**:
- Uses Obsidian's CSS variables
- No custom CSS required (follows theme)

### Component Dependencies

All UI components depend on:
- `WeWeRssPlugin` instance
- Services (via `plugin.accountService`, `plugin.syncService`, etc.)

---

## Data Models

### View State

UI components are **stateless** - they query services on each render:

```typescript
// No internal state
class WeWeRssSidebarView {
  private renderStats(): void {
    // Query live data every time
    const feeds = this.plugin.databaseService.feeds.findAll();
    const articles = this.plugin.databaseService.articles.findAll();
    // Update DOM
  }
}
```

**Why?**
- Services hold source of truth
- UI always shows latest data
- No sync issues between UI and data

---

## Testing and Quality

### Test Coverage

**75% coverage** (UI components partially tested)

**Challenges**:
- Obsidian API mocking complex
- DOM manipulation hard to unit test
- Focus on integration testing

### Test Strategy

**Mock Obsidian APIs**:
```typescript
// src/__tests__/mocks/obsidian.ts
export class Modal {
  open() {}
  close() {}
  onOpen() {}
}

export class ItemView {
  containerEl = document.createElement('div');
  leaf = {};
}
```

**Future Improvement**: E2E tests with Electron

---

## Frequently Asked Questions (FAQ)

### Q: How do I add a new setting?

**Steps**:
1. Add field to `WeWeRssSettings` interface in `src/types/index.ts`
2. Add default value to `DEFAULT_SETTINGS`
3. Add UI control in `WeWeRssSettingTab.display()`

**Example**:
```typescript
// types/index.ts
export interface WeWeRssSettings {
  // ...existing fields...
  newSetting: boolean;
}

// WeWeRssSettingTab.ts
new Setting(containerEl)
  .setName('New Setting')
  .setDesc('Description here')
  .addToggle(toggle => toggle
    .setValue(this.plugin.settings.newSetting)
    .onChange(async (value) => {
      this.plugin.settings.newSetting = value;
      await this.plugin.saveSettings();
    })
  );
```

### Q: How do I refresh the sidebar view?

**Pattern**:
```typescript
// Trigger re-render
this.renderStats();
this.renderFeedsList();
this.renderArticlesList();
```

**Or** force full reload:
```typescript
const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_WEWE_RSS);
leaves.forEach(leaf => leaf.detach());
await this.plugin.activateView(); // Re-open
```

### Q: How do I show loading states?

**Use Obsidian's Notice**:
```typescript
import { Notice } from 'obsidian';

const notice = new Notice('Syncing...', 0); // 0 = infinite
try {
  await syncService.syncAll();
  notice.hide();
  new Notice('Sync complete!');
} catch (error) {
  notice.hide();
  new Notice('Sync failed: ' + error.message);
}
```

### Q: Can I use React/Vue for UI?

**Technically yes**, but:
- Increases bundle size significantly
- Obsidian's API designed for vanilla JS
- Community convention is vanilla

**Alternative**: Use Web Components or lit-html for complex UIs

---

## Related File List

### Core Files
- `src/ui/views/WeWeRssSidebarView.ts` (~400 lines)
- `src/ui/modals/AddAccountModal.ts` (~200 lines)
- `src/ui/modals/AddFeedModal.ts` (~250 lines)
- `src/ui/settings/WeWeRssSettingTab.ts` (~350 lines)

### Styles
- `styles.css` (minimal custom styles)

### Mocks
- `src/__tests__/mocks/obsidian.ts` - Obsidian API mocks

### Related
- `src/main.ts` - UI registration
- `src/types/index.ts` - Settings interface

---

**Last Updated**: 2025-11-16 21:32:07
