# WeWe RSS for Obsidian - Project Specification

## Overview

**Project Name**: WeWe RSS for Obsidian
**Version**: 0.1.1
**Type**: Obsidian Plugin
**License**: MIT

WeWe RSS for Obsidian is a powerful plugin that brings WeChat public account subscriptions directly into Obsidian. Unlike traditional RSS readers, this plugin embeds the entire WeWe RSS backend into Obsidian using SQLite (sql.js) for local data persistence, eliminating the need for external servers.

## Architecture

### Technology Stack

- **Runtime**: Obsidian (Electron + Chromium)
- **Language**: TypeScript 5.3+
- **Database**: SQLite via sql.js (WebAssembly)
- **Build**: esbuild
- **Testing**: Jest with ts-jest (390 passing tests)
- **HTTP Client**: Obsidian's requestUrl API (CORS-friendly)
- **HTML Parsing**: Cheerio
- **QR Code**: node-qrcode library

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Obsidian Plugin                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              UI Layer (Electron DOM)                  │  │
│  │  - Sidebar View   - Settings Tab   - Modal Dialogs   │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Service Layer                            │  │
│  │  - SyncService    - AccountService  - FeedService    │  │
│  │  - NoteCreator    - TaskScheduler   - SummaryService │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Data & Integration Layer                    │  │
│  │  - DatabaseService (SQLite/sql.js)                   │  │
│  │  - WeChatApiClient (WeChat Reading API)              │  │
│  │  - ContentParser (HTML → Markdown)                   │  │
│  │  - AI Clients (OpenAI, Gemini, Claude, etc.)        │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Storage Layer                            │  │
│  │  - SQLite Database (.db file)                        │  │
│  │  - Markdown Notes (Obsidian Vault)                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕
         External WeChat Reading API (weread.111965.xyz)
