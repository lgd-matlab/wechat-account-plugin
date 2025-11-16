# WeWe RSS to Obsidian Plugin Conversion Plan

## Project Context

**Original Tool**: WeWe RSS - A WeChat official account RSS subscription service
- Repository: `D:\obsidian-plugin\wechat-account-assemble\wewe-rss`
- Tech Stack: NestJS + React + tRPC + Prisma (MySQL/SQLite)
- Core Features: WeChat account login, feed subscription, RSS generation, auto-updates

**Target**: Obsidian Plugin with embedded backend
- Architecture: Modular embedded backend (Solution 1)
- Database: SQLite (sql.js WASM)
- UI: Sidebar view + command palette
- Integration: Auto-save articles as markdown notes

## Requirements

### Feature Scope (Full Parity)
- ✅ Account management (WeChat Reading login via QR code)
- ✅ Public account subscription via share links
- ✅ Historical article fetching
- ✅ Scheduled auto-updates (cron expressions)
- ✅ Title filtering (include/exclude patterns)
- ✅ Manual update triggers
- ✅ OPML export
- ✅ Multiple feed formats (.atom, .rss, .json)
- ✅ Full-text content output

### Technical Strategy
- **Backend**: Embedded (no external server)
- **Storage**: Local SQLite in vault
- **Content**: Auto-save articles as notes
- **UI**: Sidebar view

## Solution Architecture

```
Obsidian Plugin
├── Frontend Layer (Obsidian UI)
│   ├── Sidebar View (account/feed management)
│   ├── Command Palette (quick actions)
│   └── Settings Tab (configuration)
├── Service Layer (TypeScript)
│   ├── WeChat Reading API Client
│   ├── Feed Generator (RSS/Atom/JSON)
│   ├── Content Parser (Cheerio)
│   └── Scheduler (cron-like updates)
└── Data Layer
    ├── SQLite (embedded via sql.js)
    └── File-based cache
```

## Project Structure

```
obsidian-wewe-rss/
├── src/
│   ├── main.ts                          # Plugin entry point
│   ├── types/
│   │   ├── index.ts                     # Core type definitions
│   │   ├── wewe-rss.ts                  # WeWe RSS data models
│   │   └── obsidian-ext.ts              # Obsidian API extensions
│   ├── services/
│   │   ├── database/
│   │   │   ├── DatabaseService.ts       # SQLite wrapper (sql.js)
│   │   │   ├── migrations/              # Database schema migrations
│   │   │   │   └── 001_initial.sql
│   │   │   └── repositories/
│   │   │       ├── AccountRepository.ts
│   │   │       ├── FeedRepository.ts
│   │   │       └── ArticleRepository.ts
│   │   ├── api/
│   │   │   ├── WeChatApiClient.ts       # WeChat Reading API calls
│   │   │   └── types.ts                 # API request/response types
│   │   ├── feed/
│   │   │   ├── FeedGenerator.ts         # RSS/Atom/JSON generation
│   │   │   └── ContentParser.ts         # HTML parsing (cheerio-like)
│   │   ├── sync/
│   │   │   ├── SyncService.ts           # Background sync orchestrator
│   │   │   └── NoteCreator.ts           # Markdown note generation
│   │   └── scheduler/
│   │       └── TaskScheduler.ts         # Cron-like scheduling
│   ├── ui/
│   │   ├── views/
│   │   │   ├── WeWeRssSidebarView.ts    # Main sidebar view
│   │   │   └── components/
│   │   │       ├── AccountManager.tsx   # Account management UI
│   │   │       ├── FeedList.tsx         # Feed subscription list
│   │   │       ├── ArticlePreview.tsx   # Article preview pane
│   │   │       └── QRCodeModal.tsx      # WeChat login QR code
│   │   ├── modals/
│   │   │   ├── AddFeedModal.ts          # Add feed by share link
│   │   │   └── SettingsModal.ts         # Plugin settings
│   │   └── settings/
│   │       └── WeWeRssSettingTab.ts     # Settings tab
│   ├── utils/
│   │   ├── logger.ts                    # Logging utility
│   │   ├── constants.ts                 # App constants
│   │   └── helpers.ts                   # Helper functions
│   └── lib/
│       ├── sql-js-wrapper.ts            # sql.js initialization
│       └── html-parser.ts               # Lightweight HTML parser
├── styles.css                            # Plugin styles
├── manifest.json                         # Obsidian plugin manifest
├── versions.json                         # Version history
├── package.json                          # Dependencies
├── tsconfig.json                         # TypeScript config
├── esbuild.config.mjs                    # Build config
└── README.md                             # Documentation
```

