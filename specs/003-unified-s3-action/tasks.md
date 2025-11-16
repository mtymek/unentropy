---

description: "Task list for unified S3-compatible storage action implementation"
---

# Tasks: Unified S3-Compatible Storage Action

**Input**: Design documents from `/specs/003-unified-s3-action/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: This feature explicitly defines a testing strategy and new test files in plan.md and research.md, so test tasks are included for each user story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project layout: `src/`, `tests/` at repository root
- GitHub Actions metadata in `.github/actions/`
- Workflows in `.github/workflows/`
- Feature design docs in `specs/003-unified-s3-action/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure dependencies and build scripts are ready for the unified track-metrics action and S3 provider.

- [x] T003 [P] Ensure `track-metrics` action build entry is configured in `scripts/build-actions.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core scaffolding that MUST be in place before implementing any user story-specific behavior.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [x] T004 Create skeleton unified action module exporting a `runTrackMetricsAction` entry point in `src/actions/track-metrics.ts`
- [x] T005 [P] Extend storage provider factory to accept a new `sqlite-s3` storage type (temporarily throwing a clear "not implemented" error) in `src/storage/providers/factory.ts`
- [x] T006 [P] Add placeholder `SqliteS3StorageProvider` class that implements the `StorageProvider` interface with stubbed methods in `src/storage/providers/sqlite-s3.ts`

**Checkpoint**: Unified action and S3 storage provider scaffolding exist and compile; user story tasks can now focus on concrete behavior.

---

## Phase 3: User Story 1 - Configure Storage Backend (Priority: P1) 🎯 MVP

**Goal**: Allow users to configure `storage.type` in `unentropy.json` to choose between `sqlite-local`, `sqlite-artifact`, and `sqlite-s3`, with sensible defaults and clear validation.

**Independent Test**: Set `storage.type` in `unentropy.json` to each supported value (or omit the block), then run the configuration validation path to verify that the system selects the correct backend, falls back to `sqlite-local` on invalid values with a warning, and never exposes S3 credentials in logs.

### Tests for User Story 1

- [x] T007 [P] [US1] Add configuration contract tests for `storage.type` values and defaults in `tests/contract/track-metrics-config.test.ts`
- [x] T008 [P] [US1] Extend config schema unit tests to cover the `storage` block and invalid `storage.type` values in `tests/unit/config/schema.test.ts`

### Implementation for User Story 1

- [x] T009 [P] [US1] Implement `StorageConfig` and `storage.type` JSON schema extension per config-schema contract in `src/config/schema.ts`
- [x] T010 [P] [US1] Implement runtime storage configuration parsing and defaulting (including fallback to `sqlite-local`) in `src/config/storage-schema.ts`
- [x] T011 [US1] Update configuration loader to populate storage settings and validate `storage.type` against allowed values in `src/config/loader.ts`
- [x] T012 [US1] Update storage selection logic to choose the correct provider based on `storage.type` (sqlite-local, sqlite-artifact, sqlite-s3) in `src/storage/providers/factory.ts`
- [x] T013 [US1] Update storage configuration examples and S3 setup section for `storage.type` in `specs/003-unified-s3-action/quickstart.md`

**Checkpoint**: User Story 1 is fully functional and independently testable via configuration and contract tests without requiring the full S3 workflow.

---

## Phase 4: User Story 2 - Run Complete Metrics Workflow with Single Action (Priority: P2)

**Goal**: Provide a unified GitHub Action that downloads the database from S3 (or creates it if missing), runs metric collection, uploads the updated database, and generates the HTML report in a single workflow step.

**Independent Test**: Configure S3 storage, run the unified `track-metrics` action in a workflow, and verify that it performs download (or create), collect, upload, and report phases in order, producing an updated database in S3 and a generated HTML report artifact.

### Tests for User Story 2

- [ ] T015 [P] [US2] Add contract tests for unified track-metrics workflow inputs/outputs in `tests/contract/track-metrics-workflow.test.ts`
- [ ] T016 [P] [US2] Add integration test covering end-to-end S3 workflow (download, collect, upload, report) in `tests/integration/s3-storage.test.ts`
- [x] T017 [P] [US2] Extend storage selection integration tests to cover sqlite-local, sqlite-artifact, and sqlite-s3 flows in `tests/integration/storage-selection.test.ts`

### Implementation for User Story 2

- [x] T018 [P] [US2] Implement S3 client adapter using Bun's built-in `S3Client` for core download/upload operations in `src/storage/providers/sqlite-s3.ts`
- [ ] T019 [P] [US2] Implement track-metrics workflow phases (download, collect, upload, report), phase metadata, and action input parsing/validation in `src/actions/track-metrics.ts`
- [ ] T020 [US2] Wire track-metrics action to use `createStorageProvider`, apply configuration precedence (action inputs overriding `unentropy.json`), and orchestrate the unified workflow using existing collector and reporter modules in `src/actions/track-metrics.ts`
- [ ] T021 [US2] Add example unified metrics workflow using the track-metrics action in `.github/workflows/track-metrics-example.yml`
- [x] T023 [P] [US2] Add unit tests for `SqliteS3StorageProvider` happy-path behavior in `tests/unit/storage/providers/sqlite-s3.test.ts`
- [ ] T024 [P] [US2] Add unit tests for track-metrics action orchestration (phase order, configuration precedence, and input validation) in `tests/unit/actions/track-metrics.test.ts`

**Checkpoint**: User Stories 1 and 2 are independently testable; the unified action can be run end-to-end with S3-backed storage.

---

## Phase 5: User Story 3 - Handle S3 Storage Failures Gracefully (Priority: P3)

**Goal**: Make S3-related failures (authentication, missing bucket, network issues, corruption) produce clear, actionable errors while preserving data and distinguishing recoverable vs permanent failures.

**Independent Test**: Simulate invalid credentials, missing bucket, network interruptions, and corrupted database files, then verify that the action retries transient failures, produces clear error messages and codes, and preserves the database even if report generation fails.

### Tests for User Story 3

- [ ] T027 [P] [US3] Add unit tests for S3 failure scenarios (authentication, missing bucket, permission errors) in `tests/unit/storage/providers/sqlite-s3.test.ts`
- [ ] T028 [P] [US3] Add integration tests for retry logic and error reporting under transient S3 failures in `tests/integration/s3-storage.test.ts`

### Implementation for User Story 3

- [ ] T029 [US3] Implement `WorkflowError` mapping and error categorization for storage, collection, report, and validation failures in `src/actions/track-metrics.ts`
- [ ] T030 [US3] Implement exponential backoff retry logic for retryable S3 operations in `src/storage/providers/sqlite-s3.ts`
- [ ] T031 [US3] Implement corrupted database detection and automatic recreation or recovery path in `src/storage/providers/sqlite-s3.ts`
- [ ] T032 [US3] Ensure the track-metrics action always prioritizes uploading a valid database even if report generation fails in `src/actions/track-metrics.ts`
- [ ] T033 [US3] Update action outputs to surface high-level error codes and sanitized messages without exposing secrets in `.github/actions/track-metrics/action.yml`
- [ ] T034 [US3] Update troubleshooting guidance for S3 failures (auth, network, corruption) in `specs/003-unified-s3-action/quickstart.md`

**Checkpoint**: All three user stories are independently functional, with robust failure handling and clear error reporting for S3 operations.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story improvements, documentation, and hardening once core stories are complete.

- [ ] T035 [P] Refresh unified action documentation to reflect final behavior and configuration in `specs/003-unified-s3-action/spec.md`
- [ ] T036 [P] Expand migration walkthrough from sqlite-artifact to sqlite-s3 storage in `specs/003-unified-s3-action/quickstart.md`
- [ ] T037 Perform code cleanup and refactoring for `SqliteS3StorageProvider` and workflow orchestration in `src/storage/providers/sqlite-s3.ts`
- [ ] T038 [P] Add any remaining unit tests for edge cases discovered during implementation in `tests/unit/storage/providers/sqlite-s3.test.ts`
- [ ] T039 Review credential handling and logging to ensure no secrets are ever logged in `src/actions/track-metrics.ts`
- [ ] T040 Run quickstart validation using the example workflows and adjust steps as needed in `specs/003-unified-s3-action/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies – can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion – BLOCKS all user stories; ensures basic scaffolding for the unified action and S3 provider exists.
- **User Stories (Phases 3–5)**: All depend on Foundational phase completion.
  - **User Story 1 (P1)**: Configuration and storage selection; should be completed first to establish storage behavior.
  - **User Story 2 (P2)**: Unified workflow orchestration; depends on US1 configuration semantics.
  - **User Story 3 (P3)**: Error handling and resilience; depends on US2 workflow behavior.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2; no dependencies on other stories.
