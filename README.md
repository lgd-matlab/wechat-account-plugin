# WeWe RSS for Obsidian

Subscribe to WeChat public accounts and automatically sync articles as markdown notes in Obsidian.

## Features

- 🔐 **WeChat Account Management**: QR code login for WeChat Reading accounts
- 📰 **Feed Subscription**: Subscribe to WeChat public accounts via share links
- 📅 **Automatic Sync**: Scheduled synchronization with customizable intervals
- 📝 **Note Creation**: Auto-convert articles to markdown notes with templates
- 🎨 **Modern UI**: Sidebar view for feed and article management
- 🔍 **Title Filtering**: Include/exclude articles by regex patterns
- 📊 **Real-time Stats**: Track feeds, articles, and sync status
- 🚀 **Embedded Backend**: No external server required - runs entirely in Obsidian
- 💾 **SQLite Database**: Efficient local storage with sql.js

## Installation

### Manual Installation (Recommended)

1. Download the latest release from GitHub
2. Extract `main.js`, `manifest.json`, and `styles.css` to:
   ```
   <your-vault>/.obsidian/plugins/wewe-rss/
   ```
3. Reload Obsidian (Ctrl+R or Cmd+R)
4. Enable the plugin in Settings → Community Plugins

### From Community Plugins

Coming soon to the official Obsidian Community Plugins directory.

## Quick Start

### 1. Add a WeChat Account

1. Open the WeWe RSS sidebar (click RSS icon or use command palette)
2. Click **"+ Account"** button
3. Scan the QR code with WeChat app
4. Authorize the login on your phone
5. Your account will be added automatically

### 2. Subscribe to a Feed

1. In the WeWe RSS sidebar, click **"+ Feed"**
2. Get the share link:
   - Open WeChat app
   - Find the public account you want to follow
   - Tap "⋯" menu → "Share"
   - Copy the share link
3. Paste the link in the modal
4. Click **"Subscribe"**
5. Optionally fetch historical articles

### 3. Sync and Create Notes

**Automatic Sync:**
- Runs every hour by default (configurable in settings)
- Downloads new articles and creates notes automatically

**Manual Sync:**
- Click **"⟳ Sync"** in the sidebar
- Or use command: `WeWe RSS: Sync All Feeds Now`

**Create Individual Notes:**
- Click any unsynced article in the sidebar
- Note will be created and opened automatically

## Usage

### Sidebar View

Open the sidebar by:
- Clicking the RSS icon in the ribbon
- Command palette: `WeWe RSS: Open Sidebar`

The sidebar shows:
- **Stats Bar**: Feed count, article count, unsynced articles, last sync time
- **Feeds List**: All subscribed feeds with article counts
- **Articles List**: Recent articles (click to filter by feed)

### Commands

Access via Command Palette (Ctrl/Cmd + P):

- `WeWe RSS: Open Sidebar` - Open the sidebar view
- `WeWe RSS: Add WeChat Account` - Add a new account via QR code
- `WeWe RSS: Add New Feed` - Subscribe to a new feed
- `WeWe RSS: Sync All Feeds Now` - Trigger manual sync

### Article Organization

Articles are organized as:
```
<Note Folder>/
  <Feed Name>/
    <Article Title>.md
    ...
```

Default note location: `WeWe RSS/`

### Note Template

Customize the note template in Settings. Available variables:

- `{{title}}` - Article title
- `{{feedName}}` - Feed name
- `{{author}}` - Author name
- `{{publishedAt}}` - Publication date
- `{{url}}` - Original article URL
- `{{date}}` - Current date
- `{{tags}}` - Auto-generated tags
- `{{content}}` - Article content (markdown)

## Configuration

Open **Settings → WeWe RSS** to configure:

### Sync Settings

- **Auto Sync**: Enable/disable automatic synchronization
- **Sync Interval**: How often to sync (in minutes, default: 60)
- **Update Delay**: Delay between feed requests (seconds, default: 60)
- **Max Articles Per Feed**: Maximum articles to fetch per feed (default: 100)

### Note Settings

- **Note Folder**: Where to save article notes (default: `WeWe RSS`)
- **Note Template**: Customize the markdown template
- **Add Tags**: Auto-add tags to notes

### Content Settings

- **Feed Mode**: Summary or full-text content
- **Enable Clean HTML**: Remove scripts and styles from HTML

### Title Filtering

- **Include Patterns**: Regex patterns to include (empty = include all)
- **Exclude Patterns**: Regex patterns to exclude

Example: Exclude articles with "广告" (advertisement):
```
Exclude Patterns: ["广告", "推广"]
```

## Architecture

This plugin embeds the WeWe RSS backend directly into Obsidian:

- **Database**: SQLite via sql.js (WebAssembly)
- **Storage**: `.obsidian/plugins/wewe-rss/wewe-rss.db`
- **API Client**: Uses Obsidian's requestUrl for CORS-free requests
- **Scheduler**: Built-in task scheduler for automated sync
- **No Server**: Everything runs client-side in Obsidian

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Type check
npm run build -- production
```

### Project Structure

```
src/
├── main.ts                    # Plugin entry point
├── types/                     # TypeScript type definitions
├── services/
│   ├── database/             # SQLite database layer
│   ├── api/                  # WeChat API client
│   ├── AccountService.ts     # Account management
│   ├── FeedService.ts        # Feed subscription
│   ├── SyncService.ts        # Sync orchestrator
│   ├── NoteCreator.ts        # Note generation
│   └── TaskScheduler.ts      # Automated tasks
├── ui/
│   ├── views/                # Sidebar view
│   ├── modals/               # QR code & add feed modals
│   └── settings/             # Settings tab
└── utils/                    # Helpers and utilities
```

### Database Schema

Tables:
- `accounts` - WeChat Reading accounts
- `feeds` - Subscribed public accounts
- `articles` - Downloaded articles
- `migrations` - Schema version tracking

## Troubleshooting

### Sync Issues

**Problem**: Feeds not syncing
- Check if you have an active account (Settings → WeWe RSS)
- Verify account status (not blacklisted or expired)
- Try manual sync to see specific error messages

**Problem**: Account shows as "blacklisted" (小黑屋)
- Wait 24 hours for automatic clearance
- Reduce sync frequency to avoid rate limiting
- Increase "Update Delay" in settings

### Note Creation Issues

**Problem**: Notes not being created
- Check "Note Folder" setting exists in your vault
- Verify note template is valid
- Check Obsidian console for errors (Ctrl+Shift+I)

### Performance

**Problem**: Slow sync with many feeds
- Reduce "Max Articles Per Feed"
- Increase "Update Delay" between requests
- Use title filtering to exclude unwanted articles

## Credits

- Original [WeWe RSS](https://github.com/cooderl/wewe-rss) by [@cooderl](https://github.com/cooderl)
- Converted to Obsidian plugin with embedded backend architecture
- Uses [sql.js](https://github.com/sql-js/sql.js) for SQLite in WebAssembly
- QR code generation by [qrcode](https://github.com/soldair/node-qrcode)

## License

MIT License - see LICENSE file for details

## Support

If you find this plugin helpful:
- ⭐ Star the repository
- 🐛 Report issues on GitHub
- 💡 Suggest features via GitHub Issues
- 🙏 Support the original WeWe RSS project: [paypal.me/cooderl](https://paypal.me/cooderl)

## Privacy

This plugin:
- Stores all data locally in your vault
- Does not send data to any third-party servers
- Only communicates with WeChat Reading API (weread.111965.xyz)
- Uses your WeChat account credentials for API authentication
- All database files remain on your device
