# Tasks: Metrics Gallery

**Input**: Design documents from `/specs/005-metrics-gallery/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/`, `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and module structure for metrics gallery

- [x] T001 Create metrics module directory structure at src/metrics/
- [x] T002 [P] Create metrics types file at src/metrics/types.ts
- [x] T003 [P] Create CLI collect command file at src/cli/cmd/collect.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core registry and resolution infrastructure that MUST be complete before ANY user story can be implemented

**Warning**: No user story work can begin until this phase is complete

- [x] T004 Create MetricTemplate interface in src/metrics/types.ts
  - Import UnitType from src/metrics/units/types.ts
  - Define unit field as: unit?: UnitType (semantic type, not string)
- [x] T005 Create built-in metrics registry structure in src/metrics/registry.ts
- [x] T006 Create resolver module skeleton in src/metrics/resolver.ts
- [x] T007 Extend MetricConfig schema to support optional $ref in src/config/schema.ts

**Checkpoint**: Foundation ready - unit types phase can now begin

---

## Phase 3: Unit Types Infrastructure

**Purpose**: Implement semantic unit types for consistent value formatting across HTML reports and PR comments

**Warning**: Unit types must be complete before built-in metrics can be defined with correct units

### Unit Type Implementation

- [ ] T008 [P] Create UnitType type definition in src/metrics/units/types.ts
  - Define: type UnitType = 'percent' | 'integer' | 'bytes' | 'duration' | 'decimal'
  - Export type for use across codebase

- [ ] T009 Create formatValue function in src/metrics/units/formatter.ts
  - Function signature: formatValue(value: number | null, unit: UnitType | null): string
  - Handle null values returning "N/A"
  - Implement percent formatting: 1 decimal, append %
  - Implement integer formatting: no decimals, thousands separator
  - Implement decimal formatting: 2 decimals
  - Call formatBytes for bytes unit
  - Call formatDuration for duration unit

- [ ] T010 [P] Implement formatBytes helper in src/metrics/units/formatter.ts
  - Auto-scale: B -> KB -> MB -> GB (thresholds at 1024)
  - Show 1 decimal for KB/MB/GB, 0 for B
  - Examples: "500 B", "1.5 KB", "2.3 MB", "1.1 GB"

- [ ] T011 [P] Implement formatDuration helper in src/metrics/units/formatter.ts
  - Input is seconds
  - Auto-scale: < 1s -> ms, < 60s -> s, < 3600s -> m+s, else h+m
  - Examples: "500ms", "45s", "1m 30s", "1h 5m"

- [ ] T012 Implement formatDelta function in src/metrics/units/formatter.ts
  - Function signature: formatDelta(delta: number, unit: UnitType | null): string
  - Apply same formatting rules as formatValue
  - Prefix with + or - sign
  - Examples: "+2.5%", "-256 KB", "+1m 15s"

- [ ] T013 [P] Implement formatInteger helper in src/metrics/units/formatter.ts
  - No decimal places
  - US locale thousands separator (1,234,567)

- [ ] T014 Create module index at src/metrics/units/index.ts
  - Export UnitType from types.ts
  - Export formatValue, formatDelta from formatter.ts

### Unit Type Validation

- [ ] T015 Add UnitTypeSchema to src/config/schema.ts
  - z.enum(["percent", "integer", "bytes", "duration", "decimal"])
  - Clear error message: "unit must be one of: percent, integer, bytes, duration, decimal"

- [ ] T016 Update MetricConfigSchema.unit to use UnitTypeSchema in src/config/schema.ts
  - Replace z.string().max(10) with UnitTypeSchema
  - Maintain optional behavior

### Unit Type Tests

- [ ] T017 [P] Add unit tests for formatValue with percent in tests/unit/metrics/units/formatter.test.ts
  - Test 85.5 -> "85.5%"
  - Test 100 -> "100%"
  - Test 0 -> "0%"

- [ ] T018 [P] Add unit tests for formatValue with integer in tests/unit/metrics/units/formatter.test.ts
  - Test 1234 -> "1,234"
  - Test 1234567 -> "1,234,567"
  - Test 0 -> "0"

- [ ] T019 [P] Add unit tests for formatBytes in tests/unit/metrics/units/formatter.test.ts
  - Test 500 -> "500 B"
  - Test 1536 -> "1.5 KB"
  - Test 1572864 -> "1.5 MB"
  - Test 1610612736 -> "1.5 GB"

- [ ] T020 [P] Add unit tests for formatDuration in tests/unit/metrics/units/formatter.test.ts
  - Test 0.5 -> "500ms"
  - Test 45 -> "45s"
  - Test 90 -> "1m 30s"
  - Test 3665 -> "1h 1m"

- [ ] T021 [P] Add unit tests for formatDelta in tests/unit/metrics/units/formatter.test.ts
  - Test positive percent: +2.5 -> "+2.5%"
  - Test negative bytes: -262144 -> "-256 KB"
  - Test positive integer: +150 -> "+150"

- [ ] T022 [P] Add unit tests for null handling in tests/unit/metrics/units/formatter.test.ts
  - Test formatValue(null, "percent") -> "N/A"
  - Test formatValue(null, null) -> "N/A"

- [ ] T023 Add unit tests for UnitType validation in tests/unit/config/schema.test.ts
  - Test valid units pass: "percent", "integer", "bytes", "duration", "decimal"
  - Test invalid unit fails with clear error message
  - Test missing unit is allowed (optional)

**Checkpoint**: Unit types infrastructure complete - built-in metrics can now use semantic units

---

## Phase 4: User Story 1 - Quick setup with pre-defined metrics (Priority: P1)

**Goal**: Enable developers to reference built-in metrics by ID (e.g., `{"$ref": "coverage", "command": "..."}`) with automatic expansion to full metric definitions including units and types.

**Independent Test**: Add `{"$ref": "coverage", "command": "bun test --coverage ..."}` to unentropy.json, run metrics collection, verify coverage is collected with percent unit without requiring custom configuration.

### Implementation for User Story 1

- [x] T024 [P] [US1] Define coverage built-in metric in src/metrics/registry.ts
  - unit: "percent" (UnitType)
- [x] T025 [P] [US1] Define function-coverage built-in metric in src/metrics/registry.ts
  - unit: "percent" (UnitType)
- [x] T026 [P] [US1] Define loc built-in metric in src/metrics/registry.ts
  - unit: "integer" (UnitType)
- [x] T027 [P] [US1] Define bundle-size built-in metric in src/metrics/registry.ts
  - unit: "bytes" (UnitType)
- [x] T028 [P] [US1] Define build-time built-in metric in src/metrics/registry.ts
  - unit: "duration" (UnitType)
- [x] T029 [P] [US1] Define test-time built-in metric in src/metrics/registry.ts
  - unit: "duration" (UnitType)
- [x] T030 [P] [US1] Define dependencies-count built-in metric in src/metrics/registry.ts
  - unit: "integer" (UnitType)
- [x] T031 [US1] Implement getBuiltInMetric lookup function in src/metrics/registry.ts
- [x] T032 [US1] Implement listAvailableMetricIds function in src/metrics/registry.ts
- [x] T033 [US1] Implement resolveMetricReference function in src/metrics/resolver.ts
- [x] T034 [US1] Implement validateBuiltInReference function in src/metrics/resolver.ts
- [x] T035 [US1] Add resolution step to loadConfig function in src/config/loader.ts
- [ ] T036 [US1] Add resolution step validation in src/config/loader.ts
- [x] T037 [P] [US1] Add unit test for built-in metrics registry in tests/unit/metrics/registry.test.ts
- [x] T038 [P] [US1] Add unit test for resolver with valid references in tests/unit/metrics/resolver.test.ts
- [x] T039 [P] [US1] Add unit test for resolver with invalid references in tests/unit/metrics/resolver.test.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can reference all 7 built-in metrics by ID.

---

## Phase 5: User Story 2 - Override built-in metric defaults (Priority: P2)

**Goal**: Enable developers to customize specific properties of built-in metrics (name, unit, etc.) while keeping other defaults, supporting flexible adaptation to project-specific requirements.

**Independent Test**: Reference `{"$ref": "coverage", "name": "custom-coverage", "command": "..."}` in config, verify custom name is used while other properties (unit, type) are preserved from built-in defaults.

### Implementation for User Story 2

- [ ] T040 [US2] Implement mergeMetricWithOverrides function in src/metrics/resolver.ts
- [ ] T041 [US2] Add override validation logic in src/metrics/resolver.ts
- [ ] T042 [US2] Update resolveMetricReference to support property overrides in src/metrics/resolver.ts
- [ ] T043 [US2] Add validation for merged metric config in src/metrics/resolver.ts
- [ ] T044 [P] [US2] Add unit test for name override in tests/unit/metrics/resolver.test.ts
- [ ] T045 [P] [US2] Add unit test for command override in tests/unit/metrics/resolver.test.ts
- [ ] T046 [P] [US2] Add unit test for unit override validation in tests/unit/metrics/resolver.test.ts
  - Test overriding unit with valid UnitType works
  - Test overriding unit with invalid value fails validation
- [ ] T047 [P] [US2] Add unit test for multiple property overrides in tests/unit/metrics/resolver.test.ts
- [ ] T048 [P] [US2] Add unit test for invalid override validation in tests/unit/metrics/resolver.test.ts
- [ ] T049 [US2] Add integration test for mixing built-in refs with overrides in tests/integration/gallery-config.test.ts
- [ ] T050 [US2] Add contract test for override property validation in tests/contract/gallery-schema.test.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can reference built-in metrics with or without overrides.

---

## Phase 6: CLI Helper Implementation (Optional Enhancement)

**Purpose**: Implement CLI helpers to simplify metric collection commands for standard formats

### LOC Collector (SCC-based)

- [x] T051 [P] [CLI] Create CLI collect command structure in src/cli/cmd/collect.ts
- [x] T052 [P] [CLI] Create LocOptions interface in src/metrics/collectors/loc.ts
  - TypeScript interface with path (required), excludePatterns? (optional), languageFilter? (optional)
  - Export interface for use by collectLoc function
  - Add JSDoc documentation
- [x] T053 [P] [CLI] Define SCC output type interfaces in src/metrics/collectors/loc.ts
  - SccLanguageResult interface: Name, Lines, Code, Comments, Blanks, Complexity
  - SccOutput type as array of SccLanguageResult
  - Document "Total" entry format
- [x] T054 [CLI] Implement collectLoc function in src/metrics/collectors/loc.ts
  - Async function: async collectLoc(options: LocOptions): Promise<number>
  - Execute: scc --format json <path> [--exclude-dir patterns...]
  - Parse JSON output and extract Code field from Total entry
  - Handle language filtering by finding matching language entry
  - Error handling: SCC unavailable, invalid path, missing Total, parsing failures
  - Return numeric LOC count
- [x] T055 [CLI] Add loc subcommand handler to src/cli/cmd/collect.ts
   - Command: "loc <path>"
   - Positional: path (required directory)
   - Options: --exclude (array), --language (string)
   - Handler calls collectLoc and outputs result to stdout
   - Register with yargs in CLI structure

### LOC Collector Tests

- [ ] T056 [P] [CLI] Add unit tests for LocOptions validation in tests/unit/metrics/collectors/loc.test.ts
  - Test valid option combinations compile
  - Test optional properties work correctly
  - Test TypeScript strict mode passes
- [ ] T057 [P] [CLI] Add unit tests for SCC output parsing in tests/unit/metrics/collectors/loc.test.ts
  - Test parsing valid SCC output with Total entry
  - Test error when Total entry missing
  - Test error on invalid JSON
  - Test multiple language entries handled correctly
- [ ] T058 [P] [CLI] Add unit tests for collectLoc with basic path in tests/unit/metrics/collectors/loc.test.ts
  - Test returns numeric value for valid directory
  - Test returns value >= 0
  - Test works with relative paths
  - Test works with absolute paths
  - Test idempotent (same result on multiple calls)
- [ ] T059 [P] [CLI] Add unit tests for collectLoc with excludePatterns in tests/unit/metrics/collectors/loc.test.ts
  - Test single exclude pattern passed to SCC
  - Test multiple exclude patterns handled
  - Test empty excludes array handled gracefully
  - Test excluded directories reduce count
- [ ] T060 [P] [CLI] Add unit tests for collectLoc with language filtering in tests/unit/metrics/collectors/loc.test.ts
  - Test language filter returns language-specific count
  - Test invalid language throws error
  - Test error message lists available languages
  - Test language count <= total count
- [ ] T061 [P] [CLI] Add unit tests for collectLoc error handling in tests/unit/metrics/collectors/loc.test.ts
  - Test SCC unavailable error with installation guidance
  - Test directory not found error
  - Test permission denied error
  - Test SCC returns no metrics error
  - Test malformed SCC JSON error
- [x] T062 [CLI] Add integration tests for "collect loc" CLI command in tests/integration/cli-loc-collector.test.ts
  - Use dedicated fixture: tests/fixtures/loc-collector/
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/src/
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/src/ --exclude dist node_modules
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/ --language TypeScript
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/src/ --exclude dist --language TypeScript
  - Test output is numeric and deterministic across runs on same fixture
  - Test exit code 0 on success
- [ ] T063 [CLI] Add CLI error handling tests in tests/integration/cli-loc-collector.test.ts
  - Test missing required path argument error
  - Test invalid flag format error
  - Test --help displays all options
  - Test unknown flag rejected
  - Test invalid directory error
  - Test exit code non-zero on error

### LOC Contract Tests

- [ ] T064 [P] [CLI] Add contract test for loc metric reference in tests/contract/loc-metrics.test.ts
  - Test {"$ref": "loc"} resolves correctly
  - Test resolved metric has type: "numeric"
  - Test resolved metric has unit: "integer" (UnitType)
  - Test can override name, description, unit (must be valid UnitType)
  - Test configuration validation passes
  - Test multiple LOC references with different names work
- [ ] T065 [P] [CLI] Add contract test for LOC CLI helper output format in tests/contract/loc-metrics.test.ts
  - Test output is numeric integer
  - Test output is non-negative
  - Test output is reasonable (> 100 for unentropy repo)
  - Test output integrates with metric collection
  - Test value persists in storage
- [ ] T066 [CLI] Update loc metric in src/metrics/registry.ts with SCC command reference
  - Update description to: "Total lines of code in the codebase (excluding blanks and comments)"
  - Update command example to: "unentropy collect loc ./src/"
  - Add comment explaining SCC-based collection
  - Verify registry compiles correctly

### Other CLI Helpers

- [ ] T067 [P] [CLI] Implement coverage-lcov parser in src/metrics/collectors/lcov.ts
- [ ] T068 [P] [CLI] Implement coverage-json parser in src/metrics/collectors/coverage-json.ts  
- [ ] T069 [P] [CLI] Implement coverage-xml parser in src/metrics/collectors/coverage-xml.ts
- [ ] T070 [P] [CLI] Add integration tests for CLI helpers in tests/integration/cli-helpers.test.ts
- [ ] T071 [P] [CLI] Add contract tests for CLI helper outputs in tests/contract/cli-helpers.test.ts

**Checkpoint**: LOC collector complete with comprehensive testing. Other CLI helpers available for additional metric collection commands

---

## Phase 7: Report Integration

**Purpose**: Integrate unit type formatting into HTML reports and PR comments

### HTML Report Updates

- [ ] T072 Update formatValue in src/reporter/templates/default/components/formatUtils.ts
  - Import formatValue from src/metrics/units/formatter.ts
  - Replace existing implementation with unit-aware version
  - Handle legacy unit strings via migration helper

- [ ] T073 [P] Add parseLegacyUnit helper in src/metrics/units/formatter.ts
  - Map "%" -> "percent", "lines" -> "integer", "KB" -> "bytes", "seconds" -> "duration", "count" -> "integer"
  - Return null for unknown legacy units
  - Support both new UnitType and legacy strings

- [ ] T074 [P] Add unit tests for parseLegacyUnit in tests/unit/metrics/units/formatter.test.ts
  - Test "%" -> "percent"
  - Test "lines" -> "integer"
  - Test "KB" -> "bytes"
  - Test "seconds" -> "duration"
  - Test "count" -> "integer"
  - Test already valid UnitType passes through
  - Test unknown string -> null

- [ ] T075 Update report generator to pass unit to formatValue in src/reporter/generator.ts
  - Ensure unit from metric definition is passed to formatting functions

- [ ] T076 Add visual test for unit formatting in tests/fixtures/visual-review/
  - Add metrics with each unit type to fixture
  - Verify display in generated HTML report

**Checkpoint**: HTML reports now use semantic unit formatting

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T077 [P] Add JSDoc documentation to all public functions in src/metrics/units/
- [ ] T078 [P] Add JSDoc documentation to all public functions in src/metrics/
- [ ] T079 [P] Add error message improvements with available metric IDs in src/metrics/resolver.ts
- [ ] T080 [P] Update root-level unentropy.json to use built-in metric reference as example
- [ ] T081 Run build and typecheck to ensure no type errors
- [ ] T082 Run all tests to ensure full suite passes
- [ ] T083 Run quickstart.md validation with built-in metric examples
- [ ] T084 [US1] Enhance validateBuiltInReference with available IDs list in src/metrics/resolver.ts
- [ ] T085 [US1] Add error message tests for invalid reference scenarios in tests/unit/metrics/resolver.test.ts
- [ ] T086 [P] [US1] Organize built-in metrics by categories in src/metrics/registry.ts
- [ ] T087 [US1] Add getCategory function for metric organization in src/metrics/registry.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion
- **Unit Types (Phase 3)**: Depends on Setup completion - BLOCKS built-in metric definitions
- **User Story 1 (Phase 4)**: Depends on BOTH Foundational AND Unit Types completion
- **User Story 2 (Phase 5)**: Depends on User Story 1 completion
- **CLI Helpers (Phase 6)**: Can start after User Story 1 completion - Independent of User Story 2
- **Report Integration (Phase 7)**: Depends on Unit Types (Phase 3) completion
- **Polish (Phase 8)**: Depends on all desired phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational + Unit Types - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 completion (extends resolution logic with override support)
- **CLI Helpers (Optional)**: Can start after User Story 1 completion - Independent of User Story 2

### Within Each Phase

- Unit type helpers (T010, T011, T013) can run in parallel
- Built-in metric definitions (T024-T030) can run in parallel
- Registry lookup functions before resolver implementation
- Resolver implementation before config loader integration
- Implementation before tests
- Unit tests can run in parallel
- Integration and contract tests after implementation
- CLI helper parsers (T067-T069) can run in parallel after CLI command structure (T051)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- Unit type helpers marked [P] can run in parallel (T008, T010, T011, T013)
- Unit type tests marked [P] can run in parallel (T017-T022)
- All built-in metric definitions marked [P] can run in parallel (T024-T030)
- Unit tests for User Story 1 marked [P] can run in parallel (T037-T039)
- User Story 2 unit tests marked [P] can run in parallel (T044-T048)
- LOC collector interfaces marked [P] can run in parallel (T052, T053)
- LOC collector unit tests marked [P] can run in parallel (T056-T061)
- LOC contract tests marked [P] can run in parallel (T064, T065)
- Other CLI helper parsers marked [P] can run in parallel (T067-T069)
- Polish tasks marked [P] can run in parallel (T077-T080, T086)

---

## Parallel Example: Unit Types (Phase 3)

```bash
# Launch unit type helpers together:
Task: "Create UnitType type definition in src/metrics/units/types.ts"
Task: "Implement formatBytes helper in src/metrics/units/formatter.ts"
Task: "Implement formatDuration helper in src/metrics/units/formatter.ts"
Task: "Implement formatInteger helper in src/metrics/units/formatter.ts"

