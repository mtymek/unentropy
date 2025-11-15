---

description: "Task list for unified S3-compatible storage action implementation"
---

# Tasks: Track-Metrics S3-Compatible Storage Action

**Input**: Design documents from `/specs/003-unified-s3-action/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as this is a critical infrastructure component requiring comprehensive validation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below follow the plan.md structure for this unified action

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create track-metrics action directory structure per implementation plan
- [ ] T004 [P] Create GitHub Action metadata files in .github/actions/track-metrics/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create S3Storage class with Bun native S3 client in src/storage/s3.ts
- [ ] T006 [P] Implement storage configuration schema and merging in src/config/storage-schema.ts
- [ ] T007 [P] Create track-metrics action context class in src/storage/context.ts
- [ ] T008 [P] Implement workflow phase tracking in src/storage/workflow.ts
- [ ] T009 Create error handling utilities for S3 operations in src/storage/errors.ts
- [ ] T010 [P] Setup action input parsing, configuration merging, and validation in src/actions/track-metrics-inputs.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure Storage Backend (Priority: P1) 🎯 MVP

**Goal**: Enable users to specify S3 storage configuration and validate it properly

**Independent Test**: Configure S3 storage in unentropy.json, run action with valid/invalid credentials, verify proper validation and error messages

### Tests for User Story 1 ⚠️

- [ ] T011 [P] [US1] Contract test for storage configuration validation (S3 + artifact limited mode) in tests/contract/track-metrics-config.test.ts
- [ ] T012 [P] [US1] Unit test for storage factory limited-mode detection in tests/unit/storage/factory.test.ts
- [ ] T013 [P] [US1] Integration test for backend selection and artifact limited workflow in tests/integration/storage-selection.test.ts

### Implementation for User Story 1

- [ ] T014 [P] [US1] Implement storage configuration schema with precedence rules in src/config/storage-schema.ts
- [ ] T015 [US1] Create S3Storage constructor with merged configuration validation in src/storage/s3.ts
- [ ] T016 [US1] Implement storage type detection (S3 vs artifact-limited) in src/storage/factory.ts
- [ ] T017 [US1] Add configuration error handling with clear messages in src/storage/errors.ts
- [ ] T018 [US1] Update track-metrics action to handle storage configuration in src/actions/track-metrics.ts
- [ ] T019 [US1] Add logging for storage configuration validation in src/storage/context.ts
- [ ] T020 [US1] Implement artifact limited-mode workflow bridge (collect + report only) in src/actions/track-metrics.ts
- [ ] T021 [US1] Document required artifact download/upload steps in docs/track-metrics-action.md and README.md

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Run Complete Metrics Workflow (Priority: P2)

**Goal**: Implement end-to-end workflow orchestration (download, collect, upload, report)

**Independent Test**: Run track-metrics action with S3 configuration, verify all phases execute sequentially and produce valid report

### Tests for User Story 2 ⚠️

- [ ] T022 [P] [US2] Contract test for complete S3 workflow in tests/contract/track-metrics-workflow.test.ts
- [ ] T023 [P] [US2] Contract test for artifact limited workflow boundaries in tests/contract/track-metrics-artifact-limited.test.ts
- [ ] T024 [P] [US2] Integration test for end-to-end S3 workflow in tests/integration/s3-workflow.test.ts
- [ ] T025 [P] [US2] Unit test for workflow phase orchestration in tests/unit/storage/workflow.test.ts

### Implementation for User Story 2

- [ ] T026 [P] [US2] Implement database download from S3 in src/storage/s3.ts
- [ ] T027 [US2] Validate downloaded SQLite integrity and manage temp storage in src/storage/s3.ts
- [ ] T028 [P] [US2] Implement database upload to S3 in src/storage/s3.ts
- [ ] T029 [US2] Enforce authenticated download/upload requests in src/storage/s3.ts
- [ ] T030 [US2] Verify upload success (ETag/size) before completion in src/storage/s3.ts
- [ ] T031 [US2] Set correct SQLite content-type headers for uploads in src/storage/s3.ts
- [ ] T032 [US2] Create workflow phase execution engine in src/storage/workflow.ts
- [ ] T033 [US2] Integrate existing metric collection in src/storage/context.ts
- [ ] T034 [US2] Integrate existing report generation in src/storage/context.ts
- [ ] T035 [US2] Implement first-run database creation in src/storage/context.ts
- [ ] T036 [US2] Add progress logging for each workflow phase in src/storage/context.ts
- [ ] T037 [US2] Update track-metrics action main execution flow in src/actions/track-metrics.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Handle S3 Storage Failures Gracefully (Priority: P3)

**Goal**: Implement robust error handling and retry logic for S3 operations

**Independent Test**: Simulate various S3 failure scenarios (invalid credentials, network issues, missing bucket), verify actionable error messages and appropriate retry behavior

### Tests for User Story 3 ⚠️

- [ ] T038 [P] [US3] Contract test for error scenarios in tests/contract/track-metrics-errors.test.ts
- [ ] T039 [P] [US3] Integration test for S3 failure handling in tests/integration/s3-failures.test.ts
- [ ] T040 [P] [US3] Unit test for retry logic in tests/unit/storage/retry.test.ts

### Implementation for User Story 3

- [ ] T041 [P] [US3] Implement exponential backoff retry logic in src/storage/retry.ts
- [ ] T042 [US3] Create S3-specific error categorization in src/storage/errors.ts
- [ ] T043 [US3] Add authentication failure handling in src/storage/s3.ts
- [ ] T044 [US3] Add network connectivity error handling in src/storage/s3.ts
- [ ] T045 [US3] Implement bucket access error handling in src/storage/s3.ts
- [ ] T046 [US3] Add data preservation priority (upload succeeds even if report fails) in src/storage/context.ts
- [ ] T047 [US3] Implement corrupted database detection and recovery flow in src/storage/context.ts
- [ ] T048 [US3] Update error messages to be actionable in src/storage/errors.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T049 [P] Implement performance optimizations for large database files in src/storage/performance.ts
- [ ] T050 [P] Add security hardening for credential handling in src/storage/security.ts
- [ ] T051 [P] Create quickstart validation script in scripts/validate-track-metrics-setup.sh
- [ ] T052 Update package.json with track-metrics action dependencies and scripts
- [ ] T053 [P] Add comprehensive unit tests for all utilities in tests/unit/storage/
- [ ] T054 Run visual review testing with track-metrics action fixtures
- [ ] T055 Update README.md with track-metrics action usage instructions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for storage configuration
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on US1 & US2 for S3 operations

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Core storage implementation before workflow orchestration
- Error handling after basic functionality
- Integration after individual components
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Storage operations within stories marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for S3 configuration validation in tests/contract/track-metrics-config.test.ts"
Task: "Unit test for S3Storage class in tests/unit/storage/s3-storage.test.ts"
Task: "Integration test for storage backend selection in tests/integration/storage-selection.test.ts"

# Launch all storage configuration tasks together:
Task: "Implement storage configuration schema in src/config/storage-schema.ts"
Task: "Create S3Storage constructor with credential validation in src/storage/s3.ts"
Task: "Implement storage type detection and validation in src/storage/factory.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently with S3 configuration
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1 - MVP)
   - Developer B: User Story 2 (P2 - Core workflow)
   - Developer C: User Story 3 (P3 - Error handling)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Critical**: Unified action only supports S3 storage - GitHub Artifacts requires manual handling
- **Security**: Never log or expose S3 credentials in any output
- **Performance**: Target <30s download, <45s upload for 10MB files
