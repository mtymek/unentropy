# Tasks: MVP Metrics Tracking System

**Input**: Design documents from `/specs/003-mvp-metrics-tracking/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification, but the quickstart guide includes comprehensive test examples. Following best practices, tests will be included for quality assurance.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Single project at repository root: `src/`, `tests/`
- GitHub Actions: `.github/actions/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [x] T001 Install dependencies: better-sqlite3, zod, @actions/core, @actions/github
- [x] T002 [P] Create directory structure: src/config/, src/database/, src/collector/, src/reporter/, src/actions/
- [x] T003 [P] Create directory structure: tests/unit/config/, tests/unit/database/, tests/unit/collector/, tests/unit/reporter/
- [x] T004 [P] Create directory structure: tests/integration/, tests/contract/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create TypeScript types for database entities in src/database/types.ts
- [x] T006 Implement database client with connection management in src/database/client.ts
- [x] T007 Implement database schema initialization in src/database/migrations.ts
- [x] T008 Implement database query functions (insert/upsert) in src/database/queries.ts
- [x] T009 [P] Write unit tests for database client in tests/unit/database/client.test.ts
- [x] T010 [P] Write unit tests for schema initialization in tests/unit/database/migrations.test.ts
- [x] T011 [P] Write unit tests for query functions in tests/unit/database/queries.test.ts

**Note**: Tests T009-T011 failed with better-sqlite3 incompatibility in Bun environment. Requires adapter pattern implementation.

**Checkpoint**: Database layer ready - user story implementation can now begin

---

## Phase 2.5: Database Adapter Layer (Blocking Fix)

**Purpose**: Enable database layer to work in both Bun (local development) and Node.js (GitHub Actions) environments

**Context**: better-sqlite3 native bindings don't work with Bun's incomplete N-API support. Both better-sqlite3 and bun:sqlite have highly compatible APIs, allowing a thin adapter layer.

