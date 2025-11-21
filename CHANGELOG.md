# Changelog

All notable changes to the WeWe RSS for Obsidian plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-11-21

### Added
- **Database Backup System**: Automatic and manual database backups
  - Configurable retention period (default: 7 days)
  - Backup before initialization and sync operations
  - Easy restore from backup functionality
- **Database Health Monitoring**: Proactive corruption detection and recovery
  - Comprehensive health checks (integrity, schema, constraints)
  - Interactive recovery modal with multiple recovery options
  - WAL (Write-Ahead Logging) mode for better data integrity
- **AI-Powered Article Summarization**: Generate daily summaries of articles
  - Multi-provider support: OpenAI, Google Gemini, Anthropic Claude, DeepSeek, Zhipu GLM
  - Generic OpenAI-compatible API support
  - Dedicated AI Settings tab with provider-specific configurations
  - Automated daily summarization scheduling
  - Configurable rate limiting for API requests
- **Sync Date Filter**: Limit article synchronization by publication date
  - Default: 5 days (configurable 1-365 days)
  - Reduces database bloat and improves performance
  - Consistent filtering for both initial feed addition and regular syncs
- **Development Tooling**: Comprehensive workflow automation
  - Claude Code commands for feature specification and planning
  - OpenSpec integration for change management
  - Feature-to-code mapping documentation for AI assistance

### Changed
- **Settings Organization**: Split into General Settings and AI Settings tabs
- **SQL.js WASM Bundling**: Now bundled inline to prevent runtime loading issues
- **Sync Days Filter Default**: Changed from 30 days to 5 days for better performance
- **Error Handling**: Improved error messages and user feedback across all components

### Fixed
- **Fixed WASM bundling**: sql-wasm.wasm now inlined in bundle to prevent missing file errors
- **Fixed sync filter inconsistency**: `fetchHistoricalArticles()` now correctly uses `syncDaysFilter`
- **Fixed race condition**: HTTP 500 errors after successful QR code login
- **Fixed authentication errors**: Better handling of 401 errors with re-authentication prompts

### Technical
- Added 200+ new unit tests (total: 390+ tests, all passing)
- Enhanced test coverage across all modules (70-100%)
- Comprehensive documentation updates (FEATURE-CODE-MAPPING.md, module docs)
- Improved TypeScript type safety with new interfaces and enums

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
