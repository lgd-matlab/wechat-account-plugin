# Change: Consolidate Stats Bar Display

**ID**: `consolidate-stats-bar-display`
**Status**: Draft
**Created**: 2025-11-20
**Type**: UI Enhancement

---

## Quick Summary

Transform the stats bar from displaying multiple separate stat items to a single consolidated inline display with separators.

### Before
```
[📚 5 feeds] [📄 120 articles] [⚠️ 23 unsynced] [🕒 Last sync: 2h ago]
```

### After
```
[📚 5 feeds | 📄 97 synced, 23 unsynced | 🕒 2h ago]
```

---

## Problem

The current stats bar shows statistics as separate disconnected items with gaps, creating visual clutter and making it harder to scan information at a glance.

---

## Solution

Consolidate all statistics into a single line with inline separators:
- Use `|` (pipe) to separate major sections (feeds, articles, time)
- Use `,` (comma) to separate related values within sections (synced, unsynced)
- Maintain conditional display (hide unsynced when 0, hide time when null)
- Preserve warning styling for unsynced articles

---

## Impact

### User Experience
- ✅ **Improved**: Cleaner, more compact display
- ✅ **Improved**: Easier to scan statistics at a glance
- ✅ **Maintained**: All information still visible
- ✅ **Maintained**: Warning indicators preserved

### Technical
- **Files Changed**: 2
  - `src/ui/views/WeWeRssSidebarView.ts` (30 lines modified)
  - `styles.css` (20 lines added/modified)
- **Breaking Changes**: None
- **Migration Required**: No
- **Test Impact**: Minimal (UI-only change)

### Risks
- **Low Risk**: Purely cosmetic change
- **Rollback**: Simple git revert
- **Dependencies**: None

---

## Documents

- 📋 [**Proposal**](./proposal.md) - Detailed problem statement and technical approach
- ✅ [**Tasks**](./tasks.md) - Step-by-step implementation checklist
- 📝 [**Specification**](./specs/stats-bar-display/spec.md) - Formal requirements with scenarios

---

## Implementation Estimate

- **Core Development**: 45 minutes
- **Testing**: 65 minutes
- **Documentation**: 25 minutes
- **Total**: ~2 hours 15 minutes

---

## Key Decisions

### ✅ Decided
1. **Separator Style**: Use `|` for sections, `,` within sections
2. **Implementation**: Multiple inline spans (not innerHTML for security)
3. **Conditional Display**: Hide unsynced when 0, time when null
4. **Responsive**: Horizontal scroll on narrow sidebars

### ❓ Open Questions
1. None currently - ready for implementation

---

## Approval Checklist

- [x] Problem clearly stated
- [x] Solution technically sound
- [x] Requirements documented with scenarios
- [x] Tasks broken down and estimable
- [x] Risks identified and acceptable
- [x] No open blockers
- [ ] Stakeholder approval (pending)
- [ ] Ready for implementation

---

## Next Steps

1. **Review**: Get feedback on separator style (`|` vs `•` vs `:`)
2. **Approve**: Confirm approach meets user expectations
3. **Implement**: Follow task checklist in `tasks.md`
4. **Test**: Manual testing per spec scenarios
5. **Document**: Update feature mapping and module docs
6. **Ship**: Include in next plugin release

---

## Related Links

- **Feature Mapping**: [FEATURE-CODE-MAPPING.md](../../../FEATURE-CODE-MAPPING.md#📊-侧边栏---统计信息栏)
- **Current Code**: [`WeWeRssSidebarView.ts:98-127`](../../../src/ui/views/WeWeRssSidebarView.ts#L98-L127)
- **Styles**: [`styles.css:25-46`](../../../styles.css#L25-L46)

---

**Last Updated**: 2025-11-20
**Maintainer**: TBD
