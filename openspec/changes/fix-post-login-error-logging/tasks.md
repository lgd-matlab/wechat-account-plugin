# Tasks: Fix Post-Login Error Logging

## Task Breakdown

### 1. Enhance Error Suppression in AddAccountModal
**File**: `src/ui/modals/AddAccountModal.ts`
**Estimated Time**: 10 minutes

- [ ] Immediately return from `checkLoginStatus()` if `loginSuccessful` is true (before try-catch)
- [ ] Add debug log at start of method showing flag status
- [ ] Verify error suppression works for all code paths

**Validation**:
- Run plugin and scan QR code
- Verify no errors logged after "Account added successfully"

---

### 2. Add Defensive Logging in WeChatApiClient
**File**: `src/services/api/WeChatApiClient.ts`
**Estimated Time**: 10 minutes

- [ ] Change error log level from `error` to `debug` for retry-able HTTP 500 errors
- [ ] Only log at `error` level on final failure
- [ ] Add context about which attempt failed

**Validation**:
- Check console shows reduced error noise
- Real errors still logged at error level

---

### 3. Improve Polling Cleanup
**File**: `src/ui/modals/AddAccountModal.ts`
**Estimated Time**: 10 minutes

- [ ] Add null check for `pollInterval` before each poll
- [ ] Clear interval immediately after setting `loginSuccessful` flag
- [ ] Add defensive check at start of `checkLoginStatus()`

**Validation**:
- Verify no polls execute after login success
- Check interval is properly cleared

---

### 4. Manual Testing
**Estimated Time**: 10 minutes

Test scenarios:
- [ ] Normal login flow (scan QR, complete login)
- [ ] Expired QR code (timeout)
- [ ] Server error during initial QR generation
- [ ] Multiple rapid logins

**Success Criteria**:
- Console clean after successful login
- Errors still shown for real failures
- No regression in functionality

---

## Total Estimated Time: 40 minutes

## Dependencies
- None (changes are isolated)

## Risk Level: Low
- Changes are defensive and additive
- No breaking changes to APIs
- Existing tests should pass unchanged
