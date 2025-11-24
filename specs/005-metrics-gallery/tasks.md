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

- [x] T042 [P] [CLI] Create CLI collect command structure in src/cli/cmd/collect.ts
- [ ] T043 [P] [CLI] Implement coverage-lcov parser in src/metrics/collectors/coverage-lcov.ts
- [ ] T044 [P] [CLI] Implement coverage-json parser in src/metrics/collectors/coverage-json.ts  
- [ ] T045 [P] [CLI] Implement coverage-xml parser in src/metrics/collectors/coverage-xml.ts
- [x] T046 [P] [CLI] Implement size parser in src/metrics/collectors/size.ts
- [ ] T047 [P] [CLI] Add integration tests for CLI helpers in tests/integration/cli-helpers.test.ts
- [ ] T048 [P] [CLI] Add contract tests for CLI helper outputs in tests/contract/cli-helpers.test.ts

**Checkpoint**: CLI helpers available for simplified metric collection commands

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
- CLI helper parsers marked [P] can run in parallel (T043-T046)
- CLI helper tests marked [P] can run in parallel (T047, T048)
- Polish tasks marked [P] can run in parallel (T036-T038, T051, T052)

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

### MVP First (User Stories 1 + 2 + Basic CLI)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. Complete Phase 4: User Story 2
5. **NEW**: Complete Phase 6 (Basic CLI helpers - T042, T043, T046)
6. **STOP and VALIDATE**: Test with quickstart examples including CLI helpers
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! - 7 built-in metrics available by reference)
3. Add User Story 2 → Test independently → Deploy/Demo (Full feature - overrides supported)
4. Add Phase 6 (CLI helpers) → Test with quickstart examples → Deploy/Demo (Enhanced feature - simplified commands)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (built-in metrics + basic resolution)
   - Developer B: Can start User Story 2 tests while A works on implementation
3. User Story 2 implementation follows after User Story 1 is complete
4. CLI helper implementation can run in parallel with User Story 2 or as separate workstream

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Built-in metric commands follow contract specifications in contracts/built-in-metrics.md
- CLI helpers support standard formats (LCOV, JSON, XML, size) as documented in quickstart.md
- Schema extensions maintain backward compatibility with existing custom metrics
- Resolution happens during config loading before validation
- Error messages include available metric IDs for invalid references
