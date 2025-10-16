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

- [ ] T011a Define database adapter interface in src/database/adapters/interface.ts
- [ ] T011b [P] Implement better-sqlite3 adapter in src/database/adapters/better-sqlite3.ts
- [ ] T011c [P] Implement bun:sqlite adapter in src/database/adapters/bun-sqlite.ts
- [ ] T011d Implement adapter factory with runtime detection in src/database/adapters/factory.ts
- [ ] T011e Refactor DatabaseClient to use adapter pattern in src/database/client.ts
- [ ] T011f Update database tests to work with both adapters in tests/unit/database/*.test.ts
- [ ] T011g Verify tests pass with Bun locally
- [ ] T011h Ensure CI tests still work with Node.js

**Checkpoint**: Database layer works in both Bun and Node.js environments

---

## Phase 3: User Story 1 - Define Custom Metrics via Configuration (Priority: P1) 🎯 MVP

**Goal**: Users can define what code metrics they want to track through an `unentropy.json` configuration file, with validation that provides clear error messages

**Independent Test**: Create a configuration file with metric definitions and verify the system correctly reads and validates it, rejecting invalid configurations with actionable error messages

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [P] [US1] Write unit test for valid config parsing in tests/unit/config/loader.test.ts
- [ ] T013 [P] [US1] Write unit test for invalid metric names in tests/unit/config/schema.test.ts
- [ ] T014 [P] [US1] Write unit test for duplicate metric names in tests/unit/config/schema.test.ts
- [ ] T015 [P] [US1] Write unit test for type mismatches in tests/unit/config/schema.test.ts
- [ ] T016 [P] [US1] Write unit test for empty/missing required fields in tests/unit/config/schema.test.ts
- [ ] T017 [P] [US1] Write unit test for clear error messages in tests/unit/config/schema.test.ts

### Implementation for User Story 1

- [ ] T018 [US1] Define Zod schemas in src/config/schema.ts (MetricConfigSchema, DatabaseConfigSchema, UnentropyConfigSchema)
- [ ] T019 [US1] Export inferred TypeScript types in src/config/types.ts
- [ ] T020 [US1] Implement config file loader with validation in src/config/loader.ts
- [ ] T021 [US1] Implement custom error formatter for validation errors in src/config/loader.ts

**Checkpoint**: Users can create unentropy.json with metrics and get validation feedback

---

## Phase 4: User Story 2 - Collect Metrics in CI/CD Pipeline (Priority: P2)

**Goal**: CI/CD pipeline automatically collects defined metrics, stores them with timestamps and build metadata, handling partial failures gracefully

**Independent Test**: Run the data collection action in a CI environment with predefined metrics, verify data is captured and stored correctly with commit SHA, timestamps, and build context

### Tests for User Story 2

- [ ] T022 [P] [US2] Write unit test for build context extraction in tests/unit/collector/context.test.ts
- [ ] T023 [P] [US2] Write unit test for command execution in tests/unit/collector/runner.test.ts
- [ ] T024 [P] [US2] Write unit test for command timeout handling in tests/unit/collector/runner.test.ts
- [ ] T025 [P] [US2] Write unit test for environment variable passing in tests/unit/collector/runner.test.ts
- [ ] T026 [P] [US2] Write unit test for numeric value parsing in tests/unit/collector/collector.test.ts
- [ ] T027 [P] [US2] Write unit test for label value parsing in tests/unit/collector/collector.test.ts
- [ ] T028 [P] [US2] Write unit test for partial failure handling in tests/unit/collector/collector.test.ts
- [ ] T029 [US2] Write integration test for end-to-end collection workflow in tests/integration/collection.test.ts
- [ ] T030 [US2] Write integration test for concurrent collection simulation in tests/integration/concurrency.test.ts

### Implementation for User Story 2

- [ ] T031 [P] [US2] Implement build context extraction in src/collector/context.ts
- [ ] T032 [P] [US2] Implement command execution with timeout in src/collector/runner.ts
- [ ] T033 [US2] Implement metric value parser (numeric/label) in src/collector/collector.ts
- [ ] T034 [US2] Implement main collection orchestration with retry logic in src/collector/collector.ts
- [ ] T035 [US2] Implement error handling for partial metric failures in src/collector/collector.ts

**Checkpoint**: Metrics are collected and stored in SQLite database with build metadata

---

## Phase 5: User Story 3 - View Metric Trends in HTML Reports (Priority: P3)

**Goal**: Generate self-contained HTML reports showing metric trends over time with visual charts, viewable in any browser without external dependencies

**Independent Test**: Generate an HTML report from stored metric data, verify charts and trends display correctly in a browser, report works offline

### Tests for User Story 3

- [ ] T036 [P] [US3] Write unit test for time-series data query in tests/unit/reporter/generator.test.ts
- [ ] T037 [P] [US3] Write unit test for Chart.js config builder (numeric) in tests/unit/reporter/charts.test.ts
- [ ] T038 [P] [US3] Write unit test for Chart.js config builder (label) in tests/unit/reporter/charts.test.ts
- [ ] T039 [P] [US3] Write unit test for HTML template rendering in tests/unit/reporter/templates.test.ts
- [ ] T040 [P] [US3] Write unit test for self-contained output validation in tests/unit/reporter/templates.test.ts
- [ ] T041 [P] [US3] Write unit test for empty data handling in tests/unit/reporter/generator.test.ts
- [ ] T042 [P] [US3] Write unit test for sparse data handling in tests/unit/reporter/generator.test.ts
- [ ] T043 [US3] Write integration test for report generation workflow in tests/integration/reporting.test.ts

### Implementation for User Story 3

- [ ] T044 [P] [US3] Implement time-series query functions in src/database/queries.ts
- [ ] T045 [P] [US3] Implement Chart.js configuration builder in src/reporter/charts.ts
- [ ] T046 [US3] Implement HTML template with embedded Chart.js in src/reporter/templates.ts
- [ ] T047 [US3] Implement report generator orchestration in src/reporter/generator.ts
- [ ] T048 [US3] Add error handling for missing/invalid data in src/reporter/generator.ts

**Checkpoint**: HTML reports can be generated from collected data and viewed in browser

---

## Phase 6: GitHub Actions Integration

**Purpose**: Package functionality as GitHub Actions for easy CI/CD integration

### Tests for GitHub Actions

- [ ] T049 [P] Write contract test for collect-metrics action inputs in tests/contract/collect-action.test.ts
- [ ] T050 [P] Write contract test for collect-metrics action outputs in tests/contract/collect-action.test.ts
- [ ] T051 [P] Write contract test for generate-report action inputs in tests/contract/report-action.test.ts
- [ ] T052 [P] Write contract test for generate-report action outputs in tests/contract/report-action.test.ts
- [ ] T053 [P] Write integration test for artifact upload/download in tests/integration/artifacts.test.ts

### GitHub Action: collect-metrics

- [ ] T054 Create action metadata file .github/actions/collect-metrics/action.yml
- [ ] T055 Implement action entrypoint with artifact handling in src/actions/collect.ts
- [ ] T056 Add input validation and error handling in src/actions/collect.ts
- [ ] T057 Add output setting (metrics-collected, metrics-failed, database-path, build-id) in src/actions/collect.ts
- [ ] T058 Create build script for action distribution in package.json

### GitHub Action: generate-report

- [ ] T059 Create action metadata file .github/actions/generate-report/action.yml
- [ ] T060 Implement action entrypoint with artifact download in src/actions/report.ts
- [ ] T061 Add time-range filtering logic in src/actions/report.ts
- [ ] T062 Add output setting (report-path, metrics-count, data-points, time-range-start, time-range-end) in src/actions/report.ts
- [ ] T063 Create build script for action distribution in package.json

**Checkpoint**: Both GitHub Actions are functional and can be used in workflows

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T064 [P] Add comprehensive logging throughout all modules
- [ ] T065 [P] Optimize database queries with proper indexes
- [ ] T066 [P] Add database VACUUM operation for maintenance
- [ ] T067 [P] Add SRI hashes to CDN resources in HTML template
- [ ] T068 [P] Create example unentropy.json configurations
- [ ] T069 [P] Create example GitHub Actions workflows
- [ ] T070 Update main exports in src/index.ts
- [ ] T071 Run npm run lint and fix any issues
- [ ] T072 Run npm run typecheck and fix any issues
- [ ] T073 Run npm test and ensure all tests pass
- [ ] T074 Run npm run build and verify output
- [ ] T075 Validate against quickstart.md acceptance criteria

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **GitHub Actions (Phase 6)**: Depends on User Stories 2 and 3 being complete
- **Polish (Phase 7)**: Depends on all phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) + User Story 1 complete (needs config loading)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) + User Story 2 complete (needs data collection)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Core types before implementation
- Implementation in order: data layer → business logic → integration
- Story complete before moving to next priority

### Parallel Opportunities

#### Phase 1 (Setup)
- T002, T003, T004 can all run in parallel (different directories)

#### Phase 2 (Foundational)
- T009, T010, T011 can run in parallel (different test files)

#### Phase 3 (User Story 1 - Tests)
- T012, T013, T014, T015, T016, T017 can all run in parallel (independent test cases)

#### Phase 4 (User Story 2 - Tests)
- T022, T023, T024, T025, T026, T027, T028 can run in parallel (different test files)
- T031, T032 can run in parallel (different source files)

#### Phase 5 (User Story 3 - Tests)
- T036, T037, T038, T039, T040, T041, T042 can run in parallel (different test files)
- T044, T045 can run in parallel (different source files)

#### Phase 6 (GitHub Actions - Tests)
- T049, T050, T051, T052, T053 can run in parallel (different test files)

#### Phase 7 (Polish)
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
5. Add GitHub Actions → Integrate with CI/CD (T049-T063)
6. Polish and optimize → Production ready (T064-T075)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T011)
2. Once Foundational is done:
   - Developer A: User Story 1 (T012-T021)
   - After US1: Developer A continues to User Story 2 (T022-T035)
   - After US2: Developer A continues to User Story 3 (T036-T048)
3. Once User Stories complete:
   - Developer B: GitHub Actions (T049-T063)
   - Developer A: Polish (T064-T075)

**Note**: This feature has sequential dependencies (US2 needs US1, US3 needs US2), so parallel team strategy is limited. Best approach is sequential with occasional parallel opportunities on tests and independent modules.

---

## Task Summary

- **Total Tasks**: 75
- **Phase 1 (Setup)**: 4 tasks
- **Phase 2 (Foundational)**: 7 tasks (BLOCKING)
- **Phase 3 (User Story 1)**: 10 tasks (6 tests + 4 implementation)
- **Phase 4 (User Story 2)**: 14 tasks (9 tests + 5 implementation)
- **Phase 5 (User Story 3)**: 13 tasks (8 tests + 5 implementation)
- **Phase 6 (GitHub Actions)**: 15 tasks (5 tests + 10 implementation)
- **Phase 7 (Polish)**: 12 tasks

### Parallel Opportunities Identified

- **15 parallel opportunities** in tests across all user stories
- **8 parallel opportunities** in implementation across different modules
- **6 parallel opportunities** in polish phase

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

**Realistic MVP** = Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6

This delivers complete end-to-end functionality:
- ✅ Configuration system
- ✅ Metric collection in CI/CD
- ✅ HTML report generation
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
