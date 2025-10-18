# Tasks: Basic Project Scaffolding

**Feature**: 001-basic-scaffolding  
**Input**: Design documents from `/specs/001-basic-scaffolding/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the specification. Test infrastructure is being set up for future use.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project structure and configuration files

- [x] T001 Initialize package.json with ESM configuration and project metadata
- [x] T002 [P] Create tsconfig.json with strict TypeScript settings per contracts/typescript-config.md
- [x] T003 [P] Create eslint.config.js with typescript-eslint strict configs per contracts/code-quality.md
- [x] T004 [P] Create .prettierrc with formatting rules per contracts/code-quality.md
- [x] T005 [P] Create .gitignore for node_modules, dist, and IDE files
- [x] T006 [P] Create src/ and src/lib/ directory structure
- [x] T007 [P] Create tests/ directory structure with unit/, integration/, contract/ subdirectories
- [x] T008 Install development dependencies with bun: typescript, eslint, typescript-eslint, prettier, eslint-config-prettier, @types/bun
- [x] T009 Create .github/workflows/ci.yml for GitHub Actions pipeline per contracts/ci-cd-pipeline.md

---

## Phase 2: User Story 1 - Developer Initializes Project (Priority: P1) 🎯 MVP

**Goal**: Enable developers to clone the repository and immediately have a working development environment with build, test, lint, and typecheck capabilities.

**Independent Test**: Clone repository → run `bun install` → run all commands (build, test, lint, typecheck) → all pass successfully in <5 minutes (SC-001).

### Implementation for User Story 1

- [x] T010 [P] [US1] Create src/index.ts as package entry point that re-exports from src/lib/ modules (establishes foundational API pattern)
- [x] T011 [P] [US1] Create sample test file tests/unit/example.test.ts demonstrating Bun test API per contracts/test-execution.md
- [x] T012 [US1] Add build script to package.json: `bun build ./src/index.ts --outdir ./dist --target node`
- [x] T013 [US1] Add test script to package.json: `bun test`
- [x] T014 [US1] Add typecheck script to package.json: `tsc --noEmit`
- [x] T015 [US1] Add lint script to package.json: `eslint .`
- [x] T016 [US1] Add lint:fix script to package.json: `eslint . --fix`
- [x] T017 [US1] Add format script to package.json: `prettier --write .`
- [x] T018 [US1] Add format:check script to package.json: `prettier --check .`
- [x] T019 [US1] Verify all scripts execute successfully: build, test, typecheck, lint, format:check
- [x] T020 [US1] Verify type checking completes in <5s (SC-002)
- [x] T021 [US1] Verify test suite completes in <2s (SC-003)
- [x] T022 [US1] Create README.md with setup instructions and available commands per FR-009

**Checkpoint**: User Story 1 complete - developers can clone, install, build, test, lint, and typecheck successfully.

---

## Phase 3: User Story 2 - Developer Modifies Code (Priority: P2)

**Goal**: Enable developers to make code changes and receive immediate feedback through type checking and test execution.

**Independent Test**: Introduce a type error → run `bun run typecheck` → error is caught and reported clearly. Run `bun test --watch` → tests auto re-run on file changes.

### Implementation for User Story 2

- [x] T023 [US2] Add test:watch script to package.json: `bun test --watch`
- [x] T024 [US2] Verify type checker catches and reports type errors with clear messages
- [x] T025 [US2] Verify watch mode automatically re-runs tests when files change
- [x] T026 [US2] Verify linter identifies and reports code style violations
- [x] T027 [US2] Test auto-fix functionality: introduce linting violation → run `bun run lint:fix` → verify fix applied
- [x] T028 [US2] Test format functionality: introduce formatting violation → run `bun run format` → verify formatting applied

**Checkpoint**: User Story 2 complete - developers have immediate feedback mechanisms for code quality.

---

## Phase 4: User Story 3 - Developer Adds New Features (Priority: P3)

**Goal**: Enable developers to create new modules and features that seamlessly integrate with the build and test infrastructure.

**Independent Test**: Create new file src/lib/sample.ts with function → create tests/unit/sample.test.ts → run build and test → verify new files are included automatically.

### Implementation for User Story 3

- [x] T029 [US3] Create src/lib/ directory for utility functions
- [x] T030 [US3] Create sample utility file src/lib/sample.ts with exported function (demonstrates lib/ pattern)
- [x] T031 [US3] Create corresponding test file tests/unit/sample.test.ts
- [x] T032 [US3] Verify TypeScript automatically includes new files in compilation (tsconfig.json include: ["src/**/*"])
- [x] T033 [US3] Verify test runner discovers and executes new test files (tests/**/*.test.ts pattern)
- [x] T034 [US3] Verify module resolution works correctly across files (import/export)
- [x] T035 [US3] Test cross-file imports: import from src/lib/sample.ts into src/index.ts and re-export (validates entry point pattern)
- [x] T036 [US3] Verify IDE autocomplete and type checking work for cross-file imports

**Checkpoint**: User Story 3 complete - developers can add new features seamlessly.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and quality checks

- [x] T037 [P] Verify 100% of code passes linting (SC-004)
- [x] T038 [P] Run full CI pipeline locally to ensure all steps pass
- [x] T039 [P] Validate README.md enables developers to understand project in <10 minutes (SC-006)
- [x] T040 [P] Test edge case: build with syntax errors → verify clear error message
- [x] T041 [P] Test edge case: run tests with failing test → verify clear failure reporting
- [x] T042 [P] Verify quickstart.md instructions work end-to-end (clone → setup → all commands pass)
- [x] T043 Create GitHub Actions workflow triggers for push to main and pull requests
- [x] T044 Verify CI pipeline executes all steps: install, typecheck, lint, format:check, test, build (SC-005)
- [x] T045 Verify CI pipeline completes successfully on ubuntu-latest runner
- [x] T046 [P] Ensure bun.lock is committed to repository for reproducible builds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
  - Tasks T001-T009 establish foundational configuration files
  - All Phase 1 tasks can run in parallel after T001 (package.json needed for deps install)
  
- **User Story 1 (Phase 2)**: Depends on Setup (Phase 1) completion
  - Once setup files exist, US1 tasks create sample code and scripts
  - Tasks T010-T011 (sample files) can run in parallel
  - Tasks T012-T018 (scripts) can run sequentially after sample files exist
  - Tasks T019-T021 (verification) run after scripts are added
  
- **User Story 2 (Phase 3)**: Depends on User Story 1 completion
  - Extends US1 with watch mode and validation
  - Can run immediately after US1 is complete
  
- **User Story 3 (Phase 4)**: Depends on User Story 1 completion
  - Tests new feature addition capability
  - Independent of US2 - can run in parallel with US2 if desired
  
- **Polish (Phase 5)**: Depends on all user stories being complete
  - Final validation and documentation
  - Most tasks marked [P] can run in parallel

### User Story Dependencies

- **User Story 1 (P1)**: Foundational - required for US2 and US3
- **User Story 2 (P2)**: Depends on US1 (needs existing code/tests to modify)
- **User Story 3 (P3)**: Depends on US1 (needs build/test infrastructure) - independent of US2

### Parallel Opportunities

**Phase 1 (after T001 and T008):**
- T002, T003, T004, T005, T006, T007 can all run in parallel

**Phase 2 (User Story 1):**
- T010, T011 can run in parallel (different files)

**Phase 3 (User Story 2):**
- Limited parallelism - mostly sequential validation tasks

**Phase 4 (User Story 3):**
- T029-T031 can run together (different files)

**Phase 5 (Polish):**
- T037, T038, T039, T040, T041, T042, T046, T047 can all run in parallel

---

## Parallel Example: Setup Phase

```bash
# After T001 (package.json) and T008 (dependencies installed):
Task: "Create tsconfig.json with strict TypeScript settings"
Task: "Create eslint.config.js with typescript-eslint strict configs"
Task: "Create .prettierrc with formatting rules"
Task: "Create .gitignore for node_modules, dist, and IDE files"
Task: "Create src/ directory structure with index.ts placeholder"
Task: "Create tests/ directory structure with subdirectories"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. **Complete Phase 1: Setup** (T001-T009)
   - Establishes project structure and configuration
   - ~15-20 minutes
   
