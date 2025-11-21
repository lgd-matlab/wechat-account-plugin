# Fix Post-Login Error Logging

## Problem Statement

After successful QR code login, the console shows multiple HTTP 500 errors even though the account was created successfully. This creates confusion and makes debugging difficult.

### Current Behavior

```
[AddAccountModal] Account added successfully: {id: 1, name: '...'}
[WeWe RSS] API Request Failed: {..., error: 'Request failed, status 500', ...}
[WeWe RSS] Failed to get login result: Error: Request failed, status 500
[WeWe RSS] Failed to check login status: {code: 'WeReadError500', message: 'Request failed, status 500', ...}
```

The errors repeat 7-10 times after successful login.

### Root Cause

1. User scans QR code
2. Poll request #N returns account data → Login succeeds
3. `loginSuccessful = true` is set
4. `clearInterval()` stops future polls
5. **BUT**: Poll requests #N+1, #N+2 may already be in-flight (async)
6. These requests hit the already-consumed UUID
7. WeChat API returns HTTP 500 for consumed UUIDs
8. WeChatApiClient logs errors before AddAccountModal can suppress them

### Impact

- **User Confusion**: Logs show errors after "success" message
- **Debugging Difficulty**: Hard to distinguish real errors from expected post-login errors
- **Console Noise**: Pollutes console with 7-10 false-positive errors

## Proposed Solution

### Approach: Signal-based Cancellation

Add an AbortController-style cancellation mechanism to stop logging for cancelled requests.

**Key Changes**:
1. AddAccountModal signals "login complete" to all in-flight requests
2. WeChatApiClient checks cancellation before logging errors
3. Suppressed errors don't pollute console

### Alternative Approaches Considered

**Alternative 1**: Just suppress all errors after `loginSuccessful = true`
- **Pros**: Simple, minimal code changes
- **Cons**: May hide legitimate errors during edge cases

**Alternative 2**: Wait for all in-flight requests before clearing interval
- **Pros**: Clean shutdown
- **Cons**: Complex to track async requests, adds delay

**Alternative 3**: Shorter polling interval to reduce in-flight requests
- **Pros**: Fewer collisions
- **Cons**: More server load, doesn't eliminate root cause

**Selected**: Alternative 1 (simplest, most effective for this use case)

## Success Criteria

1. ✅ No HTTP 500 errors logged after successful login
2. ✅ Real errors during login still logged and displayed
3. ✅ No performance regression
4. ✅ No breaking changes to existing functionality

## Dependencies

- Requires changes to: AddAccountModal, WeChatApiClient
- No external dependencies
- No database changes

## Timeline

- Estimated effort: 30 minutes
- Complexity: Low
- Testing: Manual (existing unit tests should pass)
