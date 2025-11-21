# Proposal: Fix Login Polling Race Condition

**Change ID**: `fix-login-polling-race-condition`
**Status**: Draft
**Created**: 2025-11-19
**Author**: AI Assistant

## Problem Statement

### Current Behavior

When users scan the QR code and successfully log in through the AddAccountModal, the following occurs:

1. QR code is generated and displayed ✓
2. User scans and authorizes ✓
3. Account is created successfully ✓
4. **BUG**: Polling continues even after successful login ✗
5. API returns HTTP 500 errors because the UUID is no longer valid ✗
6. Console is flooded with error messages ✗

### Evidence from User Report

```
[WeWe RSS] Login successful: 不要叫我细狗
[WeWe RSS] Account created: {id: 1, name: '不要叫我细狗'}
[WeWe RSS] Account created successfully: 不要叫我细狗
[AddAccountModal] Account added successfully: {id: 1, ...}

// But then polling continues...
[WeWe RSS] API Request Failed: {url: 'https://weread.111965.xyz/api/v2/login/platform/001ftzKx4uPSFa1p', method: 'GET', attempt: 1, maxRetries: 3, error: 'Request failed, status 500', …}
[WeWe RSS] Failed to get login result: Error: Request failed, status 500
[WeWe RSS] Failed to check login status: {code: 'WeReadError500', message: 'Request failed, status 500', ...}
// (Repeats multiple times)
```

### Root Cause Analysis

The issue is in `src/ui/modals/AddAccountModal.ts`:

**Race Condition Location** (lines 144-219):

1. **Flag check is too late**: The `loginSuccessful` flag check happens at the beginning of `checkLoginStatus()`, but there are already in-flight API requests
2. **Interval not cleared immediately**: When login succeeds, there's a ~1 second delay before the modal closes, during which the 2-second polling interval continues to fire
3. **No cancellation mechanism**: There's no way to cancel in-flight `getLoginResult()` API requests

**Specific Code Flow**:
```typescript
// Line 130: Poll fires every 2 seconds
this.pollInterval = window.setInterval(async () => {
    await this.checkLoginStatus();
}, 2000);

// Lines 156-168: Success case
const account = await this.plugin.accountService.checkLoginStatus(this.uuid);
if (account) {
    // Flag set here
    this.loginSuccessful = true;

    // Interval cleared here (but more polls may have already started!)
    if (this.pollInterval) {
        window.clearInterval(this.pollInterval);
        this.pollInterval = null;
    }

    // Modal closes 1 second later (line 182)
    window.setTimeout(() => {
        this.close();
    }, 1000);
}
```

**Timeline of the Race Condition**:
```
T=0ms:    Poll 1 starts (checkLoginStatus called)
T=100ms:  API request sent
T=2000ms: Poll 2 starts (checkLoginStatus called) ← Still running
T=2100ms: API request sent (from Poll 2)
T=2500ms: Poll 1 returns SUCCESS
T=2501ms: loginSuccessful = true
T=2502ms: clearInterval called
T=4000ms: Poll 3 would start, BUT interval cleared ✓
T=2600ms: Poll 2 API request returns → UUID invalid → 500 error ✗
```

## Proposed Solution

### High-Level Approach

Implement **immediate polling cessation** with three defensive layers:

1. **Synchronous flag check before async operations**: Check `loginSuccessful` flag BEFORE making API call
2. **Clear interval BEFORE making API call** on success: Prevent new polls from starting
3. **Ignore late-arriving responses**: Suppress errors from in-flight requests

### Technical Design

