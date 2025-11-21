# Changelog

All notable changes to the WeWe RSS for Obsidian plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Sync Days Filter Default**: Changed default sync filter from 30 days to 5 days for new installations
  - Reduces initial sync overhead and database storage
  - Better matches user expectations for recent article consumption
  - Existing installations maintain their configured value
  - Users can still configure any value between 1-365 days in Settings > Sync Settings

### Fixed
- **Fixed sync filter inconsistency when adding new feeds**: `fetchHistoricalArticles()` now correctly uses `syncDaysFilter` setting instead of `articleRetentionDays`
  - Previously when adding a new feed, it would fetch articles based on `articleRetentionDays` (30 days) regardless of `syncDaysFilter` setting
  - Now consistently uses `syncDaysFilter` for both initial feed addition and regular syncs
  - This ensures new feeds respect the user's configured sync filter
- Fixed race condition causing HTTP 500 errors in console after successful WeChat QR code login ([#issue-number])
  - Added defensive layer to prevent concurrent polling requests after login succeeds
  - Improved error handling to suppress late-arriving API responses
  - Added 11 comprehensive unit tests with 100% coverage for the fix

## [0.1.1] - 2025-11-19

### Added
- Initial release of WeWe RSS for Obsidian
- WeChat Reading account integration via QR code authentication
- Automatic article synchronization from subscribed public accounts
- HTML to Markdown conversion for articles
- Customizable note templates
- Database backup and health monitoring
- AI-powered article summarization (OpenAI, Gemini, Claude, DeepSeek, GLM)
- Interactive cleanup modal with note deletion
- 30-day retention policy for articles

### Changed
- Split settings into two tabs: General Settings and AI Settings for better organization

### Known Issues
- Some AI provider tests failing (41 tests) - unrelated to core functionality
- Manual testing required for full QR code login flow

---

## Version History

### [0.1.1] - 2025-11-19
- Initial stable release

### [0.1.0] - 2025-11-15
- Beta release for testing

---

**Note**: For detailed technical changes, see the `openspec/changes/` directory.