## Implementation Plan (8 Weeks)

### Phase 1: Project Setup & Core Infrastructure (Week 1)

#### Step 1.1: Initialize Obsidian Plugin Project
- **Files**: `manifest.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`
- **Logic**: Configure TypeScript, esbuild bundler, Obsidian API types
- **Expected Result**: Basic plugin scaffold that loads in Obsidian

#### Step 1.2: Setup Database Layer
- **Files**: `src/services/database/DatabaseService.ts`, `src/lib/sql-js-wrapper.ts`
- **Logic**:
  - Initialize sql.js WebAssembly
  - Create database connection manager
  - Implement file-based persistence to `.obsidian/plugins/wewe-rss/data.db`
- **Expected Result**: Working SQLite database that persists across sessions

#### Step 1.3: Create Database Schema
- **Files**: `src/services/database/migrations/001_initial.sql`
- **Logic**: Define tables for:
  - `accounts` (id, name, cookie, status, created_at)
  - `feeds` (id, feed_id, title, description, account_id, created_at)
  - `articles` (id, feed_id, title, content, url, published_at, synced)
  - `settings` (key, value)
- **Expected Result**: Automated migration system creates tables on first load

#### Step 1.4: Implement Repository Pattern
- **Files**: `AccountRepository.ts`, `FeedRepository.ts`, `ArticleRepository.ts`
- **Logic**: CRUD operations for each entity with TypeScript types
- **Expected Result**: Type-safe database operations

---

### Phase 2: WeChat Reading API Integration (Week 2)

#### Step 2.1: Analyze WeWe RSS API Calls
- **Files**: Review `wewe-rss/apps/server/src/` source code
- **Logic**: Document all WeChat Reading API endpoints, headers, auth
- **Expected Result**: API specification document

#### Step 2.2: Implement API Client
- **Files**: `src/services/api/WeChatApiClient.ts`, `src/services/api/types.ts`
- **Logic**:
  - Use Obsidian's `requestUrl` for HTTP requests
  - Implement login flow (QR code generation)
  - Implement feed search by share link
  - Implement article fetching
  - Handle rate limiting and "小黑屋" (blacklist) detection
- **Expected Result**: Working API client that can authenticate and fetch data

#### Step 2.3: Implement Account Management
- **Files**: `src/services/AccountService.ts`
- **Logic**:
  - Store account cookies securely
  - Track account status (active/disabled/expired/blacklisted)
  - Implement account rotation logic
- **Expected Result**: Multi-account support with status tracking

---

### Phase 3: Feed & Content Management (Week 3)

#### Step 3.1: Implement Feed Subscription
- **Files**: `src/services/FeedService.ts`
- **Logic**:
  - Parse WeChat public account share links
  - Extract feed metadata (title, description, feed_id)
  - Store in database
  - Fetch historical articles
- **Expected Result**: Can subscribe to feeds via share link

#### Step 3.2: Implement Content Parser
- **Files**: `src/services/feed/ContentParser.ts`, `src/lib/html-parser.ts`
- **Logic**:
  - Parse HTML content from articles
  - Clean unnecessary elements (scripts, styles, ads)
  - Convert to clean Markdown
  - Handle images (download or embed as links)
- **Expected Result**: Clean Markdown output from HTML articles

#### Step 3.3: Implement Feed Generator
- **Files**: `src/services/feed/FeedGenerator.ts`
- **Logic**:
  - Generate RSS 2.0 format
  - Generate Atom format
  - Generate JSON Feed format
  - Support title filtering (include/exclude patterns)