- **User Story 2 (P2)**: Depends on US1 for `storage.type` semantics and storage selection being stable.
- **User Story 3 (P3)**: Depends on US2 for the full workflow pipeline; adds robustness and error handling.

### Within Each User Story

- Tests (T007–T008, T015–T017, T027–T028) should be written before corresponding implementation tasks.
- Config/schema work and providers before action orchestration.
- Action orchestration before workflow examples and documentation.
- Complete each story and its tests before moving to the next priority.

---

## Parallel Opportunities

- All Setup tasks marked `[P]` (T002, T003) can run in parallel.
- Foundational tasks T005 and T006 can run in parallel after T004 is in place.
- Within **User Story 1**:
  - T007 and T008 can run in parallel (separate test files).
  - T009 and T010 can run in parallel (separate config files) once tests exist.
- Within **User Story 2**:
  - T015, T016, and T017 can run in parallel (separate test files).
  - T018 and T021 can start in parallel after T005–T006, coordinating on final signatures.
  - T025 and T026 can run in parallel after core implementation.
- Within **User Story 3**:
  - T027 and T028 can run in parallel (unit vs integration tests).
  - T030 and T031 touch different aspects of S3 failure handling and can be developed in parallel once T029 is defined.
- Across stories, teams can split work once Phase 2 is complete, respecting the dependency chain US1 → US2 → US3 where behavior depends on earlier stories.

