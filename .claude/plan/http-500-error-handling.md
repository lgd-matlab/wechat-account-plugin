# HTTP 500 Error Handling Implementation Plan

## Context
**Date**: 2025-11-16
**Task**: Fix HTTP 500 errors during WeChat QR code login flow
**Issue**: WeChat Reading Platform API returning HTTP 500 during long-polling login checks
**Repository**: D:\obsidian-plugin\wechat-account-assemble

---

## Problem Analysis

### Root Cause
**External API Issue**: WeChat Reading Platform API (`https://weread.111965.xyz`) returning HTTP 500 errors during QR code login polling.

### Error Pattern
```
Error: Request failed, status 500
Endpoint: GET /api/v2/login/platform/{uuid}
Frequency: Every 2 seconds (polling interval)
Impact: Plugin stops polling after first error, preventing successful login
```

### Why 7 Repeated Errors
Polling mechanism in `AddAccountModal.ts` triggers every 2 seconds (~14 seconds total before stopping).

---

## Solution Approach

**Selected Strategy**: Multi-layered error handling with retry logic and health checks

### Key Improvements
1. **Retry Logic**: Exponential backoff for transient server errors
2. **Health Check**: Pre-flight API availability check before QR generation
3. **Better UX**: User-friendly error messages and recovery options
4. **Resilient Polling**: Don't stop on first error (3-strike threshold)
5. **Diagnostic Logging**: Enhanced logging for troubleshooting

---

## Implementation Details

### Phase 1: API Types Enhancement ✅

**File**: `src/services/api/types.ts`

**Changes**:
```typescript
// Added health check response type
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp?: number;
}

// Added server error codes
export enum ApiErrorCode {
  // Existing codes...
  BAD_GATEWAY = 'WeReadError502',
  SERVICE_UNAVAILABLE = 'WeReadError503',
}
```

**Purpose**: Support health check endpoint and better error classification

---

### Phase 2: WeChatApiClient Enhancements ✅

**File**: `src/services/api/WeChatApiClient.ts`

#### 2.1 Health Check Method

```typescript
async checkHealth(): Promise<boolean> {
  // Tries multiple health endpoint patterns:
  // - /health
  // - /api/health
  // - /api/v2/health
  // Falls back to HEAD request to base URL

  return true if server reachable, false otherwise
}
```

**Purpose**: Verify server availability before initiating login flow

---

#### 2.2 Retry Logic with Exponential Backoff

```typescript
private async request<T>(
  config: RequestUrlParam,
  timeout?: number,
  params?: Record<string, string>,
  retryOptions?: { maxRetries?: number; backoffMs?: number }
): Promise<T> {
  const maxRetries = retryOptions?.maxRetries ?? 0;
  const backoffMs = retryOptions?.backoffMs ?? 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Make request
      return response.json;
    } catch (error) {
      if (!isLastAttempt && isRetryableError(error)) {
        const delay = backoffMs * Math.pow(2, attempt); // 2s, 4s, 8s
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

**Retry Schedule**:
- Attempt 1: Immediate
- Attempt 2: Wait 2 seconds
- Attempt 3: Wait 4 seconds
- Total max attempts: 3
- Total max delay: 6 seconds

**Retryable Errors**: HTTP 500, 502, 503, 504

---

#### 2.3 Enhanced Error Messages

```typescript
private handleError(error: any, accountId?: string): ApiError {
  const status = extractStatusCode(error);

  if (status === '500') {
    return {
      code: ApiErrorCode.INTERNAL_ERROR,
      message: `Server error (HTTP 500). The WeChat Reading platform (${baseUrl}) is experiencing issues. Please try again later or check if the server is operational.`,
      details: error
    };
  }

  // Similar for 502, 503...
}
```

**Purpose**: User-friendly, actionable error messages

---

#### 2.4 Diagnostic Logging

```typescript
// Log all API requests with details
logger.debug('API Request:', {
  url, method, attempt, maxRetries
});

// Log failures with full context
logger.error('API Request Failed:', {
  url, method, attempt, error, isRetryable, isLastAttempt
});
```

**Purpose**: Help diagnose issues in user reports

---

### Phase 3: AccountService Wrapper ✅

**File**: `src/services/AccountService.ts`

```typescript
async checkServerHealth(): Promise<boolean> {
  try {
    return await this.apiClient.checkHealth();
  } catch (error) {
    logger.error('Server health check failed:', error);
    return false;
  }
}
```

**Purpose**: Expose health check to UI layer

---

### Phase 4: AddAccountModal UX Improvements ✅

**File**: `src/ui/modals/AddAccountModal.ts`

#### 4.1 Pre-Flight Health Check

```typescript
private async generateQRCode() {
  // 1. Show "Checking server status..."

  // 2. Health check
  const isHealthy = await this.plugin.accountService.checkServerHealth();
  if (!isHealthy) {
    throw new Error('WeChat Reading platform is currently unavailable...');
  }

  // 3. Generate QR code
  // 4. Start polling
}
```

**Purpose**: Fail fast if server is down (better UX than waiting for timeout)

---

#### 4.2 Resilient Polling

```typescript
private consecutiveErrors: number = 0; // Track error streak