- **Expected Result**: RSS/Atom/JSON endpoints compatible with feed readers

---

### Phase 4: Sync & Note Creation (Week 4)

#### Step 4.1: Implement Note Creator
- **Files**: `src/services/sync/NoteCreator.ts`
- **Logic**:
  - Define note template structure
  - Create folder structure (e.g., `WeWe RSS/{Feed Name}/`)
  - Generate frontmatter (title, url, published_at, tags)
  - Write Markdown files using Obsidian Vault API
  - Handle duplicate detection
- **Expected Result**: Articles automatically saved as notes in vault

#### Step 4.2: Implement Sync Service
- **Files**: `src/services/sync/SyncService.ts`
- **Logic**:
  - Orchestrate feed updates
  - Fetch new articles for all active feeds
  - Update database
  - Trigger note creation
  - Handle errors and retries
  - Respect rate limits
- **Expected Result**: Background sync process that updates all feeds

#### Step 4.3: Implement Task Scheduler
- **Files**: `src/services/scheduler/TaskScheduler.ts`
- **Logic**:
  - Parse cron expressions (e.g., `35 5,17 * * *`)
  - Schedule background tasks using `setInterval`
  - Persist next run time to database
  - Implement manual update trigger
- **Expected Result**: Automatic updates at scheduled times

---

### Phase 5: User Interface (Week 5-6)

#### Step 5.1: Create Sidebar View
- **Files**: `src/ui/views/WeWeRssSidebarView.ts`
- **Logic**:
  - Extend `ItemView` class
  - Register view with unique ID
  - Implement `onOpen()` to render UI
  - Add command to open/close sidebar
- **Expected Result**: Sidebar pane appears in Obsidian

#### Step 5.2: Build Account Manager Component
- **Files**: `src/ui/views/components/AccountManager.tsx`
- **Logic**:
  - List all accounts with status indicators
  - Add account button (triggers QR code modal)
  - Enable/disable/delete account actions
  - Show "小黑屋" countdown timer
- **Expected Result**: Visual account management interface

#### Step 5.3: Build Feed List Component
- **Files**: `src/ui/views/components/FeedList.tsx`
- **Logic**:
  - Display subscribed feeds
  - Show article count and last update time
  - Add feed button (triggers modal)
  - Delete/refresh feed actions
- **Expected Result**: Feed subscription management UI

#### Step 5.4: Build Article Preview Component
- **Files**: `src/ui/views/components/ArticlePreview.tsx`
- **Logic**:
  - Show article list for selected feed
  - Display title, excerpt, published date
  - Click to open note in editor
  - Mark as read/unread
- **Expected Result**: Article browsing interface

#### Step 5.5: Create QR Code Modal
- **Files**: `src/ui/views/components/QRCodeModal.tsx`
- **Logic**:
  - Generate WeChat Reading login URL
  - Render QR code using `qrcode` library
  - Poll for login completion
  - Store account cookie on success
- **Expected Result**: WeChat login flow

#### Step 5.6: Create Add Feed Modal
- **Files**: `src/ui/modals/AddFeedModal.ts`
- **Logic**:
  - Input for WeChat share link
  - Parse and validate link
  - Fetch feed metadata
  - Save to database
- **Expected Result**: Add feed dialog

---

### Phase 6: Settings & Commands (Week 7)

#### Step 6.1: Implement Settings Tab
- **Files**: `src/ui/settings/WeWeRssSettingTab.ts`
- **Logic**: Settings for:
  - Database path
  - Sync schedule (cron expression)
  - Note template
  - Folder structure
  - Title filters (include/exclude patterns)
  - Max articles per feed
  - Enable/disable auto-sync
- **Expected Result**: Configurable plugin settings

#### Step 6.2: Add Command Palette Commands
- **Files**: `src/main.ts`
- **Logic**: Register commands:
  - "Open WeWe RSS Sidebar"
  - "Sync All Feeds Now"
  - "Add New Feed"
  - "Add WeChat Account"
  - "Export OPML"
