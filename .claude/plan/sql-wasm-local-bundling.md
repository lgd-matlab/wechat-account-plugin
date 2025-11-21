# Fix sql.js WASM Loading Error - Local Bundling

**Task**: Resolve "asm streaming compile failed: TypeError: Failed to fetch" error
**Date**: 2025-11-19
**Status**: Completed
**Updated**: 2025-11-19 (Path resolution fix added)

## Context

The plugin fails to initialize due to sql.js WASM file loading failure. The current implementation attempts to fetch the WASM file from a CDN (`https://sql.js.org/dist/`), which fails due to network issues or CORS restrictions.

**Error Stack Trace**:
```
[asm streaming compile failed: TypeError: Failed to fetch
eval @ plugin:terminal:147
ks @ VM279 plugin:wewe-rss:13 (sqlJsWrapper.initialize)
initialize @ VM279 plugin:wewe-rss:44 (DatabaseService.initialize)
onload @ VM279 plugin:wewe-rss:165
```

## Root Cause

### Initial Issue
1. `src/lib/sql-js-wrapper.ts:31` - locateFile returns CDN URL instead of local path
2. `esbuild.config.mjs:44-50` - Empty plugin that should copy WASM file but doesn't

### Secondary Issue (Path Resolution)
After bundling WASM locally, Obsidian attempted to load from:
```
GET app://obsidian.md/sql-wasm.wasm net::ERR_FILE_NOT_FOUND
```

**Problem**: Returning just the filename `"sql-wasm.wasm"` caused Obsidian to resolve it relative to the app root instead of the plugin directory.

**Fix**: Pass `plugin.manifest.dir` to construct full path: `<vault>/.obsidian/plugins/wewe-rss/sql-wasm.wasm`

## Solution: Bundle WASM File Locally

Bundle the `sql-wasm.wasm` file from `node_modules/sql.js/dist/` into the plugin directory during build process.

### Benefits
- ✅ Works offline (no network dependency)
- ✅ Faster loading (local file access)
- ✅ No CORS issues
- ✅ Follows Obsidian plugin best practices
- ✅ Aligns with "embedded backend" architecture

### Trade-offs
- ⚠️ Increases plugin bundle size by ~800KB

## Implementation Plan

### Step 1: Implement esbuild Plugin
**File**: `esbuild.config.mjs`
- Add `fs` and `path` imports
- Implement WASM file copy logic in `copy-sql-wasm` plugin

### Step 2: Update locateFile Path
**File**: `src/lib/sql-js-wrapper.ts`
- Change locateFile to return local file path instead of CDN URL
- Add optional `basePath` parameter to `initialize()` method
- Construct full path using `basePath` when provided

### Step 3: Pass Plugin Directory Path
**File**: `src/services/database/DatabaseService.ts`
- Pass `plugin.manifest.dir` to `sqlJsWrapper.initialize()`
- Enables WASM file to be located at correct plugin directory path

### Step 4: Update .gitignore
**File**: `.gitignore`
- Add `sql-wasm.wasm` as build artifact

### Step 5: Test Build
- Run `npm run build`
- Verify WASM file copied to plugin root

### Step 6: Test in Obsidian
- Test in development mode (`npm run dev`)
- Test in production mode
- Verify database initializes without errors

## Success Criteria

- [x] Build completes successfully
- [x] `sql-wasm.wasm` file exists in plugin root (~645KB)
- [x] WASM file copy plugin implemented in esbuild
- [x] Path resolution fixed with basePath parameter
- [ ] No "Failed to fetch" errors in console (pending Obsidian test)
- [ ] "sql.js initialized successfully" appears in logs (pending Obsidian test)
- [ ] Database operations work normally (pending Obsidian test)
- [ ] All existing tests pass (tests use mock, not affected)

## Files Modified

1. `esbuild.config.mjs` (lines 4-5, 49-63) - Add WASM copy logic
2. `src/lib/sql-js-wrapper.ts` (lines 15-16, 32-40) - Add basePath parameter and path construction
3. `src/services/database/DatabaseService.ts` (line 85) - Pass plugin directory to initialize
4. `.gitignore` (line 18) - Add WASM file to ignored files

## Testing Notes

**Development**: `npm run dev` → Reload plugin in Obsidian
**Production**: `npm run build -- production` → Copy files to vault

---

## Implementation Summary

### Changes Made

1. **esbuild Configuration** - Implemented WASM file copy plugin
   - Copies `sql-wasm.wasm` from node_modules to plugin root during build
   - Added error handling and logging

2. **sql-js-wrapper** - Added path resolution support
   - New optional `basePath` parameter in `initialize()` method
   - Constructs full path when basePath provided: `${basePath}/${file}`
   - Maintains backward compatibility with fallback behavior

3. **DatabaseService** - Passes plugin directory path
   - Changed: `await sqlJsWrapper.initialize()`
   - To: `await sqlJsWrapper.initialize(this.plugin.manifest.dir)`
   - Enables correct path resolution in Obsidian's app:// protocol

4. **Git Configuration** - Added build artifact to .gitignore
   - Prevents committing the generated WASM file

---

**Last Updated**: 2025-11-19
**Implementation Status**: Code Complete - Pending Obsidian Testing