---

## Parallel Example: User Story 1

```bash
# Parallel test tasks for User Story 1
Task: "T007 [P] [US1] Add configuration contract tests in tests/contract/track-metrics-config.test.ts"
Task: "T008 [P] [US1] Extend config schema unit tests in tests/unit/config/schema.test.ts"

# Parallel implementation tasks for User Story 1 (after tests exist)
Task: "T009 [P] [US1] Implement StorageConfig schema in src/config/schema.ts"
Task: "T010 [P] [US1] Implement runtime storage configuration in src/config/storage-schema.ts"
```

---

## Parallel Example: User Story 2

```bash
# Parallel test tasks for User Story 2
Task: "T015 [P] [US2] Contract tests in tests/contract/track-metrics-workflow.test.ts"
Task: "T016 [P] [US2] S3 workflow integration tests in tests/integration/s3-storage.test.ts"
Task: "T017 [P] [US2] Storage selection integration tests in tests/integration/storage-selection.test.ts"

# Parallel implementation tasks for User Story 2 (after scaffolding)
Task: "T018 [P] [US2] Implement S3 adapter in src/storage/providers/sqlite-s3.ts"
Task: "T021 [P] [US2] Implement workflow phases in src/actions/track-metrics.ts"
Task: "T025 [P] [US2] SqliteS3StorageProvider unit tests in tests/unit/storage/providers/sqlite-s3.test.ts"
Task: "T026 [P] [US2] track-metrics action unit tests in tests/unit/actions/track-metrics.test.ts"
```

---

## Parallel Example: User Story 3

```bash
# Parallel test tasks for User Story 3
Task: "T027 [P] [US3] S3 failure unit tests in tests/unit/storage/providers/sqlite-s3.test.ts"
Task: "T028 [P] [US3] Retry and error reporting integration tests in tests/integration/s3-storage.test.ts"

# Parallel implementation tasks for User Story 3 (after US2 behavior is stable)
Task: "T030 [US3] Implement exponential backoff in src/storage/providers/sqlite-s3.ts"
Task: "T031 [US3] Implement corruption handling in src/storage/providers/sqlite-s3.ts"
Task: "T032 [US3] Ensure data preservation on report failure in src/actions/track-metrics.ts"
Task: "T033 [US3] Update error outputs in .github/actions/track-metrics/action.yml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003).
2. Complete Phase 2: Foundational scaffolding (T004–T006).
3. Complete Phase 3: User Story 1 configuration and tests (T007–T014).
4. **STOP and VALIDATE**: Run configuration and contract tests to confirm `storage.type` behavior without S3 workflow.
5. Demo configuration flexibility and backward compatibility.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready.
2. Add User Story 1 → Test independently → Demo configuration-only behavior.
3. Add User Story 2 → Test end-to-end S3 workflow → Demo single-action metrics run.
4. Add User Story 3 → Test failure handling and resilience → Demo robust error reporting.
5. Each story adds value without breaking previous stories; roll out progressively.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup (Phase 1) and Foundational (Phase 2) together.
2. Once Phase 2 is done:
   - Developer A: User Story 1 (config schema, loader, selection, docs).
   - Developer B: User Story 2 (S3 provider and unified action workflow).
   - Developer C: User Story 3 (error handling, retry logic, troubleshooting docs).
3. Stories integrate through shared configuration and storage abstractions while remaining independently testable.

---

## Notes

- `[P]` tasks touch different files or have no ordering dependencies and are safe for parallel execution.
- `[US1]`, `[US2]`, `[US3]` labels map tasks to specific user stories for traceability.
- Each user story is designed to be independently completable and testable, matching the "Independent Test" definitions in `spec.md`.
- Tasks reference concrete files so an LLM or developer can implement them without additional context.
- Avoid introducing cross-story dependencies that would prevent delivering User Story 1 as a minimal MVP.