- **Expected Result**: Quick access via Command Palette (Ctrl+P)

#### Step 6.3: Implement OPML Export
- **Files**: `src/services/feed/OpmlExporter.ts`
- **Logic**:
  - Generate OPML XML from all feeds
  - Save to vault as file
  - Include feed metadata
- **Expected Result**: OPML export functionality

---

### Phase 7: Advanced Features (Week 8)

#### Step 7.1: Implement Title Filtering
- **Files**: Update `FeedGenerator.ts` and `SyncService.ts`
- **Logic**:
  - Support regex patterns for include/exclude
  - Filter articles before note creation
  - Apply filters to feed output
- **Expected Result**: Articles filtered by title patterns

#### Step 7.2: Implement Full-Text Mode
- **Files**: Update `ContentParser.ts`
- **Logic**:
  - Fetch full article content (vs. summary)
  - Handle lazy-loaded images
  - Optimize for larger content
- **Expected Result**: Full article content in notes

#### Step 7.3: Add Status Bar Item
- **Files**: `src/main.ts`
- **Logic**:
  - Show sync status (idle/syncing/error)
  - Display last sync time
  - Click to open sidebar
- **Expected Result**: Real-time sync status

---

### Phase 8: Testing & Optimization (Week 8)

#### Step 8.1: Error Handling
- **Files**: All service files
- **Logic**:
  - Add try-catch blocks
  - Implement retry logic for API calls
  - Show user-friendly error notices
  - Log errors to console
- **Expected Result**: Graceful error handling

#### Step 8.2: Performance Optimization
- **Files**: `SyncService.ts`, `DatabaseService.ts`
- **Logic**:
  - Batch database writes
  - Implement request queuing for API calls
  - Add rate limiting (60 req/min)
  - Cache parsed content
- **Expected Result**: Smooth background sync without UI blocking

#### Step 8.3: Build & Bundle Optimization
- **Files**: `esbuild.config.mjs`
- **Logic**:
  - Bundle sql.js WASM
  - Minify code
  - Tree-shake unused dependencies
  - Target plugin size <10MB
- **Expected Result**: Optimized production build

## Technical Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "obsidian": "latest",           // Obsidian API (provided)
    "sql.js": "^1.10.3",            // SQLite WASM
    "cheerio": "^1.0.0-rc.12",      // HTML parsing
    "feed": "^4.2.2",               // RSS/Atom/JSON generation
    "dayjs": "^1.11.10",            // Date handling
    "axios": "^1.7.0",              // HTTP client
    "qrcode": "^1.5.3",             // QR code generation
    "fast-xml-parser": "^4.3.6"     // XML parsing for OPML
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.0",
    "esbuild": "^0.20.0",
    "obsidian-plugin-cli": "^1.0.0"
  }
}
```

## Technical Challenges & Mitigations

1. **sql.js Size**: ~1.5MB WASM file
   - **Mitigation**: Lazy load on first use, cache in IndexedDB

2. **WeChat API Rate Limits**: Risk of account blacklisting
   - **Mitigation**: Implement request queue, delay between updates, respect 60s delay

3. **Background Processing**: Avoid blocking UI
   - **Mitigation**: Use async/await, batch operations, show progress indicators

4. **Note Duplication**: Same article saved multiple times
   - **Mitigation**: Check existing notes by URL/title before creating

5. **Cross-Platform**: Desktop vs Mobile Obsidian
   - **Mitigation**: Initially target desktop, mobile as Phase 2

## Success Criteria

- ✅ Plugin loads successfully in Obsidian
- ✅ Can add WeChat Reading accounts via QR code
- ✅ Can subscribe to public accounts via share link
- ✅ Articles sync automatically on schedule
- ✅ Notes created in vault with proper formatting
- ✅ Sidebar UI shows accounts, feeds, articles
- ✅ Settings configurable via Settings tab
- ✅ OPML export works
- ✅ Title filtering works
- ✅ No UI blocking during sync
- ✅ Plugin size < 10MB

---

**Status**: Approved for execution
**Date**: 2025-11-16
**Timeline**: 8 weeks
