# Proposal: Adjust Sync Filter Default to 5 Days

## Change ID
`adjust-sync-filter-default`

## Overview
This proposal changes the default value of the `syncDaysFilter` setting from 30 days to 5 days to better match user expectations for recent article synchronization while reducing database bloat from historical articles.

## Problem Statement

### Current Behavior
The `syncDaysFilter` setting currently defaults to 30 days, meaning that when users add a new feed, the plugin will attempt to sync and download articles from the last 30 days. This results in:

1. **Large initial sync overhead**: New feeds download a month of articles, which can be hundreds of articles per feed
2. **Database bloat**: Most users are primarily interested in very recent articles (last few days)
3. **Slower first sync**: The initial sync takes longer and uses more API requests
4. **Higher storage usage**: More articles stored than users typically need

### User Expectation
Based on user feedback, when adding a new feed, users expect to see only the most recent articles (last 5 days) rather than a full month of history. This aligns with typical content consumption patterns where:
- Users check feeds daily or every few days
- Older articles become less relevant quickly
- Users can always manually adjust the setting if they need deeper history

## Goals
1. Change the default `syncDaysFilter` value from 30 to 5 days
2. Maintain backward compatibility for existing installations
3. Ensure the setting remains user-configurable (1-365 days range preserved)
4. Update documentation to reflect the new default

## Non-Goals
- Changing the behavior of `syncDaysFilter` itself (only changing the default value)
- Modifying `articleRetentionDays` or other retention settings
- Adding automatic adjustment of the filter based on usage patterns
- Migrating existing user settings (users who explicitly set 30 days keep it)

## Success Criteria
1. Fresh installations default to `syncDaysFilter: 5`
2. Existing installations with default value (30) remain at 30
3. Existing installations with custom values remain unchanged
4. All existing tests pass
5. Documentation updated to mention 5-day default
6. UI help text updated to reflect new default

## Out of Scope
- Changing any other default settings
- Adding new sync filtering logic
- Modifying the sync algorithm
- Implementing smart defaults based on feed type

## Timeline
- Spec creation: 0.5 day
- Implementation: 0.5 day
- Testing: 0.5 day
- Documentation: 0.5 day
- Total: 2 days

## Dependencies
- Depends on existing `syncDaysFilter` setting (implemented in `enhance-sync-and-cleanup-settings`)
- No external dependencies

## Affected Components
- `src/types/index.ts` - Update `DEFAULT_SETTINGS.syncDaysFilter` from 30 to 5
- `src/ui/settings/WeWeRssSettingTab.ts` - Update description text to mention new default
- `openspec/project.md` - Update documentation
- `CLAUDE.md` - Update project documentation

## Related Changes
- `enhance-sync-and-cleanup-settings` - Original implementation of `syncDaysFilter`
- This change modifies only the default value, not the feature itself

## Alternatives Considered

### Alternative 1: Keep 30 Days Default
**Considered**: Maintain current default of 30 days
**Rejected**: User feedback indicates 30 days is too much historical data for typical use cases. Most users prefer recent articles only.

### Alternative 2: Use 1 Day Default
**Considered**: Set default to 1 day for minimal initial sync
**Rejected**: Too restrictive; users might miss articles if they don't sync daily. 5 days provides a reasonable buffer.

### Alternative 3: Use 7 Days Default
**Considered**: Set default to 7 days (one week)
**Rejected**: While reasonable, 5 days strikes a better balance between recency and coverage based on WeChat article publishing patterns.

### Alternative 4: Dynamic Default Based on Feed Type
**Considered**: Different defaults for different feed types (news vs blogs)
**Rejected**: Too complex; adds classification logic. Simple global default is easier to understand and maintain.

## Migration Strategy

### For Fresh Installations
- Simply use new default value of 5 days
- No migration needed

### For Existing Installations
**Option A (Recommended): No Migration**
- Existing users keep their current setting value
- Only fresh installations get new default
- Preserves user expectations and choices

**Option B: Migrate Default Values**
- Detect if user has default value (30 days)
- Change it to 5 days on plugin update
- Risk: Changes user's effective behavior without explicit consent

**Decision**: Use Option A (no migration) to respect existing user configurations and avoid unexpected behavior changes.

## Risks and Mitigations

### Risk 1: Existing users get confused by documentation mentioning 5 days
**Mitigation**: Settings UI shows actual current value, not default. Users will see their configured value.

### Risk 2: New users miss older articles
**Mitigation**:
- Clear description in settings explaining the filter
- Easy to change: "Only sync articles published within the last N days. Older articles will be ignored during sync."
- Wide range (1-365 days) allows easy adjustment

### Risk 3: Test fixtures assume 30 days
**Mitigation**: Review and update test fixtures to use explicit values rather than relying on defaults.

## Validation Plan

### Unit Tests
- Verify `DEFAULT_SETTINGS.syncDaysFilter === 5`
- Test that FeedService respects the 5-day filter
- Test that settings UI displays correct default

### Integration Tests
- Add new feed with default settings
- Verify only last 5 days of articles are fetched
- Verify older articles are filtered out

### Manual Testing
1. Fresh installation: Verify default is 5 days
2. Add feed: Verify only recent articles sync
3. Change setting: Verify new value takes effect
4. Existing installation: Verify no unexpected changes

## Documentation Updates

### Files to Update
1. `openspec/project.md`
   - Update "Current Features" section
   - Mention 5-day default for sync filter

2. `CLAUDE.md`
   - Update default settings documentation
   - Update AI usage guidelines if relevant

3. `src/ui/settings/WeWeRssSettingTab.ts`
   - Update setting description to say "Default: 5 days"

4. `README.md` (if exists)
   - Update feature list to mention 5-day sync default

## Rollback Plan

If issues arise:
1. Revert `DEFAULT_SETTINGS.syncDaysFilter` to 30
2. No data loss risk (only affects future syncs)
3. Existing articles remain in database
4. Rollback can be done with single-line code change

## Open Questions

None - this is a straightforward default value change.
