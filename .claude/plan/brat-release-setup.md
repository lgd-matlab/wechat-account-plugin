# BRAT Release Setup - Execution Plan

## Context
**Date**: 2025-11-16
**Task**: Fix BRAT installation error for wechat-account-plugin repository
**Issue**: Release missing required plugin files (main.js, manifest.json, styles.css)
**Repository**: https://github.com/lgd-matlab/wechat-account-plugin

---

## Solution Approach
**Selected Solution**: GitHub CLI automated release creation (Solution 2)

**Rationale**:
- Provides immediate fix to unblock BRAT installation
- Automated and repeatable for future releases
- Prevents manual file upload errors
- Industry-standard approach

---

## Implementation Plan

### Phase 1: Environment Verification ✅
**Goal**: Verify GitHub CLI availability and authentication

**Executed Steps**:
1. ✅ Checked GitHub CLI installation: `gh version 2.81.0`
2. ✅ Authenticated with GitHub as user: `lgd-matlab`
3. ✅ Verified repository context

**Result**: Environment ready for release creation

---

### Phase 2: Pre-Release Validation ✅
**Goal**: Ensure all required files present and valid

**Executed Steps**:
1. ✅ Verified plugin files exist:
   - main.js (124KB)
   - manifest.json (403 bytes)
   - styles.css (8.4KB)
2. ✅ Validated manifest.json structure:
   - Version: 0.1.0
   - Required fields present
3. ✅ Checked git status: Clean working tree

**Result**: All files validated and ready for release

---

### Phase 3: Tag Creation ✅
**Goal**: Create and push version tag to GitHub

**Executed Commands**:
```bash
git tag -a 0.1.0 -m "Release v0.1.0 - Initial release for BRAT support"
git push origin 0.1.0
```

**Result**: Tag `0.1.0` created and pushed successfully

---

### Phase 4: Release Creation with Assets ✅
**Goal**: Create GitHub release and attach plugin files

**Executed Command**:
```bash
gh release create 0.1.0 \
  main.js \
  manifest.json \
  styles.css \
  --title "v0.1.0 - WeWe RSS Initial Release" \
  --notes "Initial release for BRAT plugin installation support..."
```

**Result**:
- Release created: https://github.com/lgd-matlab/wechat-account-plugin/releases/tag/0.1.0
- All 3 assets attached and downloadable

---

### Phase 5: Verification ✅
**Goal**: Verify release structure for BRAT compatibility

**Verification Steps**:
1. ✅ Confirmed release exists with correct tag
2. ✅ Verified all 3 assets attached:
   - main.js
   - manifest.json
   - styles.css
3. ✅ Checked asset download URLs are accessible

**Result**: Release is BRAT-compatible

---

## BRAT Installation Instructions

### For Users Installing the Plugin:

1. **Install BRAT Plugin** (if not already installed):
   - Open Obsidian Settings
   - Go to Community Plugins
   - Browse and install "BRAT"

2. **Add Plugin via BRAT**:
   - Open BRAT settings
   - Click "Add Beta Plugin"
   - Enter repository: `lgd-matlab/wechat-account-plugin`
   - Click "Add Plugin"

3. **Enable the Plugin**:
   - Go to Settings → Community Plugins
   - Find "WeWe RSS" and toggle it on

4. **Configure**:
   - Open WeWe RSS settings
   - Follow QR code authentication for WeChat account

---

## Future Release Process

For future releases (e.g., v0.2.0):

```bash
# 1. Update version in manifest.json
# 2. Build the plugin
npm run build

# 3. Commit changes
git add .
git commit -m "chore: Release v0.2.0"
git push

# 4. Create release with one command
gh release create 0.2.0 \
  main.js \
  manifest.json \
  styles.css \
  --title "v0.2.0 - Release Title" \
  --notes "Release notes here"
```

---

## Troubleshooting

### If release already exists:
```bash
gh release delete 0.1.0 -y
git tag -d 0.1.0
git push origin :refs/tags/0.1.0
# Then recreate release
```

### If tag already exists:
```bash
git tag -d 0.1.0
git push origin :refs/tags/0.1.0
# Then recreate tag and release
```

### If assets are missing:
```bash
# Upload additional assets to existing release
gh release upload 0.1.0 main.js manifest.json styles.css
```

---

## Execution Summary

**Total Time**: ~5 minutes
**Status**: ✅ Successfully completed
**Release URL**: https://github.com/lgd-matlab/wechat-account-plugin/releases/tag/0.1.0
**BRAT Compatible**: Yes

**Files Created/Modified**:
- Git tag: `0.1.0`
- GitHub release: `v0.1.0`
- Release assets: 3 files attached
- Documentation: `.claude/plan/brat-release-setup.md`

---

## Next Steps

1. ✅ Test BRAT installation in Obsidian
2. ✅ Verify plugin loads correctly
3. ✅ Document release process for future versions
4. 📋 Consider GitHub Actions workflow for automated releases (optional)

---

**Execution Date**: 2025-11-16
**Executor**: Claude Code AI Assistant
**Workflow**: zcf:workflow (Research → Ideate → Plan → Execute → Optimize → Review)
