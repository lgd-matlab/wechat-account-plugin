# Fix: 401 Authentication Error When Adding Feeds

**Date**: 2025-11-20
**Status**: Planned
**Workflow Phase**: Plan → Execute

---

## Problem Statement

When users try to add a new feed via "+ Feed" button in WeWe RSS sidebar, the operation fails with:

```
[WeWe RSS] API Request Failed: {
  url: 'https://weread.111965.xyz/api/v2/platform/wxs2mp',
  method: 'POST',
  error: 'Request failed, status 401'
}
```

### Root Cause

`FeedService.subscribeFeed()` at line 63 sends **database account ID** (1, 2, 3...) to WeChat API instead of **WeChat VID** (virtual ID from credentials).

**Buggy Code** (`FeedService.ts:57-65`):
```typescript
const credentials = this.parseCredentials(account.cookie);  // {vid: 12345678, token: "..."}

const mpInfoList = await this.apiClient.getMpInfoWithAuth(
    wxsLink,
    account.id.toString(),      // ❌ Sends "1" (database ID)
    credentials.token           // ✅ Correct token
);
```

**What API Expects**:
```typescript
headers: {
    'xid': '12345678',          // WeChat VID from credentials
    'Authorization': 'Bearer token...'
}
```

---

## Solution: Use credentials.vid

**Change**: Replace `account.id.toString()` with `credentials.vid.toString()`

**Impact**: 1 file, 1 line changed
**Risk**: Very Low

---

## Implementation Steps

### Step 1: Read and Confirm Bug Location
- File: `src/services/FeedService.ts`
- Lines: 57-65
- Confirm line 63 contains: `account.id.toString(),`

### Step 2: Apply Fix
Replace line 63:
```diff
- account.id.toString(),
+ credentials.vid.toString(),
```

### Step 3: Search for Similar Bugs
Check entire `FeedService.ts` for other occurrences of:
- `account.id.toString()` in API calls
- `getMpInfoWithAuth` usage
- `getMpArticles` usage

Likely candidates:
- `fetchHistoricalArticles()` method
- `refreshFeed()` method

### Step 4: Fix Additional Occurrences
Apply same pattern wherever `account.id` is used for WeChat API authentication.

### Step 5: Build and Deploy
```bash
npm run build
cp main.js manifest.json styles.css sql-wasm.wasm "D:/OneDrive/obsidian/template/obsidian-example-lifeos-chinese-version/obsidian-example-lifeos-chinese-version/.obsidian/plugins/wewe-rss/"
```

### Step 6: Manual Test
1. Reload Obsidian (Ctrl+R)
2. Open WeWe RSS sidebar
3. Click "+ Feed"
4. Paste URL: `https://mp.weixin.qq.com/s/VK__j8d91a9SLYsnFmBVRQ`
5. Submit

**Expected**:
- ✅ Feed added successfully
- ✅ No 401 error
- ✅ Console shows: `[WeWe RSS] Feed subscribed successfully`

---

## Context: Why This Bug Exists

**Account Credentials Evolution**:
1. **Old Format** (legacy): `cookie = "token-string-only"`
2. **New Format** (current): `cookie = '{"vid": 12345678, "token": "..."}'`

When new format was introduced, `FeedService.parseCredentials()` was updated to extract both `vid` and `token`, but API call sites still used `account.id` from database.

**Database vs WeChat IDs**:
- `account.id`: Auto-increment integer (1, 2, 3...) from SQLite
- `credentials.vid`: WeChat virtual ID (8-digit number from WeChat Reading platform)

API validates `xid` header against WeChat's user database, so database IDs don't match.

---

## Files Involved

### Modified
- `src/services/FeedService.ts` (1 line changed)

### Related (no changes)
- `src/services/api/WeChatApiClient.ts` (API client implementation)
- `src/services/AccountService.ts` (account credential management)
- `src/ui/modals/AddFeedModal.ts` (UI that triggers the bug)

---

## Testing Checklist

- [ ] Build succeeds without TypeScript errors
- [ ] Feed subscription succeeds (no 401 error)
- [ ] Feed appears in sidebar after adding
- [ ] Console shows success message
- [ ] Existing feeds still load correctly
- [ ] No regression in other features

---

## Rollback Plan

```bash
git checkout src/services/FeedService.ts
npm run build
# Re-deploy files
```

---

## Related Issues

- Account authentication implemented in commit: `ca7637c - fix(auth): store and use WeChat vid for API authentication`
- This fix completes the VID migration started in that commit

---

**Planned By**: AI Assistant (Claude)
**Approved By**: User
**Implementation Date**: 2025-11-20
