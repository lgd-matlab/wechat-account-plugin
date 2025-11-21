# Adjust Sync Filter Default to 5 Days

## Status
**PROPOSED** - Awaiting approval

## Change ID
`adjust-sync-filter-default`

## Quick Summary
Changes the default `syncDaysFilter` setting from 30 days to 5 days to reduce initial sync overhead and database storage, better matching user expectations for recent article consumption.

## Impact
- **Scope**: Low - Only changes a default value
- **Risk**: Low - Existing installations unaffected
- **Effort**: 2 days
- **Breaking**: No

## Key Changes
1. Default `syncDaysFilter` value: 30 → 5 days
2. Settings UI description updated to mention new default
3. Documentation updated to reflect 5-day default
4. Tests updated to verify new default value

## Affected Users
- **New Users**: Will sync only last 5 days of articles by default (instead of 30)
- **Existing Users**: No change - their configured value is preserved

## Related Changes
- Builds on `enhance-sync-and-cleanup-settings` (which implemented the feature)
- This change only modifies the default value

## Files
- [`proposal.md`](./proposal.md) - Full proposal with rationale and alternatives
- [`tasks.md`](./tasks.md) - Implementation task breakdown
- [`specs/sync-filter-default/spec.md`](./specs/sync-filter-default/spec.md) - Detailed requirements

## Quick Start
For implementers:
1. Read proposal.md for context
2. Follow tasks.md in order
3. Refer to spec.md for validation criteria
4. Run full test suite before completion

## Testing Strategy
- Unit tests: Verify default value = 5
- Integration tests: Verify 5-day filtering works
- Manual tests: Fresh install + existing install scenarios
- Regression: All 390 tests must pass

## Documentation
Updated files:
- `src/types/index.ts` - Default value
- `src/ui/settings/WeWeRssSettingTab.ts` - UI text
- `openspec/project.md` - Project docs
- `CLAUDE.md` - Developer docs

## Timeline
- Spec creation: 0.5 day ✅
- Implementation: 0.5 day
- Testing: 0.5 day
- Documentation: 0.5 day
- **Total: 2 days**

## Approval Checklist
- [ ] Proposal reviewed and approved
- [ ] Specs written and validated
- [ ] Tasks clearly defined
- [ ] Impact assessment completed
- [ ] Backward compatibility ensured
- [ ] Ready for implementation

## Notes
- This is a user-requested change based on feedback
- 5 days better matches typical WeChat article consumption patterns
- Easy to revert if needed (single line change)
- Users can still configure any value between 1-365 days
