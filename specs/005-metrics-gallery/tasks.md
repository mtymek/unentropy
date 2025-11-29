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

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create MetricTemplate interface in src/metrics/types.ts
- [x] T005 Create built-in metrics registry structure in src/metrics/registry.ts
- [x] T006 Create resolver module skeleton in src/metrics/resolver.ts
- [x] T007 Extend MetricConfig schema to support optional $ref in src/config/schema.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick setup with pre-defined metrics (Priority: P1) 🎯 MVP

**Goal**: Enable developers to reference built-in metrics by ID (e.g., `{"$ref": "coverage"}`) without writing custom commands, with automatic expansion to full metric definitions including commands, units, and types.

**Independent Test**: Add `{"$ref": "coverage"}` to unentropy.json, run metrics collection, verify coverage is collected with % unit and appropriate command without requiring custom configuration.

### Implementation for User Story 1

- [x] T008 [P] [US1] Define coverage built-in metric in src/metrics/registry.ts
- [x] T009 [P] [US1] Define function-coverage built-in metric in src/metrics/registry.ts
- [x] T010 [P] [US1] Define loc built-in metric in src/metrics/registry.ts
- [x] T011 [P] [US1] Define bundle-size built-in metric in src/metrics/registry.ts
- [x] T012 [P] [US1] Define build-time built-in metric in src/metrics/registry.ts
- [x] T013 [P] [US1] Define test-time built-in metric in src/metrics/registry.ts
- [x] T014 [P] [US1] Define dependencies-count built-in metric in src/metrics/registry.ts
- [x] T015 [US1] Implement getBuiltInMetric lookup function in src/metrics/registry.ts
- [x] T016 [US1] Implement listAvailableMetricIds function in src/metrics/registry.ts
- [x] T017 [US1] Implement resolveMetricReference function in src/metrics/resolver.ts
- [x] T018 [US1] Implement validateBuiltInReference function in src/metrics/resolver.ts
- [x] T019 [US1] Add resolution step to loadConfig function in src/config/loader.ts
- [ ] T020 [US1] Add resolution step validation in src/config/loader.ts
- [x] T021 [P] [US1] Add unit test for built-in metrics registry in tests/unit/metrics/registry.test.ts
- [x] T022 [P] [US1] Add unit test for resolver with valid references in tests/unit/metrics/resolver.test.ts
- [x] T023 [P] [US1] Add unit test for resolver with invalid references in tests/unit/metrics/resolver.test.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can reference all 7 built-in metrics by ID.

---

## Phase 4: User Story 2 - Override built-in metric defaults (Priority: P2)

**Goal**: Enable developers to customize specific properties of built-in metrics (name, command, unit, etc.) while keeping other defaults, supporting flexible adaptation to project-specific requirements.

**Independent Test**: Reference `{"$ref": "coverage", "name": "custom-coverage"}` in config, verify custom name is used while other properties (command, unit, type) are preserved from built-in defaults.

### Implementation for User Story 2

- [ ] T026 [US2] Implement mergeMetricWithOverrides function in src/metrics/resolver.ts
- [ ] T027 [US2] Add override validation logic in src/metrics/resolver.ts
- [ ] T028 [US2] Update resolveMetricReference to support property overrides in src/metrics/resolver.ts
- [ ] T029 [US2] Add validation for merged metric config in src/metrics/resolver.ts
- [ ] T030 [P] [US2] Add unit test for name override in tests/unit/metrics/resolver.test.ts
- [ ] T031 [P] [US2] Add unit test for command override in tests/unit/metrics/resolver.test.ts
- [ ] T032 [P] [US2] Add unit test for multiple property overrides in tests/unit/metrics/resolver.test.ts
- [ ] T033 [P] [US2] Add unit test for invalid override validation in tests/unit/metrics/resolver.test.ts
- [ ] T034 [US2] Add integration test for mixing built-in refs with overrides in tests/integration/gallery-config.test.ts
- [ ] T035 [US2] Add contract test for override property validation in tests/contract/gallery-schema.test.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can reference built-in metrics with or without overrides.

---

## Phase 5: CLI Helper Implementation (Optional Enhancement)

**Purpose**: Implement CLI helpers to simplify metric collection commands for standard formats

### LOC Collector (SCC-based)

- [x] T042 [P] [CLI] Create CLI collect command structure in src/cli/cmd/collect.ts
- [x] T049 [P] [CLI] Create LocOptions interface in src/metrics/collectors/loc.ts
  - TypeScript interface with path (required), excludePatterns? (optional), languageFilter? (optional)
  - Export interface for use by collectLoc function
  - Add JSDoc documentation
- [x] T050 [P] [CLI] Define SCC output type interfaces in src/metrics/collectors/loc.ts
  - SccLanguageResult interface: Name, Lines, Code, Comments, Blanks, Complexity
  - SccOutput type as array of SccLanguageResult
  - Document "Total" entry format
