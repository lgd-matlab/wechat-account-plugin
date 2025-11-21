# OpenSpec Change Proposal Summary

## Change: fix-login-polling-race-condition

**Status**: ✅ Validated - Ready for Review
**Created**: 2025-11-19
**Validation**: Passed strict validation

---

## Quick Links

- **Proposal**: `openspec/changes/fix-login-polling-race-condition/proposal.md`
- **Specification**: `openspec/changes/fix-login-polling-race-condition/specs/login-polling-control/spec.md`
- **Tasks**: `openspec/changes/fix-login-polling-race-condition/tasks.md`

---

## Problem Summary

When users scan the QR code and successfully log in through AddAccountModal, the polling mechanism continues to run even after the account is created. This causes:

1. **HTTP 500 errors** flooding the console
2. **Poor user experience** with scary error messages
3. **Confusion** about whether login actually succeeded

### Root Cause

**Race condition in `src/ui/modals/AddAccountModal.ts` lines 144-219**:

- The `loginSuccessful` flag check happens too late
- Multiple polling intervals can fire before the flag stops them
- In-flight API requests complete even after success
- The UUID becomes invalid after successful login, causing 500 errors

### Evidence from User Report

```
[WeWe RSS] Login successful: 不要叫我细狗
[WeWe RSS] Account created successfully: 不要叫我细狗
[WeWe RSS] API Request Failed: status 500 ✗ (repeats many times)
[WeWe RSS] Failed to get login result: Error: Request failed, status 500 ✗
[WeWe RSS] Failed to check login status: {code: 'WeReadError500'...} ✗
```

---

## Solution Summary

Implement **three defensive layers** to stop polling immediately:

### Layer 1: Synchronous Flag Check
Check `loginSuccessful` flag BEFORE any async operations

### Layer 2: Immediate Interval Clearing
Clear the polling interval IMMEDIATELY on success (before UI updates)

### Layer 3: Error Suppression
Suppress errors from late-arriving API responses

---

## Impact Assessment

### Files Modified
- **1 file**: `src/ui/modals/AddAccountModal.ts`
- **1 method**: `checkLoginStatus()` (lines 144-219)

### Backwards Compatibility
✅ **100% compatible** - No API changes, no database changes, no breaking changes

### Test Coverage
- 4 new unit tests
- Manual testing procedure defined
- No regressions expected

### Risk Level
🟢 **Low Risk** - Isolated change, easily reversible

---

## Implementation Effort

**Total Estimated Time**: 3-4 hours

**Task Breakdown**:
1. Add synchronous flag check (15 min)
2. Add second flag check (10 min)
3. Verify interval clearing order (5 min)
4. Add error suppression (20 min)
5. Write unit tests (1.5 hours)
6. Manual testing (30 min)
7. Update documentation (20 min)
8. Code review and validation (30 min)

---

## Success Criteria

✅ No HTTP 500 errors in console after successful login
✅ Polling stops within <100ms of login success
✅ Clean console output (no scary errors)
✅ Modal closes smoothly
✅ All unit tests pass
✅ No regressions in existing tests

---

## Next Steps

1. **Review this proposal** with the development team
2. **Approve for implementation** if acceptable
3. **Execute tasks** in sequential order (see tasks.md)
4. **Test thoroughly** before merging
5. **Update release notes** in next version

---

## Commands

```bash
# View full proposal
openspec show fix-login-polling-race-condition

# View spec details
openspec show fix-login-polling-race-condition --deltas-only

# Validate again
openspec validate fix-login-polling-race-condition --strict

# List all changes
openspec list
```

---

**Proposal Created By**: AI Assistant
**Validated**: 2025-11-19
**Ready for Implementation**: Yes ✅