- [x] T011a Define database adapter interface in src/database/adapters/interface.ts
- [x] T011b [P] Implement better-sqlite3 adapter in src/database/adapters/better-sqlite3.ts
- [x] T011c [P] Implement bun:sqlite adapter in src/database/adapters/bun-sqlite.ts
- [x] T011d Implement adapter factory with runtime detection in src/database/adapters/factory.ts
- [x] T011e Refactor DatabaseClient to use adapter pattern in src/database/client.ts
- [x] T011f Update database tests to work with both adapters in tests/unit/database/*.test.ts
- [x] T011g Verify tests pass with Bun locally
- [x] T011h Ensure CI tests still work with Node.js

**Checkpoint**: Database layer works in both Bun and Node.js environments ✅

---

## Phase 3: User Story 1 - Define Custom Metrics via Configuration (Priority: P1) 🎯 MVP

**Goal**: Users can define what code metrics they want to track through an `unentropy.json` configuration file, with validation that provides clear error messages

**Independent Test**: Create a configuration file with metric definitions and verify the system correctly reads and validates it, rejecting invalid configurations with actionable error messages

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T012 [P] [US1] Write unit test for valid config parsing in tests/unit/config/loader.test.ts
- [x] T013 [P] [US1] Write unit test for invalid metric names in tests/unit/config/schema.test.ts
- [x] T014 [P] [US1] Write unit test for duplicate metric names in tests/unit/config/schema.test.ts
- [x] T015 [P] [US1] Write unit test for type mismatches in tests/unit/config/schema.test.ts
- [x] T016 [P] [US1] Write unit test for empty/missing required fields in tests/unit/config/schema.test.ts
- [x] T017 [P] [US1] Write unit test for clear error messages in tests/unit/config/schema.test.ts

### Implementation for User Story 1

- [x] T018 [US1] Define Zod schemas in src/config/schema.ts (MetricConfigSchema, DatabaseConfigSchema, UnentropyConfigSchema)
- [x] T019 [US1] Export inferred TypeScript types in src/config/schema.ts (combined with T018)
- [x] T020 [US1] Implement config file loader with validation in src/config/loader.ts
- [x] T021 [US1] Implement custom error formatter for validation errors in src/config/loader.ts (integrated into schema.ts)

**Checkpoint**: Users can create unentropy.json with metrics and get validation feedback ✅

---

## Phase 4: User Story 2 - Collect Metrics in CI/CD Pipeline (Priority: P2)

**Goal**: CI/CD pipeline automatically collects defined metrics, stores them with timestamps and build metadata, handling partial failures gracefully

**Independent Test**: Run the data collection action in a CI environment with predefined metrics, verify data is captured and stored correctly with commit SHA, timestamps, and build context

### Tests for User Story 2

- [x] T022 [P] [US2] Write unit test for build context extraction in tests/unit/collector/context.test.ts
- [x] T023 [P] [US2] Write unit test for command execution in tests/unit/collector/runner.test.ts
- [x] T024 [P] [US2] Write unit test for command timeout handling in tests/unit/collector/runner.test.ts
- [x] T025 [P] [US2] Write unit test for environment variable passing in tests/unit/collector/runner.test.ts
- [x] T026 [P] [US2] Write unit test for numeric value parsing in tests/unit/collector/collector.test.ts
- [x] T027 [P] [US2] Write unit test for label value parsing in tests/unit/collector/collector.test.ts
- [x] T028 [P] [US2] Write unit test for partial failure handling in tests/unit/collector/collector.test.ts
- [x] T029 [US2] Write integration test for end-to-end collection workflow in tests/integration/collection.test.ts

### Implementation for User Story 2

- [x] T031 [P] [US2] Implement build context extraction in src/collector/context.ts
- [x] T032 [P] [US2] Implement command execution with timeout using Bun.spawn() in src/collector/runner.ts
- [x] T033 [US2] Implement metric value parser (numeric/label) in src/collector/collector.ts
- [x] T034 [US2] Implement main collection orchestration with retry logic in src/collector/collector.ts
- [x] T035 [US2] Implement error handling for partial metric failures in src/collector/collector.ts

**Checkpoint**: Metrics are collected and stored in SQLite database with build metadata

---

## Phase 5: User Story 3 - View Metric Trends in HTML Reports (Priority: P3)

**Goal**: Generate self-contained HTML reports showing metric trends over time with visual charts, viewable in any browser without external dependencies

**Independent Test**: Generate an HTML report from stored metric data, verify charts and trends display correctly in a browser, report works offline

**Status**: Core implementation and ALL TESTS complete ✅ (T036-T048f). Remaining: Visual acceptance testing (T048g-T048n).

### Tests for User Story 3

- [x] T036 [P] [US3] Write unit test for time-series data query in tests/unit/reporter/generator.test.ts
- [x] T037 [P] [US3] Write unit test for Chart.js config builder (numeric) in tests/unit/reporter/charts.test.ts
- [x] T038 [P] [US3] Write unit test for Chart.js config builder (label) in tests/unit/reporter/charts.test.ts
- [x] T039 [P] [US3] Write unit test for HTML template rendering in tests/unit/reporter/templates.test.ts
- [x] T040 [P] [US3] Write unit test for self-contained output validation in tests/unit/reporter/templates.test.ts
- [x] T041 [P] [US3] Write unit test for empty data handling in tests/unit/reporter/generator.test.ts
- [x] T042 [P] [US3] Write unit test for sparse data handling in tests/unit/reporter/generator.test.ts
- [x] T043 [US3] Write integration test for report generation workflow in tests/integration/reporting.test.ts
- [x] T043a [US3] Write unit test for XSS sanitization in metric names/descriptions in tests/unit/reporter/templates.test.ts
- [x] T043b [US3] Write unit test for summary statistics calculation (min/max/avg/trend) in tests/unit/reporter/generator.test.ts
- [x] T043c [US3] Write unit test for responsive breakpoint data attributes in tests/unit/reporter/templates.test.ts

### Implementation for User Story 3

- [x] T044 [P] [US3] Implement time-series query functions in src/database/queries.ts
- [x] T044a [US3] Implement getAllBuildContexts query in src/database/queries.ts (added for report metadata)
- [x] T045 [P] [US3] Implement Chart.js configuration builder in src/reporter/charts.ts
- [x] T046 [US3] Implement HTML template with Tailwind CSS and embedded Chart.js in src/reporter/templates.ts
- [x] T047 [US3] Implement report generator orchestration in src/reporter/generator.ts
- [x] T048 [US3] Add error handling for missing/invalid data in src/reporter/generator.ts
- [x] T048a [US3] Implement XSS sanitization for user-provided content in src/reporter/templates.ts
- [x] T048b [US3] Implement summary statistics calculator (min/max/avg/trend) in src/reporter/generator.ts
- [x] T048c [US3] Add responsive layout with Tailwind classes (mobile/tablet/desktop) in src/reporter/templates.ts
- [x] T048d [US3] Add dark mode support using Tailwind dark: variants in src/reporter/templates.ts
- [x] T048e [US3] Add print stylesheet for PDF export in src/reporter/templates.ts
- [x] T048f [US3] Add accessibility features (ARIA labels, semantic HTML) in src/reporter/templates.ts

### Visual Acceptance Testing for User Story 3

**Purpose**: Manual quality assurance for HTML template design, usability, and accessibility

- [x] T048g [US3] Create test fixture: minimal data (unentropy.json + 5 data points) in tests/fixtures/visual-review/minimal/
- [x] T048h [US3] Create test fixture: full-featured (4 metrics + 100 data points) in tests/fixtures/visual-review/full-featured/
- [x] T048i [US3] Create test fixture: sparse data (2 metrics + 3 data points) in tests/fixtures/visual-review/sparse-data/
- [x] T048j [US3] Create test fixture: edge cases (special chars, extreme values) in tests/fixtures/visual-review/edge-cases/
- [x] T048k [US3] Implement fixture generation script (generate-fixture command) in scripts/generate-fixture.ts
- [x] T048l [US3] Generate HTML reports from all 4 test fixtures
- [x] T048m [US3] Manual visual review: Complete all checklist items from contracts/visual-acceptance-criteria.md
- [x] T048n [US3] Document review findings and capture screenshots for documentation

**Checkpoint**: HTML reports can be generated from collected data and viewed in browser

---

## Phase 6: User Story 4 - Unentropy Self-Monitoring (Priority: P4)

**Goal**: Implement self-monitoring for Unentropy project to track test coverage and lines of code, serving as both demonstration and genuine project health monitoring

**Independent Test**: Implement the self-monitoring configuration in the Unentropy repository itself, verify metric collection works in CI, and generate reports showing actual project trends

### Testing Strategy for User Story 4

**Note**: Traditional unit/integration tests are not included for User Story 4 as they would be fragile and redundant. The self-monitoring workflow will be tested automatically through CI/CD execution:

**How User Story 4 Will Be Tested**:
1. **Configuration Validation**: The existing configuration validation tests (T012-T017) will validate the self-monitoring unentropy.json when CI runs
2. **Metric Collection**: CI workflow will execute the actual collection commands and verify they return valid numeric values
3. **Database Storage**: Existing database tests (T009-T011) ensure data persistence works correctly
4. **Report Generation**: Existing report tests (T036-T048) validate HTML generation from the collected data
5. **End-to-End Validation**: Each CI run will demonstrate the complete workflow working with real project data
6. **Visual Verification**: Generated reports will be available as CI artifacts for manual review

**Benefits of This Approach**:
- Tests real-world execution environment (GitHub Actions runners)
- Validates actual commands against real codebase
- No mock data - uses genuine project metrics
- Continuous validation with every commit
- Demonstrates Unentropy capabilities authentically

### Implementation for User Story 4

- [x] T075 [P] [US4] Create unentropy.json configuration in repository root with test coverage and LoC metrics
- [x] T076 [US4] Implement test coverage collection command in unentropy.json
- [x] T077 [US4] Implement lines of code collection command in unentropy.json
- [x] T078 [US4] Update .github/workflows/ci.yml to include metric collection step
- [x] T079 [US4] Add database artifact persistence to CI workflow
- [x] T080 [US4] Add report generation step to CI workflow
- [x] T081 [US4] Configure report artifact upload or PR comment integration
- [x] T082 [US4] Add workflow triggers for self-monitoring (on push, pull_request)
- [x] T083 [US4] Add documentation for self-monitoring setup in README.md
- [x] T084 [US4] Validate self-monitoring configuration works with existing test suite
- [x] T085 [US4] Test report generation with actual project data
- [x] T086 [US4] Ensure self-monitoring demonstrates Unentropy capabilities effectively

**Checkpoint**: Self-monitoring implementation complete and serving as live example

---

## Phase 7: GitHub Actions Integration

**Purpose**: Package functionality as GitHub Actions for easy CI/CD integration

**Note**: The find-database action is documented separately in specs/002-find-database/tasks.md.

### Tests for GitHub Actions

- [x] T049 [P] Write contract test for collect-metrics action inputs in tests/contract/collect-action.test.ts
- [x] T050 [P] Write contract test for collect-metrics action outputs in tests/contract/collect-action.test.ts
- [x] T051 [P] Write contract test for generate-report action inputs in tests/contract/report-action.test.ts
- [x] T052 [P] Write contract test for generate-report action outputs in tests/contract/report-action.test.ts
- [x] T053 [P] Write integration test for artifact upload/download in tests/integration/artifacts.test.ts

### GitHub Action: collect-metrics

- [x] T054 Create action metadata file .github/actions/collect-metrics/action.yml
- [x] T055 Implement action entrypoint with metric collection in src/actions/collect.ts
- [x] T056 Add input validation and error handling in src/actions/collect.ts
- [x] T057 Add output setting (metrics-collected, metrics-failed, database-path, build-id) in src/actions/collect.ts
- [x] T058 Create build script for action distribution in package.json

### GitHub Action: generate-report

- [x] T059 Create action metadata file .github/actions/generate-report/action.yml
- [x] T060 Implement action entrypoint with report generation in src/actions/report.ts
- [x] T061 Add time-range filtering logic in src/actions/report.ts
- [x] T062 Add output setting (report-path, metrics-count, data-points, time-range-start, time-range-end) in src/actions/report.ts
- [x] T063 Create build script for action distribution in package.json

**Checkpoint**: Both GitHub Actions are functional (collect-metrics, generate-report).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T064 [P] Add comprehensive logging throughout all modules
- [x] T065 [P] Optimize database queries with proper indexes
- [x] T066 [P] Add database VACUUM operation for maintenance
- [x] T067 [P] Add SRI hashes to CDN resources in HTML template
- [x] T068 [P] Create example unentropy.json configurations
- [x] T069 [P] Create example GitHub Actions workflows
- [x] T070 Update main exports in src/index.ts
- [x] T071 Run bun run lint and fix any issues
- [x] T072 Run bun run typecheck and fix any issues
- [x] T073 Run bun test and ensure all tests pass
- [x] T074 Run bun run build and verify output
- [x] T075 Validate against quickstart.md acceptance criteria

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **User Story 4 (Phase 6)**: Depends on User Stories 1, 2, and 3 being complete
- **GitHub Actions (Phase 7)**: Depends on User Stories 2 and 3 being complete
  - collect-metrics action: Depends on User Stories 1, 2 (config + collection)
  - generate-report action: Depends on User Story 3 (reporting)
  - find-database action: Documented in specs/002-find-database/
- **Polish (Phase 8)**: Depends on all phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) + User Story 1 complete (needs config loading)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) + User Story 2 complete (needs data collection)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) + User Stories 1, 2, and 3 complete (needs complete workflow)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Core types before implementation
- Implementation in order: data layer → business logic → integration
- Story complete before moving to next priority

### Parallel Opportunities

#### Phase 7 (GitHub Actions - Tests)
- T049, T050, T051, T052, T053 can run in parallel (different test files)

#### Phase 8 (Polish)
- T064, T065, T066, T067, T068, T069 can all run in parallel (different concerns)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write unit test for valid config parsing in tests/unit/config/loader.test.ts"
Task: "Write unit test for invalid metric names in tests/unit/config/schema.test.ts"
Task: "Write unit test for duplicate metric names in tests/unit/config/schema.test.ts"
Task: "Write unit test for type mismatches in tests/unit/config/schema.test.ts"
Task: "Write unit test for empty/missing required fields in tests/unit/config/schema.test.ts"
Task: "Write unit test for clear error messages in tests/unit/config/schema.test.ts"
```

## Parallel Example: GitHub Actions Workflow

```bash
# Launch all GitHub Actions tests together:
Task: "Write contract test for collect-metrics action inputs in tests/contract/collect-action.test.ts"
Task: "Write contract test for collect-metrics action outputs in tests/contract/collect-action.test.ts"
Task: "Write contract test for generate-report action inputs in tests/contract/report-action.test.ts"
Task: "Write contract test for generate-report action outputs in tests/contract/report-action.test.ts"
Task: "Write integration test for artifact upload/download in tests/integration/artifacts.test.ts"
```

**Note**: The find-database action tests are documented in specs/002-find-database/tasks.md.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Review and refine before continuing

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (T001-T011)
2. Add User Story 1 → Test independently → Validate config system (T012-T021)
3. Add User Story 2 → Test independently → Validate collection (T022-T035)
4. Add User Story 3 → Test independently → Validate reporting (T036-T048)
5. Add User Story 4 → Implement self-monitoring → Validate via CI/CD (T075-T086)
6. Add GitHub Actions → Integrate with CI/CD (T049-T063)
7. Polish and optimize → Production ready (T064-T075)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T011)
2. Once Foundational is done:
   - Developer A: User Story 1 (T012-T021)
   - After US1: Developer A continues to User Story 2 (T022-T035)
   - After US2: Developer A continues to User Story 3 (T036-T048)
3. Once User Stories complete:
   - Developer B: User Story 4 (T075-T086)
   - Developer A: GitHub Actions (T049-T063)
4. Once US4 and Actions complete:
   - Developer A: Polish (T064-T075)

**Note**: This feature has sequential dependencies (US2 needs US1, US3 needs US2), so parallel team strategy is limited. Best approach is sequential with occasional parallel opportunities on tests and independent modules.

---

## Task Summary

- **Total Tasks**: 100
- **Phase 1 (Setup)**: 4 tasks (4 completed)
- **Phase 2 (Foundational)**: 7 tasks (7 completed) (BLOCKING)
- **Phase 2.5 (Database Adapter)**: 8 tasks (8 completed) (critical fix for Bun/Node.js compatibility)
- **Phase 3 (User Story 1)**: 10 tasks (10 completed) (6 tests + 4 implementation)
- **Phase 4 (User Story 2)**: 14 tasks (14 completed) (9 tests + 5 implementation)
- **Phase 5 (User Story 3)**: 26 tasks (26 completed) (13 tests + 13 implementation including visual acceptance)
- **Phase 6 (User Story 4)**: 12 tasks (12 completed) (0 tests + 12 implementation) - Tested via CI/CD execution
- **Phase 7 (GitHub Actions)**: 20 tasks (20 completed) - All three actions complete with clean separation of concerns

### Current Status: 100/100 tasks completed (100%) ✅

### Parallel Opportunities Identified

- **15 parallel opportunities** in tests across all user stories (all completed)
- **10 parallel opportunities** in implementation across different modules (all completed)
- **6 parallel opportunities** in polish phase (all completed)

### Remaining Work: NONE ✅

**Phase 7 - GitHub Actions (COMPLETED)**:
- ✅ Refactor collect-metrics action to remove embedded database finding logic
- ✅ Refactor generate-report action to remove embedded database finding logic
- ✅ Update workflow examples to use three-action pattern
- ✅ Update documentation with three-action architecture examples

### MVP Scope (Recommended)

**Minimum Viable Product** = Phase 1 + Phase 2 + Phase 3 (User Story 1 only)

This delivers:
- ✅ Configuration file support
- ✅ Metric definition and validation
- ✅ Clear error messages
- ✅ Foundation for metrics system
- ❌ Collection (Phase 4)
- ❌ Reporting (Phase 5)
- ❌ GitHub Actions (Phase 6)

**Realistic MVP** = Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 + Phase 7

This delivers complete end-to-end functionality:
- ✅ Configuration system
- ✅ Metric collection in CI/CD
- ✅ HTML report generation
- ✅ Self-monitoring demonstration
- ✅ GitHub Actions integration
- ✅ All user stories functional

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable at its checkpoint
- Verify tests fail before implementing (TDD approach)
- Run lint/typecheck frequently during development
- Commit after each logical group of tasks
- Stop at any checkpoint to validate story independently
- Database schema is foundational and blocks all stories
- User stories have sequential dependencies in this feature
- User Story 4 (self-monitoring) serves as both demonstration and genuine project monitoring

## Three-Action Architecture Update

**Planned 3-action design (COMPLETED)**:
- **find-database**: ✅ **IMPLEMENTED** - Handles GitHub API calls to locate and download latest database artifact
- **collect-metrics**: ✅ **IMPLEMENTED** - Clean implementation with no embedded database finding logic
- **generate-report**: ✅ **IMPLEMENTED** - Clean implementation with no embedded database finding logic

**Current State**: ✅ **Three-action architecture with separated concerns**
**Target State**: ✅ **ACHIEVED**

**Benefits of three-action design**:
- ✅ Separation of concerns (each action has single responsibility)
- ✅ Better error handling and debugging
- ✅ Reusable database finding logic
- ✅ Cleaner workflow definitions
- ✅ Independent testing and versioning of each action

**Migration Path**: ✅ **COMPLETED**
1. ✅ Implement find-database action
2. ✅ Refactor collect-metrics to remove database finding logic
3. ✅ Refactor generate-report to remove database finding logic
4. ✅ Update workflow examples to use three-action pattern