- [x] T051 [CLI] Implement collectLoc function in src/metrics/collectors/loc.ts
  - Async function: async collectLoc(options: LocOptions): Promise<number>
  - Execute: scc --format json <path> [--exclude-dir patterns...]
  - Parse JSON output and extract Code field from Total entry
  - Handle language filtering by finding matching language entry
  - Error handling: SCC unavailable, invalid path, missing Total, parsing failures
  - Return numeric LOC count
- [x] T052 [CLI] Add loc subcommand handler to src/cli/cmd/collect.ts
   - Command: "loc <path>"
   - Positional: path (required directory)
   - Options: --exclude (array), --language (string)
   - Handler calls collectLoc and outputs result to stdout
   - Register with yargs in CLI structure

### LOC Collector Tests

- [ ] T053 [P] [CLI] Add unit tests for LocOptions validation in tests/unit/metrics/collectors/loc.test.ts
  - Test valid option combinations compile
  - Test optional properties work correctly
  - Test TypeScript strict mode passes
- [ ] T054 [P] [CLI] Add unit tests for SCC output parsing in tests/unit/metrics/collectors/loc.test.ts
  - Test parsing valid SCC output with Total entry
  - Test error when Total entry missing
  - Test error on invalid JSON
  - Test multiple language entries handled correctly
- [ ] T055 [P] [CLI] Add unit tests for collectLoc with basic path in tests/unit/metrics/collectors/loc.test.ts
  - Test returns numeric value for valid directory
  - Test returns value >= 0
  - Test works with relative paths
  - Test works with absolute paths
  - Test idempotent (same result on multiple calls)
- [ ] T056 [P] [CLI] Add unit tests for collectLoc with excludePatterns in tests/unit/metrics/collectors/loc.test.ts
  - Test single exclude pattern passed to SCC
  - Test multiple exclude patterns handled
  - Test empty excludes array handled gracefully
  - Test excluded directories reduce count
- [ ] T057 [P] [CLI] Add unit tests for collectLoc with language filtering in tests/unit/metrics/collectors/loc.test.ts
  - Test language filter returns language-specific count
  - Test invalid language throws error
  - Test error message lists available languages
  - Test language count <= total count
- [ ] T058 [P] [CLI] Add unit tests for collectLoc error handling in tests/unit/metrics/collectors/loc.test.ts
  - Test SCC unavailable error with installation guidance
  - Test directory not found error
  - Test permission denied error
  - Test SCC returns no metrics error
  - Test malformed SCC JSON error
- [x] T059 [CLI] Add integration tests for "collect loc" CLI command in tests/integration/cli-loc-collector.test.ts
  - Use dedicated fixture: tests/fixtures/loc-collector/
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/src/
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/src/ --exclude dist node_modules
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/ --language TypeScript
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/src/ --exclude dist --language TypeScript
  - Test output is numeric and deterministic across runs on same fixture
  - Test exit code 0 on success
- [ ] T060 [CLI] Add CLI error handling tests in tests/integration/cli-loc-collector.test.ts
  - Test missing required path argument error
  - Test invalid flag format error
  - Test --help displays all options
  - Test unknown flag rejected
  - Test invalid directory error
  - Test exit code non-zero on error

### LOC Contract Tests

- [ ] T061 [P] [CLI] Add contract test for loc metric reference in tests/contract/loc-metrics.test.ts
  - Test {"$ref": "loc"} resolves correctly
  - Test resolved metric has type: "numeric"
  - Test resolved metric has unit: "lines"
  - Test can override name, description, unit
  - Test configuration validation passes
  - Test multiple LOC references with different names work
- [ ] T062 [P] [CLI] Add contract test for LOC CLI helper output format in tests/contract/loc-metrics.test.ts
  - Test output is numeric integer
  - Test output is non-negative
  - Test output is reasonable (> 100 for unentropy repo)
  - Test output integrates with metric collection
  - Test value persists in storage
- [ ] T063 [CLI] Update loc metric in src/metrics/registry.ts with SCC command reference
  - Update description to: "Total lines of code in the codebase (excluding blanks and comments)"
  - Update command example to: "unentropy collect loc ./src/"
  - Add comment explaining SCC-based collection
  - Verify registry compiles correctly

### Other CLI Helpers

- [ ] T043 [P] [CLI] Implement coverage-lcov parser in src/metrics/collectors/coverage-lcov.ts
- [ ] T044 [P] [CLI] Implement coverage-json parser in src/metrics/collectors/coverage-json.ts  
- [ ] T045 [P] [CLI] Implement coverage-xml parser in src/metrics/collectors/coverage-xml.ts
- [ ] T047 [P] [CLI] Add integration tests for CLI helpers in tests/integration/cli-helpers.test.ts
- [ ] T048 [P] [CLI] Add contract tests for CLI helper outputs in tests/contract/cli-helpers.test.ts

