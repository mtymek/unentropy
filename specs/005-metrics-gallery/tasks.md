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

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core registry and resolution infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create MetricTemplate interface in src/metrics/types.ts
- [ ] T005 Create built-in metrics registry structure in src/metrics/registry.ts
- [ ] T006 Create resolver module skeleton in src/metrics/resolver.ts
- [ ] T007 Extend MetricConfig schema to support optional $ref in src/config/schema.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick setup with pre-defined metrics (Priority: P1) 🎯 MVP

**Goal**: Enable developers to reference built-in metrics by ID (e.g., `{"$ref": "coverage"}`) without writing custom commands, with automatic expansion to full metric definitions including commands, units, and types.

**Independent Test**: Add `{"$ref": "coverage"}` to unentropy.json, run metrics collection, verify coverage is collected with % unit and appropriate command without requiring custom configuration.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Define coverage built-in metric in src/metrics/registry.ts
- [ ] T009 [P] [US1] Define function-coverage built-in metric in src/metrics/registry.ts
- [ ] T010 [P] [US1] Define loc built-in metric in src/metrics/registry.ts
- [ ] T011 [P] [US1] Define bundle-size built-in metric in src/metrics/registry.ts
- [ ] T012 [P] [US1] Define build-time built-in metric in src/metrics/registry.ts
- [ ] T013 [P] [US1] Define test-time built-in metric in src/metrics/registry.ts
- [ ] T014 [P] [US1] Define dependencies-count built-in metric in src/metrics/registry.ts
- [ ] T015 [US1] Implement getBuiltInMetric lookup function in src/metrics/registry.ts
- [ ] T016 [US1] Implement listAvailableMetricIds function in src/metrics/registry.ts
- [ ] T017 [US1] Implement resolveMetricReference function in src/metrics/resolver.ts
- [ ] T018 [US1] Implement validateBuiltInReference function in src/metrics/resolver.ts
- [ ] T019 [US1] Add resolution step to loadConfig function in src/config/loader.ts
- [ ] T020 [US1] Export public API from src/metrics/index.ts
- [ ] T021 [P] [US1] Add unit test for built-in metrics registry in tests/unit/metrics/registry.test.ts
- [ ] T022 [P] [US1] Add unit test for resolver with valid references in tests/unit/metrics/resolver.test.ts
- [ ] T023 [P] [US1] Add unit test for resolver with invalid references in tests/unit/metrics/resolver.test.ts
- [ ] T024 [US1] Add integration test for config loading with built-in metric refs in tests/integration/gallery-config.test.ts
- [ ] T025 [US1] Add contract test for $ref schema validation in tests/contract/gallery-schema.test.ts

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

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T036 [P] Add JSDoc documentation to all public functions in src/metrics/
- [ ] T037 [P] Add error message improvements with available metric IDs in src/metrics/resolver.ts
- [ ] T038 [P] Update root-level unentropy.json to use built-in metric reference as example
- [ ] T039 Run build and typecheck to ensure no type errors
- [ ] T040 Run all tests to ensure full suite passes
- [ ] T041 Run quickstart.md validation with built-in metric examples

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

### Within Each User Story

- Built-in metric definitions (T008-T014) can run in parallel
- Registry lookup functions before resolver implementation
- Resolver implementation before config loader integration
- Implementation before tests
- Unit tests can run in parallel
- Integration and contract tests after implementation

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- All built-in metric definitions marked [P] can run in parallel (T008-T014)
- Unit tests for User Story 1 marked [P] can run in parallel (T021-T023)
- User Story 2 unit tests marked [P] can run in parallel (T030-T033)
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

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently with `{"$ref": "coverage"}` example
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! - 7 built-in metrics available by reference)
3. Add User Story 2 → Test independently → Deploy/Demo (Full feature - overrides supported)
4. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (built-in metrics + basic resolution)
   - Developer B: Can start User Story 2 tests while A works on implementation
3. User Story 2 implementation follows after User Story 1 is complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Built-in metric commands follow contract specifications in contracts/built-in-metrics.md
- Schema extensions maintain backward compatibility with existing custom metrics
- Resolution happens during config loading before validation