```

## Core Components

### Services

1. **AccountService**: Manage WeChat Reading accounts (login, status, blacklist handling)
2. **FeedService**: Subscribe to WeChat public accounts and fetch articles
3. **SyncService**: Orchestrate automated synchronization of feeds and note creation
4. **NoteCreator**: Convert articles to Markdown notes using templates
5. **TaskScheduler**: Execute recurring background tasks (auto-sync, blacklist checks)
6. **SummaryService**: Generate AI-powered daily article summaries
7. **DatabaseService**: SQLite database abstraction layer

### UI Components

1. **WeWeRssSidebarView**: Main interface for viewing feeds and articles
2. **AddAccountModal**: WeChat Reading login via QR code
3. **AddFeedModal**: Subscribe to WeChat public account
4. **WeWeRssSettingTab**: Plugin configuration interface
5. **CleanupArticlesModal**: Interactive cleanup modal with note deletion

### Data Layer

1. **AccountRepository**: CRUD operations for WeChat accounts
2. **FeedRepository**: CRUD operations for subscribed feeds
3. **ArticleRepository**: CRUD operations for downloaded articles

### AI Integration

1. **AIClientFactory**: Factory for creating AI client instances
2. **AIApiClient**: Base interface for AI providers
3. **Providers**:
   - OpenAIClient (OpenAI GPT)
   - GeminiClient (Google Gemini)
   - ClaudeClient (Anthropic Claude)
   - DeepSeekClient (DeepSeek)
   - GLMClient (Zhipu GLM)

## Domain Model

### Core Entities

**Account**
```typescript
{
  id: number;
  name: string;
  cookie: string;  // JSON: {vid, token}
  status: 'active' | 'disabled' | 'expired' | 'blacklisted';
  blacklistedUntil?: number;
  createdAt: number;
  updatedAt: number;
}
```

**Feed**
```typescript
{
  id: number;
  feedId: string;  // WeChat MP ID
  title: string;
  description: string;
  accountId: number;
  lastSyncAt?: number;
  createdAt: number;
  updatedAt: number;
}
```

**Article**
```typescript
{
  id: number;
  feedId: number;
  title: string;
  content: string;         // Markdown
  contentHtml: string;     // Original HTML
  url: string;
  publishedAt: number;
  synced: boolean;         // Note created?
  noteId?: string;         // Path to note
  createdAt: number;
}
```

## Current Features

### WeChat Integration
- QR code authentication for WeChat Reading accounts
- Subscribe to WeChat public accounts via share links
- Automatic article synchronization on schedule
- Support for multiple accounts with blacklist protection

### Content Management
- HTML to Markdown conversion
- Customizable note templates
- Title filtering with regex patterns
- Configurable retention policies (5-day sync filter default, 30-day article retention)
- Interactive cleanup with note deletion

### Database Features
- SQLite-based local persistence
- Automatic backups before initialization and migrations
- Configurable backup retention (1-30 days)
- Manual backup creation
- Database health monitoring

### AI Summarization (Current Implementation)
- Daily summaries of yesterday's articles
- Support for multiple AI providers:
  - OpenAI (gpt-3.5-turbo, gpt-4)
  - Google Gemini (gemini-pro)
  - Anthropic Claude (claude-3-haiku)
  - DeepSeek (deepseek-chat)
  - Zhipu GLM (glm-4)
  - Generic OpenAI-compatible APIs
- Automatic scheduling with configurable time
- Manual summary generation
- Article-by-article summarization
- Summary output to markdown files

### Current Settings Organization

Settings are organized across two dedicated tabs:

**WeWe RSS - General Settings Tab**:
1. Account Management
2. Sync Settings
3. Note Settings
4. Content Settings
5. Title Filtering
6. API Settings
7. Database Backup
8. Advanced Settings

**WeWe RSS - AI Settings Tab** (NEW - as of 2025-11-19):
1. AI Summarization Enable/Disable
2. AI Provider Selection (OpenAI, Gemini, Claude, DeepSeek, GLM, Generic)
3. API Configuration (Key, Endpoint, Model)
4. Summary Configuration (Folder, Schedule, Auto-run)
5. Manual Summary Generation

## Known Limitations

1. ~~AI settings are embedded in the main settings tab (becoming crowded)~~ **RESOLVED** - Moved to dedicated AI Settings tab (2025-11-19)
2. ~~No separate AI configuration interface~~ **RESOLVED** - Created AISettingsTab (2025-11-19)
3. ~~Limited visibility for AI-related features~~ **RESOLVED** - Dedicated tab improves discoverability (2025-11-19)
4. ~~Settings tab is becoming too long and complex~~ **RESOLVED** - Split into two tabs (2025-11-19)

## Testing Strategy

- **Total Tests**: 390 (100% passing)
- **Coverage**: 70-100% across modules
- Test framework: Jest with ts-jest
- Mock infrastructure for Obsidian API and external services

## Build and Development

```bash
# Development build (watch mode)
npm run dev

# Production build
npm run build

# Run all tests
npm test

# Generate coverage report
npm run test:coverage
```

## Dependencies

### Runtime Dependencies
- cheerio: HTML parsing
- dayjs: Date manipulation
- fast-xml-parser: XML parsing
- feed: RSS feed generation
- qrcode: QR code generation
- sql.js: SQLite WebAssembly

### Development Dependencies
- TypeScript 5.3.3
- esbuild
- Jest + ts-jest
- ESLint with TypeScript support

## Configuration Files

- `tsconfig.json`: TypeScript compiler configuration
- `jest.config.js`: Test framework configuration
- `esbuild.config.mjs`: Build system configuration
- `manifest.json`: Obsidian plugin manifest
- `.gitignore`: Version control exclusions

## Future Considerations

The current architecture supports extension through:
- New AI providers via AIClientFactory
- Additional repository patterns for new entities
- Custom modal dialogs for specialized workflows
- Extended settings interfaces for feature-specific configuration
