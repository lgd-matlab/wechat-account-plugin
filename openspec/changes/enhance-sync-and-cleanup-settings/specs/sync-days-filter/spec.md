# Sync Days Filter

## ADDED Requirements

### Requirement: Sync Days Filter Setting
The system MUST provide a configurable time window for article synchronization that controls how far back in history articles are fetched and saved.

**Rationale**: Prevents database bloat from old articles that users don't need. Provides explicit control over sync history depth.

#### Scenario: User sets sync days filter in settings
**Given** the user opens the General Settings tab
**And** navigates to the Sync Settings section
**When** the user locates the "Sync Days Filter" setting
**Then** they see a number input with:
- Label: "Sync Days Filter"
- Description: "Only sync articles published within the last N days. Older articles will be ignored during sync."
- Default value: 30
- Min value: 1
- Max value: 365
- Unit indicator: "days"

#### Scenario: Sync respects days filter during article fetch
**Given** a feed has articles published over the last 60 days
**And** the user has set syncDaysFilter to 30 days
**When** a sync operation runs
**Then** only articles published within the last 30 days are saved to the database
**And** articles older than 30 days are filtered out before database insertion
**And** the sync result indicates how many articles were filtered

#### Scenario: Sync filter applies to all sync operations
**Given** syncDaysFilter is set to 7 days
**When** any of these operations run:
- Manual "Sync Now" button
- Automatic scheduled sync
- Single feed refresh
**Then** the 7-day filter is applied consistently
**And** no articles older than 7 days are saved

#### Scenario: Changing sync filter doesn't affect existing articles
**Given** the database contains articles from the last 60 days
**And** the user changes syncDaysFilter from 30 to 7 days
**When** the setting is saved
**Then** existing articles in the database remain unchanged
**And** only future sync operations respect the new 7-day filter
**And** users must use "Clean Up Old Articles" to remove existing old articles

#### Scenario: Sync filter validation
**Given** the user is editing the syncDaysFilter setting
**When** they enter a value outside the 1-365 range
**Then** the input shows a validation error
**And** the save button is disabled until a valid value is entered
**And** the error message states "Please enter a value between 1 and 365 days"

#### Scenario: Sync filter default for new installations
**Given** a fresh installation of the plugin
**When** the settings are initialized
**Then** syncDaysFilter defaults to 30 days
**And** this matches the existing articleRetentionDays default
**And** provides reasonable initial behavior

### Requirement: Settings Type Definition
The `WeWeRssSettings` interface MUST include the sync days filter setting with proper TypeScript typing.

**Rationale**: Ensures type safety and IDE autocomplete throughout the codebase.

#### Scenario: Settings interface includes syncDaysFilter
**Given** the TypeScript compiler processes `src/types/index.ts`
**When** the `WeWeRssSettings` interface is evaluated
**Then** it includes:
```typescript
syncDaysFilter: number; // Only sync articles from last N days (1-365)
```
**And** `DEFAULT_SETTINGS` includes:
```typescript
syncDaysFilter: 30
```

#### Scenario: Type safety in services
**Given** a service accesses `this.plugin.settings.syncDaysFilter`
**When** TypeScript type checking runs
**Then** the property is recognized as `number`
**And** no type errors are raised
**And** IDE provides autocomplete

### Requirement: Sync Service Filtering Logic
The SyncService MUST filter articles during sync operations based on the syncDaysFilter setting.

**Rationale**: Core implementation of the filtering feature. Must be applied at the right point to prevent old articles from entering the database.

#### Scenario: Filter calculation
**Given** syncDaysFilter is set to N days
**When** a sync operation calculates the threshold
**Then** the threshold timestamp equals:
```
Date.now() - (N * 24 * 60 * 60 * 1000)
```
**And** articles with `publishedAt < threshold` are filtered out

#### Scenario: Filter applied before database insertion
**Given** the API returns 50 articles
**And** 20 articles are older than syncDaysFilter
**When** the sync processes these articles
**Then** only 30 articles are passed to `articleRepository.create()`
**And** the 20 old articles are never inserted into the database
**And** the sync result includes `articlesFiltered: 20`

#### Scenario: Filter logging
**Given** sync filtering removes old articles
**When** the filtering occurs
**Then** a debug log entry is created:
```
"Filtered ${count} articles older than ${syncDaysFilter} days"
```
**And** this helps users understand why article counts differ from API response

## MODIFIED Requirements

None - this is a new feature addition.

## REMOVED Requirements

None - no existing functionality is removed.
