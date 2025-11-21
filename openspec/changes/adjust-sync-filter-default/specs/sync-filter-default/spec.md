# Sync Filter Default Value

## MODIFIED Requirements

### Requirement: Default Sync Days Filter Value
The `syncDaysFilter` setting MUST default to 5 days instead of 30 days for fresh installations, while preserving existing user configurations.

**Rationale**: User feedback indicates that 5 days of history is more appropriate for typical WeChat article consumption patterns, reducing database bloat and initial sync overhead while still capturing recent content.

#### Scenario: Fresh installation uses 5-day default
**Given** a user installs the WeWe RSS plugin for the first time
**And** no previous configuration exists
**When** the plugin initializes with default settings
**Then** `settings.syncDaysFilter` equals 5
**And** the settings UI displays "5" as the default value
**And** the setting description mentions "Default: 5 days"

#### Scenario: Sync operation uses 5-day default
**Given** a fresh installation with default settings
**And** the user adds a new WeChat public account feed
**When** the initial article sync runs
**Then** only articles published within the last 5 days are fetched
**And** articles older than 5 days are filtered out
**And** the sync log indicates filtered article count

#### Scenario: Existing installations preserve their configured value
**Given** an existing installation with `syncDaysFilter` set to 30 days
**When** the plugin updates to the new version with 5-day default
**Then** the user's configured value remains 30 days
**And** no automatic migration occurs
**And** sync behavior continues using 30 days

#### Scenario: Existing installations with default value keep 30 days
**Given** an existing installation that never explicitly changed syncDaysFilter
**And** the current value is 30 days (the old default)
**When** the plugin updates to the new version
**Then** the value remains 30 days
**And** the user's existing sync behavior is preserved
**And** no warning or notification is shown

**Note**: This ensures backward compatibility and respects existing user expectations, even if they didn't explicitly configure the setting.

#### Scenario: Settings UI shows correct default reference
**Given** a user opens the General Settings tab
**And** navigates to the Sync Settings section
**When** they view the "Sync Days Filter" setting
**Then** the description text reads:
```
Only sync articles published within the last N days. Older articles will be ignored during sync. (Default: 5 days)
```
**And** the input field shows the current configured value
**And** the placeholder or helper text indicates valid range (1-365)

#### Scenario: User can still configure full range
**Given** the new 5-day default is in effect
**When** a user wants to sync more historical articles
**Then** they can change syncDaysFilter to any value between 1 and 365
**And** values like 7, 14, 30, 90, 365 are all valid
**And** the sync operation respects the custom value
**And** no restrictions prevent using higher values

#### Scenario: Documentation reflects new default
**Given** the project documentation files exist
**When** a user reads the documentation
**Then** `openspec/project.md` mentions "5-day default for sync filter"
**And** `CLAUDE.md` reflects `syncDaysFilter: 5` in DEFAULT_SETTINGS
**And** all code comments reference 5 days where applicable
**And** no outdated "30 days" references remain in user-facing text

#### Scenario: Test suite verifies new default
**Given** the test suite includes setting tests
**When** tests run for default settings
**Then** a test case verifies `DEFAULT_SETTINGS.syncDaysFilter === 5`
**And** feed service tests use explicit retention values (not implicit defaults)
**And** integration tests verify 5-day filtering behavior
**And** all 390 existing tests continue to pass

### Requirement: Type Definition Consistency
The `WeWeRssSettings` interface and `DEFAULT_SETTINGS` constant MUST reflect the new 5-day default.

**Rationale**: Ensures type safety and consistency across the codebase.

#### Scenario: Type definition updated in src/types/index.ts
**Given** the TypeScript types file at `src/types/index.ts`
**When** the file is compiled
**Then** the interface includes:
```typescript
syncDaysFilter: number; // Only sync articles from last N days (1-365)
```
**And** `DEFAULT_SETTINGS` includes:
```typescript
syncDaysFilter: 5, // Only sync articles from last 5 days
```
**And** the comment reflects 5 days instead of 30 days

#### Scenario: TypeScript compilation succeeds
**Given** the default value is changed to 5
**When** `npm run build` executes
**Then** TypeScript compilation completes without errors
**And** no type mismatches occur
**And** the generated JavaScript includes the correct default

### Requirement: Backward Compatibility
Existing installations MUST NOT have their configured `syncDaysFilter` value automatically changed.

**Rationale**: Respects user expectations and prevents unexpected behavior changes during plugin updates.

#### Scenario: No migration script runs
**Given** a plugin update that changes the default to 5 days
**When** the plugin loads for an existing installation
**Then** no migration function executes
**And** the stored settings remain unchanged
**And** users see their previous sync behavior

#### Scenario: Settings file structure unchanged
**Given** the settings JSON structure
**When** the default value changes in code
**Then** the settings file format remains identical
**And** no new fields are added
**And** no fields are renamed or removed
**And** existing settings load without errors

### Requirement: User Interface Clarity
The settings UI MUST clearly indicate the default value and valid range for `syncDaysFilter`.

**Rationale**: Users need to understand what the default is and how to customize it.

#### Scenario: Setting description includes default mention
**Given** the Sync Settings section in General Settings
**When** the user views the "Sync Days Filter" setting
**Then** the description explicitly states "(Default: 5 days)"
**And** explains the purpose: "Only sync articles published within the last N days"
**And** clarifies behavior: "Older articles will be ignored during sync"

#### Scenario: Input validation preserved
**Given** the syncDaysFilter number input
**When** a user enters a value
**Then** validation enforces min=1 and max=365
**And** invalid values show error message
**And** save button is disabled for invalid values
**And** error message states "Please enter a value between 1 and 365 days"

## ADDED Requirements

None - this change only modifies an existing default value.

## REMOVED Requirements

None - no functionality is removed, only the default value changes.

## Cross-References

### Related Specifications
- **enhance-sync-and-cleanup-settings/specs/sync-days-filter**: Original implementation of `syncDaysFilter` setting
- This specification modifies only the default value, not the feature behavior

### Related Components
- `src/types/index.ts`: Default settings definition
- `src/ui/settings/WeWeRssSettingTab.ts`: Settings UI
- `src/services/FeedService.ts`: Sync filtering logic (unchanged)
- `src/services/SyncService.ts`: Sync orchestration (unchanged)

### Testing Requirements
- Unit test for `DEFAULT_SETTINGS.syncDaysFilter === 5`
- Integration test for 5-day filtering behavior
- Manual test for fresh installation
- Manual test for existing installation (no change)
- Regression test: All 390 tests pass