# Launch unit type tests together (after implementation):
Task: "Add unit tests for formatValue with percent"
Task: "Add unit tests for formatValue with integer"
Task: "Add unit tests for formatBytes"
Task: "Add unit tests for formatDuration"
Task: "Add unit tests for formatDelta"
Task: "Add unit tests for null handling"
```

---

## Parallel Example: User Story 1 (Phase 4)

```bash
# Launch all built-in metric definitions together:
Task: "Define coverage built-in metric in src/metrics/registry.ts"
Task: "Define function-coverage built-in metric in src/metrics/registry.ts"
Task: "Define loc built-in metric in src/metrics/registry.ts"
Task: "Define bundle-size built-in metric in src/metrics/registry.ts"
Task: "Define build-time built-in metric in src/metrics/registry.ts"
Task: "Define test-time built-in metric in src/metrics/registry.ts"
Task: "Define dependencies-count built-in metric in src/metrics/registry.ts"

# Launch all unit tests for User Story 1 together:
Task: "Add unit test for built-in metrics registry in tests/unit/metrics/registry.test.ts"
Task: "Add unit test for resolver with valid references in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for resolver with invalid references in tests/unit/metrics/resolver.test.ts"
```

---

## Parallel Example: User Story 2 (Phase 5)

```bash
# Launch all unit tests for User Story 2 together:
Task: "Add unit test for name override in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for command override in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for unit override validation in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for multiple property overrides in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for invalid override validation in tests/unit/metrics/resolver.test.ts"
```

---

## Parallel Example: LOC Collector (Phase 6)

```bash
# Launch LOC collector interfaces together (can start immediately after T051):
Task: "Create LocOptions interface in src/metrics/collectors/loc.ts"
Task: "Define SCC output type interfaces in src/metrics/collectors/loc.ts"

