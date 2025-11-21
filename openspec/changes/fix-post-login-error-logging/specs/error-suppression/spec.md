# Capability: Error Suppression After Successful Login

## Overview

**Capability**: Error Suppression After Successful Login
**Domain**: UI / Authentication
**Status**: Proposed

Ensure that after a successful QR code login, no HTTP 500 errors are logged to the console for in-flight requests to already-consumed UUIDs.

---

## ADDED Requirements

### Requirement: Suppress Post-Login Polling Errors

The system SHALL NOT log errors for polling requests that occur after login has successfully completed.

#### Scenario: Login Succeeds Before Poll Completes

**Given** a user has scanned a QR code and login is processing
**And** multiple polling requests are in-flight
**When** one polling request successfully returns account data
**And** `loginSuccessful` flag is set to true
**And** a subsequent in-flight request returns HTTP 500
**Then** the HTTP 500 error should not be logged to the console
**And** the HTTP 500 error should not be displayed to the user
**And** the AddAccountModal should remain in success state

---

### Requirement: Early Return on Login Success

The login status check method MUST immediately exit if login has already succeeded.

#### Scenario: Poll Executes After Success

**Given** login has successfully completed
**And** `loginSuccessful` flag is true
**When** `checkLoginStatus()` method is called
**Then** the method should return immediately without making any API calls
**And** no logs should be written
**And** the poll interval should remain cleared

---

## MODIFIED Requirements

### Requirement: Error Logging Severity

Error logging severity SHALL reflect whether errors are expected or unexpected.

#### Scenario: Transient Server Error During Active Polling

**Given** a QR code login is in progress
**And** login has not yet succeeded
**When** the server returns HTTP 500
**And** retry logic is active
**Then** the error should be logged at `debug` level on non-final attempts
**And** the error should only be logged at `error` level on final retry failure

#### Scenario: Expected Error After Login

**Given** login has successfully completed
**When** an in-flight request returns HTTP 500
**Then** no error should be logged
**And** the request should be silently ignored

---

## ADDED Requirements

### Requirement: Defensive Polling Cleanup

The polling mechanism MUST defensively prevent execution after login success.

#### Scenario: Interval Cleared on Success

**Given** a QR code login is in progress
**When** login successfully completes
**Then** the polling interval must be immediately cleared
**And** `loginSuccessful` flag must be set to true BEFORE clearing interval
**And** all future scheduled polls must be prevented from executing

---

## Implementation Notes

### Key Files
- `src/ui/modals/AddAccountModal.ts` (lines 144-211)
- `src/services/api/WeChatApiClient.ts` (lines 220-245)

### Critical Sequencing
1. Set `loginSuccessful = true` FIRST
2. Clear polling interval SECOND
3. In-flight requests check flag in catch block

### Acceptance Criteria
- [ ] Console output after successful login shows no HTTP 500 errors
- [ ] Real errors during login are still logged and shown to user
- [ ] No performance regression
- [ ] Existing unit tests pass