private async checkLoginStatus() {
  try {
    const account = await checkStatus(uuid);

    if (account) {
      // Success
      this.consecutiveErrors = 0;
    } else {
      // Pending, reset error counter
      this.consecutiveErrors = 0;
    }
  } catch (error) {
    this.consecutiveErrors++;

    if (this.consecutiveErrors >= 3) {
      // Stop polling after 3 consecutive errors
      stopPolling();
      showError(error.message);
    } else {
      // Show transient error, keep polling
      updateStatus(`Connection issue (${consecutiveErrors}/3). Retrying...`, 'pending');
    }
  }
}
```

**Purpose**: Don't stop on first error (handle transient network issues)

---

#### 4.3 Improved Error Display

```typescript
private showError(message: string) {
  // Clear QR container

  // Show error message

  // Add action buttons:
  // - "Try Again" (regenerate QR code)
  // - "Check Server Status" (open platform URL in browser)
}
```

**Purpose**: Give user actionable recovery options

---

## Testing Strategy

### Unit Tests (To Be Added)

```typescript
describe('WeChatApiClient', () => {
  it('should retry on HTTP 500 errors', async () => {
    // Mock: fail twice, succeed third time
    // Assert: 3 attempts made
    // Assert: final result returned
  });

  it('should detect server health', async () => {
    // Mock: health endpoint returns {status: 'ok'}
    // Assert: checkHealth() returns true
  });

  it('should handle health check failures gracefully', async () => {
    // Mock: all health endpoints fail
    // Assert: checkHealth() returns false (not throw)
  });
});

describe('AddAccountModal', () => {
  it('should stop polling after 3 consecutive errors', async () => {
    // Mock: API always fails
    // Assert: polling stops after 3 errors
    // Assert: error displayed to user
  });

  it('should reset error counter on success', async () => {
    // Mock: fail, fail, succeed, fail
    // Assert: polling continues (not stopped at 4th attempt)
  });
});
```

### Manual Testing Scenarios

1. **Server Down**:
   - Disconnect network or change platform URL to invalid
   - Expected: Health check fails, clear error message shown

2. **Transient Errors**:
   - Mock server to return 500 twice, then 200
   - Expected: Retry succeeds, login completes

3. **Persistent Errors**:
   - Mock server to always return 500
   - Expected: After 3 errors, polling stops with error message

4. **Recovery**:
   - Trigger error display
   - Click "Try Again" button
   - Expected: New QR code generated, polling restarted

---

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `src/services/api/types.ts` | +10 | Health check types, error codes |
| `src/services/api/WeChatApiClient.ts` | +150 | Health check, retry logic, better errors |
| `src/services/AccountService.ts` | +10 | Health check wrapper |
| `src/ui/modals/AddAccountModal.ts` | +80 | Pre-flight check, resilient polling, error UX |

**Total**: ~250 lines added/modified

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Health endpoint doesn't exist | Fallback to HEAD request to base URL |
| Retry logic causes longer waits | Short backoff (max 8s) |
| Too many retries abuse server | Limit to 2-3 retries per request |
| User confused by error messages | Actionable buttons (Try Again, Check Status) |

---

## Expected Behavior After Implementation

### Scenario 1: Server Down
```
1. User clicks "Add Account"
2. Modal shows "Checking server status..."
3. Health check fails
4. Error message: "WeChat Reading platform is currently unavailable..."
5. Buttons: [Try Again] [Check Server Status]
```

### Scenario 2: Transient 500 Error During Polling
```
1. User scans QR code
2. Polling starts
3. First poll: HTTP 500 → Retry (2s wait) → Success
4. Login completes normally
```

### Scenario 3: Persistent 500 Errors
```
1. Polling detects errors
2. Status: "Connection issue (1/3). Retrying..."
3. Status: "Connection issue (2/3). Retrying..."
4. Status: "Connection issue (3/3). Retrying..."
5. Polling stops
6. Error message: "Server error (HTTP 500). The WeChat Reading platform is experiencing issues..."
7. Buttons: [Try Again] [Check Server Status]
```

---

## Rollback Plan

If implementation causes issues:

1. **Revert commits**:
   ```bash
   git revert <commit-hash>
   ```

2. **Quick fix**: Disable health check
   ```typescript
   // In generateQRCode(), comment out:
   // const isHealthy = await checkServerHealth();
   ```

3. **Disable retry**: Remove retry options from API calls
   ```typescript
   // In getLoginResult(), remove:
   // { maxRetries: 2, backoffMs: 2000 }
   ```

---

## Future Enhancements

1. **Smarter Retry**: Detect rate limiting vs server errors
2. **Circuit Breaker**: Stop all requests if server down for >5 minutes
3. **Fallback API**: Support multiple platform URLs
4. **Metrics**: Track error rates and report to plugin analytics

---

## Execution Summary

**Status**: ✅ Successfully completed

**Implementation Time**: ~30 minutes

**Changes**:
- 4 files modified
- ~250 lines added/modified
- 0 breaking changes
- Backward compatible

**Test Coverage**: Manual testing required (unit tests pending)

---

**Execution Date**: 2025-11-16
**Executor**: Claude Code AI Assistant
**Workflow**: zcf:workflow (Research → Ideate → Plan → Execute → Optimize → Review)