# Launch LOC unit tests together (after T054 collectLoc implementation):
Task: "Add unit tests for LocOptions validation in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for SCC output parsing in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc with basic path in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc with excludePatterns in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc with language filtering in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc error handling in tests/unit/metrics/collectors/loc.test.ts"

# Launch LOC contract tests together (after T065 implementation):
Task: "Add contract test for loc metric reference in tests/contract/loc-metrics.test.ts"
Task: "Add contract test for LOC CLI helper output format in tests/contract/loc-metrics.test.ts"
```

---

## Implementation Strategy

### MVP First (Unit Types + User Stories 1 + 2 + LOC Collector)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: Unit Types (CRITICAL - blocks built-in metric definitions)
4. Complete Phase 4: User Story 1
5. Complete Phase 6: LOC Collector (T051-T066) - High priority for out-of-box value
6. Complete Phase 5: User Story 2 (optional, can be parallel with Phase 6)
7. Complete Phase 7: Report Integration
8. **STOP and VALIDATE**: Test with quickstart examples including LOC collector
9. Deploy/demo if ready
10. Complete other CLI helpers and Phase 8 polish

### Incremental Delivery

1. Complete Setup + Foundational + Unit Types -> Foundation ready
2. Add User Story 1 -> Test independently -> Deploy/Demo (MVP! - 7 built-in metrics available by reference)
3. Add LOC Collector (Phase 6: T051-T066) -> Test independently -> Deploy/Demo (Enhanced MVP - primary out-of-box metric with SCC)
4. Add User Story 2 -> Test independently -> Deploy/Demo (Full feature - overrides supported)
5. Add Report Integration -> Test independently -> Deploy/Demo (Consistent formatting)
6. Add other CLI helpers + Phase 8 polish -> Deploy/Demo (Complete feature suite)
7. Each addition builds on previous without breaking existing functionality

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: Unit Types (Phase 3)
   - Developer B: Can prepare User Story 1 structure while A works on unit types
3. Once Unit Types complete:
   - Developer A: User Story 1 (built-in metrics + basic resolution)
   - Developer B: Can start User Story 2 tests while A works on implementation
4. After User Story 1 complete, immediately start LOC Collector (T051-T066):
   - Developer A: T052-T055 (interfaces + core implementation)
   - Developer B: T056-T065 (comprehensive testing)
   - Developer C (if available): T064-T065 contract tests in parallel
5. User Story 2 can proceed in parallel with LOC collector work
6. Report Integration can start after Unit Types complete
7. Other CLI helpers follow after LOC collector complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- [CLI] label indicates CLI helper implementation tasks
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Built-in metric commands follow contract specifications in contracts/built-in-metrics.md
- Built-in metrics use UnitType for semantic unit definitions (percent, integer, bytes, duration, decimal)
- LOC collector uses SCC as implementation detail (not exposed in naming or API)
- LOC collector supports directory exclusion (--exclude) and language filtering (--language)
- CLI helpers support standard formats (LCOV, JSON, XML, size, LOC) as documented in quickstart.md
- Schema extensions maintain backward compatibility with existing custom metrics
- Resolution happens during config loading before validation
- Error messages include available metric IDs for invalid references
- LOC is prioritized as primary "out of box" metric for maximum user value
- Unit type validation is strict - invalid unit values fail configuration validation