**Checkpoint**: LOC collector complete with comprehensive testing. Other CLI helpers available for additional metric collection commands

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T036 [P] Add JSDoc documentation to all public functions in src/metrics/
- [ ] T037 [P] Add error message improvements with available metric IDs in src/metrics/resolver.ts
- [ ] T038 [P] Update root-level unentropy.json to use built-in metric reference as example
- [ ] T039 Run build and typecheck to ensure no type errors
- [ ] T040 Run all tests to ensure full suite passes
- [ ] T041 Run quickstart.md validation with built-in metric examples
- [ ] T049 [US1] Enhance validateBuiltInReference with available IDs list in src/metrics/resolver.ts
- [ ] T050 [US1] Add error message tests for invalid reference scenarios in tests/unit/metrics/resolver.test.ts
- [ ] T051 [P] [US1] Organize built-in metrics by categories in src/metrics/registry.ts
- [ ] T052 [US1] Add getCategory function for metric organization in src/metrics/registry.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 completion (extends resolution logic with override support)
- **CLI Helpers (Optional)**: Can start after User Story 1 completion - Independent of User Story 2

### Within Each User Story

- Built-in metric definitions (T008-T014) can run in parallel
- Registry lookup functions before resolver implementation
- Resolver implementation before config loader integration
- Implementation before tests
- Unit tests can run in parallel
- Integration and contract tests after implementation
- CLI helper parsers (T043-T046) can run in parallel after CLI command structure (T042)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- All built-in metric definitions marked [P] can run in parallel (T008-T014)
- Unit tests for User Story 1 marked [P] can run in parallel (T021-T023)
- User Story 2 unit tests marked [P] can run in parallel (T030-T033)
- LOC collector interfaces marked [P] can run in parallel (T049, T050)
- LOC collector unit tests marked [P] can run in parallel (T053-T058)
- LOC contract tests marked [P] can run in parallel (T061, T062)
- Other CLI helper parsers marked [P] can run in parallel (T043-T045)
- Polish tasks marked [P] can run in parallel (T036-T038)

---

## Parallel Example: User Story 1

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

## Parallel Example: User Story 2

```bash
# Launch all unit tests for User Story 2 together:
Task: "Add unit test for name override in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for command override in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for multiple property overrides in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for invalid override validation in tests/unit/metrics/resolver.test.ts"
```

---

## Parallel Example: LOC Collector (Phase 5)

```bash
# Launch LOC collector interfaces together (can start immediately after T042):
Task: "Create LocOptions interface in src/metrics/collectors/loc.ts"
Task: "Define SCC output type interfaces in src/metrics/collectors/loc.ts"

# Launch LOC unit tests together (after T051 collectLoc implementation):
Task: "Add unit tests for LocOptions validation in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for SCC output parsing in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc with basic path in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc with excludePatterns in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc with language filtering in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc error handling in tests/unit/metrics/collectors/loc.test.ts"

# Launch LOC contract tests together (after T062 implementation):
Task: "Add contract test for loc metric reference in tests/contract/loc-metrics.test.ts"
Task: "Add contract test for LOC CLI helper output format in tests/contract/loc-metrics.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 + LOC Collector)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. Complete Phase 5: LOC Collector (T049-T063) - High priority for out-of-box value
5. Complete Phase 4: User Story 2 (optional, can be parallel with Phase 5)
6. **STOP and VALIDATE**: Test with quickstart examples including LOC collector
7. Deploy/demo if ready
8. Complete other CLI helpers (coverage, etc.) and Phase 6 polish

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! - 7 built-in metrics available by reference)
3. Add LOC Collector (Phase 5: T049-T063) → Test independently → Deploy/Demo (Enhanced MVP - primary out-of-box metric with SCC)
4. Add User Story 2 → Test independently → Deploy/Demo (Full feature - overrides supported)
5. Add other CLI helpers + Phase 6 polish → Deploy/Demo (Complete feature suite)
6. Each addition builds on previous without breaking existing functionality

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (built-in metrics + basic resolution)
   - Developer B: Can start User Story 2 tests while A works on implementation
3. After User Story 1 complete, immediately start LOC Collector (T049-T063):
   - Developer A: T049-T052 (interfaces + core implementation)
   - Developer B: T053-T062 (comprehensive testing)
   - Developer C (if available): T061-T062 contract tests in parallel
4. User Story 2 can proceed in parallel with LOC collector work
5. Other CLI helpers follow after LOC collector complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- [CLI] label indicates CLI helper implementation tasks
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Built-in metric commands follow contract specifications in contracts/built-in-metrics.md
- LOC collector uses SCC as implementation detail (not exposed in naming or API)
- LOC collector supports directory exclusion (--exclude) and language filtering (--language)
- CLI helpers support standard formats (LCOV, JSON, XML, size, LOC) as documented in quickstart.md
- Schema extensions maintain backward compatibility with existing custom metrics
- Resolution happens during config loading before validation
- Error messages include available metric IDs for invalid references
- LOC is prioritized as primary "out of box" metric for maximum user value