2. **Complete Phase 2: User Story 1** (T010-T022)
   - Creates working development environment
   - ~20-25 minutes
   - **STOP and VALIDATE**: Run all commands, verify SC-001, SC-002, SC-003
   
3. **Result**: Minimum viable scaffolding ready for development

### Incremental Delivery

1. **Setup → User Story 1** → Foundation ready (build, test, lint, typecheck working)
2. **Add User Story 2** → Developer workflow enhanced (watch mode, feedback)
3. **Add User Story 3** → Feature addition validated (new modules integrate seamlessly)
4. **Add Polish** → Production ready (CI/CD, full validation)

Each phase adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers:

1. **Developer A**: Phase 1 (Setup) - coordinate T001 and T008, parallelize others
2. Once Setup complete:
   - **Developer A**: User Story 1 (core implementation)
   - **Developer B**: User Story 3 (can start after US1 T010-T022 complete)
   - **Developer A**: User Story 2 (after US1 complete)
3. **Both**: Polish phase in parallel

---

## Success Criteria Validation

After completing all tasks, verify:

- ✅ **SC-001**: Clone repository and run all commands successfully in <5 minutes
- ✅ **SC-002**: Type checking completes in <5 seconds
- ✅ **SC-003**: Test suite executes in <2 seconds with zero failures
- ✅ **SC-004**: 100% of committed code passes linting
- ✅ **SC-005**: CI/CD pipeline (all steps) completes successfully
- ✅ **SC-006**: README enables understanding in <10 minutes

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each logical group of tasks
- Stop at any checkpoint to validate independently
- All file paths are relative to repository root
- Configuration files must match contracts in `contracts/` directory
- Performance requirements (SC-002, SC-003) must be verified during implementation