```typescript
private async checkLoginStatus() {
    // LAYER 1: Check flag BEFORE any async operations
    if (this.loginSuccessful) {
        this.logger.debug('Skipping poll - login already successful');
        return;
    }

    if (!this.uuid) {
        return;
    }

    try {
        // LAYER 2: Check flag again right before API call (in case of concurrent polls)
        if (this.loginSuccessful) {
            this.logger.debug('Race condition prevented - login succeeded during check');
            return;
        }

        const account = await this.plugin.accountService.checkLoginStatus(this.uuid);

        if (account) {
            // CRITICAL: Set flag and clear interval IMMEDIATELY
            this.loginSuccessful = true;

            // Stop polling FIRST (before any other async operations)
            if (this.pollInterval) {
                window.clearInterval(this.pollInterval);
                this.pollInterval = null;
            }

            // Then handle success UI updates
            this.logger.info('Account added successfully:', account);
            this.updateStatus('Account added successfully!', 'success');
            new Notice(`WeChat account "${account.name}" added successfully!`);

            // Close modal after UI updates
            window.setTimeout(() => {
                this.close();
            }, 1000);
        }

    } catch (error) {
        // LAYER 3: Suppress errors if login already successful (from late-arriving responses)
        if (this.loginSuccessful) {
            this.logger.debug('Ignoring polling error after successful login');
            return;
        }

        // Normal error handling for pre-success errors
        this.logger.error('Failed to check login status:', error);
        this.consecutiveErrors++;

        if (this.consecutiveErrors >= 3) {
            // Stop polling after repeated failures
            if (this.pollInterval) {
                window.clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
            const errorMsg = error.message || 'Failed to connect to server after multiple attempts';
            this.showError(errorMsg);
        }
    }
}
```

### Why This Works

1. **Synchronous flag checks**: No awaits between check and return, preventing race conditions
2. **Immediate interval clearing**: Stops new polls before they can start
3. **Error suppression**: Gracefully handles unavoidable late-arriving responses
4. **Logging visibility**: Debug messages help developers understand the flow

## Scope

### In Scope
- Fix race condition in `AddAccountModal.checkLoginStatus()`
- Add defensive flag checks before async operations
- Clear polling interval immediately on success
- Suppress errors from late-arriving API responses
- Add debug logging for troubleshooting

### Out of Scope
- Refactoring WeChatApiClient (separate concern)
- Changing the 2-second polling interval (works fine)
- Modifying AccountService.checkLoginStatus() (not the issue)
- Adding cancellation tokens to API client (too complex for this fix)

## Implementation Strategy

### Minimal, Surgical Changes

This fix requires **only modifying `AddAccountModal.ts`** - specifically the `checkLoginStatus()` method (lines 144-219).

**No changes needed to**:
- Database layer
- Service layer
- API client
- Other UI components
- Type definitions

### Backwards Compatibility

✓ **100% backwards compatible** - purely internal logic change
✓ No API changes
✓ No database schema changes
✓ No settings changes

## Testing Strategy

### Unit Tests
- Mock AccountService.checkLoginStatus() to return success
- Verify polling stops immediately after success
- Verify no additional API calls after success flag set
- Verify error suppression for late responses

### Manual Testing
1. Open AddAccountModal
2. Scan QR code with WeChat
3. Authorize login
4. **Verify**: Console shows no 500 errors after "Login successful"
5. **Verify**: Modal closes cleanly after 1 second

### Regression Testing
- Existing AddAccountModal tests should pass unchanged
- Test QR code expiration handling (shouldn't break)
- Test consecutive error handling (shouldn't break)

## Alternatives Considered

### Alternative 1: AbortController for API Cancellation
**Pros**: Truly cancels in-flight requests
**Cons**: Requires refactoring WeChatApiClient, adds complexity, overkill for this issue
**Decision**: Rejected - Error suppression is simpler and sufficient

### Alternative 2: Reduce Polling Interval
**Pros**: Less likely to have multiple in-flight requests
**Cons**: Doesn't fix the root race condition, may impact server load
**Decision**: Rejected - Doesn't address the bug, only reduces frequency

### Alternative 3: Single-Shot Polling (no setInterval)
**Pros**: Eliminates race conditions entirely
**Cons**: Requires rewriting polling logic, more invasive change
**Decision**: Rejected - Too big a refactor for this bug

## Success Criteria

1. **Console is clean**: No 500 errors logged after successful login
2. **Immediate cessation**: Polling stops within <100ms of login success
3. **User experience**: Modal closes smoothly without error messages
4. **No regressions**: All existing tests pass
5. **Debug visibility**: Clear logging shows polling lifecycle

## Dependencies

**None** - This is a self-contained fix within AddAccountModal.

## Related Specifications

None - This is a bugfix, not a new feature.

## Open Questions

None - The solution is straightforward and tested.
