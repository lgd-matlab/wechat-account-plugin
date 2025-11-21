# Spec: Login Polling Control

## Capability

Control and terminate QR code login polling immediately upon successful authentication to prevent unnecessary API calls and error logging.

## Overview

The AddAccountModal uses a polling mechanism to check the status of WeChat QR code login. When login succeeds, the polling must stop immediately to prevent:

1. Making API calls with invalid (used) UUIDs
2. Generating HTTP 500 errors in the console
3. Degrading user experience with error messages
4. Creating confusion about whether login actually succeeded

This specification defines requirements for clean polling termination using defensive programming techniques.

## ADDED Requirements

### Requirement: Synchronous Flag Check Before API Call

The login status check function MUST check the `loginSuccessful` flag synchronously (without awaits) before initiating any API requests.

**Rationale**: Prevents race conditions where multiple polling intervals fire before the success flag can stop them. By checking the flag before the first await, we ensure no async gaps where concurrent polls can proceed.

#### Scenario: Flag Prevents Redundant Poll

**Given** login has succeeded and `loginSuccessful` is true
**And** a new polling interval fires
**When** `checkLoginStatus()` is called
**Then** the function MUST return immediately without making an API call
**And** a debug message MUST be logged: "Skipping poll - login already successful"

#### Scenario: Multiple Concurrent Polls

**Given** two polling intervals fire at T=2000ms and T=2001ms
**And** the first poll succeeds at T=2500ms setting `loginSuccessful = true`
**When** the second poll reaches the flag check
**Then** it MUST return immediately without calling the API
**And** no 500 error MUST appear in the console

---

### Requirement: Immediate Interval Clearing on Success

Upon detecting successful login, the polling interval MUST be cleared immediately before any other async operations (UI updates, Notice displays, modal closing).

**Rationale**: Clearing the interval first prevents new polls from being scheduled while handling the success case. This is the most critical step to stop the bleeding.

#### Scenario: Interval Cleared Before UI Updates

**Given** `checkLoginStatus()` receives a successful account response
**When** `loginSuccessful` is set to true
**Then** `window.clearInterval(this.pollInterval)` MUST be called before any of:
- Logging success messages
- Updating UI status
- Showing Notice
- Closing the modal
**And** `this.pollInterval` MUST be set to null

#### Scenario: No New Polls After Success

**Given** login succeeds at T=2500ms
**And** polling interval is 2000ms
**When** the interval is cleared immediately
**Then** no poll MUST fire at T=4000ms or later
**And** the interval ID MUST be null

---

### Requirement: Error Suppression for Late Responses

API errors that occur after `loginSuccessful` is set to true MUST be suppressed (not logged as errors, not counted toward consecutive error limit).

**Rationale**: Late-arriving responses from pre-success API calls will fail (HTTP 500) because the UUID is no longer valid. These errors are expected and harmless - they shouldn't alarm users or developers.

#### Scenario: Late 500 Error Suppressed

**Given** an API call is in-flight when login succeeds
**And** `loginSuccessful` is set to true
**When** the API call returns with HTTP 500
**Then** the error MUST NOT be logged at error level
**And** a debug message MUST be logged: "Ignoring polling error after successful login"
**And** the error MUST NOT increment `consecutiveErrors` counter
**And** no error UI MUST be shown to the user

#### Scenario: Pre-Success Errors Handled Normally

**Given** `loginSuccessful` is false
**When** an API call returns with HTTP 500
**Then** the error MUST be logged at error level
**And** `consecutiveErrors` MUST be incremented
**And** normal error handling MUST proceed (stopping polls after 3 failures)

---

### Requirement: Debug Logging for Polling Lifecycle

The polling mechanism MUST log debug-level messages at key decision points to aid troubleshooting.

**Rationale**: When race conditions occur, debug logs help developers understand the exact sequence of events without polluting production logs with errors.

#### Scenario: Debug Messages for All Paths

**When** `checkLoginStatus()` skips due to `loginSuccessful` flag
**Then** it MUST log: "Skipping poll - login already successful"

**When** a second flag check catches a race condition
**Then** it MUST log: "Race condition prevented - login succeeded during check"

**When** an error is suppressed post-success
**Then** it MUST log: "Ignoring polling error after successful login"

**And** all these logs MUST use `this.logger.debug()` (not error or warn)

---

### Requirement: Preserve Existing Error Handling

All existing error handling behavior (consecutive error counting, 3-failure threshold, error UI display) MUST remain unchanged for pre-success errors.

**Rationale**: The fix only affects post-success behavior. Pre-success errors are legitimate and need proper handling.

#### Scenario: Consecutive Error Limit Still Works

**Given** `loginSuccessful` is false
**When** 3 consecutive API errors occur
**Then** polling MUST stop
**And** `showError()` MUST be called with the error message
**And** the error UI MUST be displayed to the user

---

## MODIFIED Requirements

*None* - This change adds defensive checks but doesn't modify existing requirements.

## REMOVED Requirements

*None* - No requirements are being removed.

## Dependencies

### Internal Dependencies
- `AddAccountModal.loginSuccessful` (boolean flag)
- `AddAccountModal.pollInterval` (interval ID)
- `AddAccountModal.logger` (Logger instance)
- `AccountService.checkLoginStatus()` (unchanged)

### External Dependencies
None - purely internal logic changes.

## Testing Requirements

### Unit Tests

**Test File**: `src/__tests__/unit/ui/AddAccountModal.test.ts` (new)

Required test cases:

1. **Flag prevents redundant poll**
   - Mock `checkLoginStatus` to succeed
   - Set `loginSuccessful = true`
   - Call `checkLoginStatus()` again
   - Verify no API call made
   - Verify debug message logged

2. **Interval cleared immediately on success**
   - Mock `checkLoginStatus` to return account
   - Call `checkLoginStatus()`
   - Verify `clearInterval` called before `Notice` constructor
   - Verify `pollInterval` is null

3. **Late errors suppressed**
   - Mock first `checkLoginStatus` to succeed (set flag)
   - Mock second call to throw 500 error
   - Call `checkLoginStatus()` twice
   - Verify second error not logged at error level
   - Verify `consecutiveErrors` not incremented

4. **Pre-success errors handled normally**
   - Mock `checkLoginStatus` to throw 500
   - Call `checkLoginStatus()` 3 times
   - Verify errors logged
   - Verify polling stops
   - Verify error UI shown

### Integration Tests

**Manual Testing Procedure**:

1. Open Obsidian with plugin installed
2. Open AddAccountModal
3. Generate QR code
4. Scan with WeChat and authorize
5. **Verify in console**:
   - "Login successful" appears ✓
   - "Account added successfully" appears ✓
   - NO "API Request Failed" with 500 after success ✓
   - NO "Failed to get login result" after success ✓
6. **Verify UI**:
   - Success message shows
   - Modal closes cleanly after 1 second
   - No error toasts appear

### Regression Tests

**Existing Behavior to Verify**:
- QR code generation still works
- Login timeout (5 minutes) still works
- Consecutive error handling (3 failures) still works
- "Refresh QR Code" button still works
- Modal close cleanup still works

## Open Questions

*None* - The solution is clear and well-defined.

## Related Specs

*None* - This is a bugfix spec with no dependencies on other changes.
