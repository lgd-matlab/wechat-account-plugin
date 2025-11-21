# Database Corruption Fix - Execution Plan

**Issue**: SQLite database corruption error: "database disk image is malformed"
**Date**: 2025-11-18
**Status**: In Progress

---

## Phase 1: Immediate Recovery (Manual Steps)

### Step 1: Restore from Backup

**IMPORTANT**: Follow these steps to restore your database from backup:

1. **Close Obsidian completely**
   - Ensure Obsidian is fully closed (check system tray)
   - This prevents file access conflicts

2. **Locate your backup file**
   - Your backup should be a `.db` file
   - Make note of the full backup file path

3. **Navigate to plugin directory**
   - Path: `.obsidian/plugins/wewe-rss/`
   - You should see `wewe-rss.db` (the corrupted file)

4. **Backup the corrupted file (optional)**
   - Rename `wewe-rss.db` to `wewe-rss.db.corrupted`
   - This preserves it for analysis if needed

5. **Copy your backup file**
   - Copy your backup file to `.obsidian/plugins/wewe-rss/`
   - Rename it to `wewe-rss.db`

6. **Restart Obsidian**
   - Open Obsidian
   - Open the WeWe RSS settings tab
   - Verify your accounts are visible without errors

### Expected Result
- Plugin loads successfully
- No database errors in console
- All your accounts/feeds are restored from backup point

---

## Phase 2: Automated Prevention (Code Implementation)

### Architecture Overview

```
DatabaseService (Core)
├── DatabaseBackupService (Backup Management)
│   ├── createBackup()
│   ├── restoreBackup()
│   ├── listBackups()
│   └── cleanOldBackups()
├── DatabaseHealthService (Corruption Detection)
│   ├── checkIntegrity()
│   ├── validateSchema()
│   └── performHealthCheck()
└── DatabaseRecoveryModal (UI)
    ├── Show corruption error
    ├── Restore from backup
    └── View backup list
```

### Implementation Timeline

1. **DatabaseBackupService** - Automated backup creation
2. **Backup Types** - TypeScript type definitions
3. **DatabaseHealthService** - Corruption detection
4. **Health Check Types** - TypeScript type definitions
5. **WAL Mode Integration** - Prevent future corruption
6. **Recovery Modal UI** - User-friendly recovery
7. **Settings Integration** - User configuration
8. **Testing** - Comprehensive test coverage
9. **Documentation** - Update project docs

---

## Technical Implementation Details

### Backup Strategy
- **Location**: `.obsidian/plugins/wewe-rss/backups/`
- **Naming**: `wewe-rss-backup-{timestamp}-{reason}.db`
- **Triggers**:
  - Before plugin initialization
  - Before database migrations
  - Before sync operations (optional)
  - Manual user request
- **Retention**: 7 days (configurable)

### WAL Mode Benefits
- **Write-Ahead Logging**: Writes to WAL file first, then commits
- **Better Concurrency**: Readers don't block writers
- **Crash Recovery**: Better resilience to power failures
- **Performance**: Faster writes, fewer disk syncs

### Corruption Detection
- **Integrity Check**: `PRAGMA integrity_check`
- **Schema Validation**: Verify all required tables exist
- **Health Report**: Periodic checks with logging

---

## Progress Tracking

- [x] Phase 1: Manual backup restoration guide created
- [ ] Phase 2: DatabaseBackupService implementation
- [ ] Phase 3: DatabaseHealthService implementation
- [ ] Phase 4: WAL mode integration
- [ ] Phase 5: Recovery UI modal
- [ ] Phase 6: Settings configuration
- [ ] Phase 7: Unit tests
- [ ] Phase 8: Documentation updates

---

## Context

**Project**: WeWe RSS for Obsidian
**Module**: src/services/database/
**Architecture**: Repository → Service → UI pattern
**Database**: SQLite via sql.js (WebAssembly)
**Test Coverage Target**: 95%+

---

## Next Steps

After manual restoration:
1. Verify database works correctly
2. Implement automated backup mechanism
3. Add corruption detection on startup
4. Enable WAL mode for prevention
5. Create recovery UI for future issues

---

**Last Updated**: 2025-11-18
**Implemented By**: Claude Code (zcf:workflow)
