# Tasks: Find Metrics Database in GitHub Artifacts

**Input**: Design documents from `/specs/002-find-database/`
**Prerequisites**: spec.md, contracts/action-interface.md

**Organization**: Tasks are organized by implementation phase for the find-database GitHub Action.

## Format: `[ID] [P?] [Phase] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Phase]**: Which phase this task belongs to (e.g., Tests, Implementation)
- Include exact file paths in descriptions

## Path Conventions
- Single project at repository root: `src/`, `tests/`
- GitHub Actions: `.github/actions/`

---

## Phase 1: Tests for find-database Action

**Purpose**: Write contract tests for the find-database GitHub Action to ensure compliance with interface contract

**Note**: These tests define the expected behavior - write them FIRST, ensure they FAIL before implementation

- [x] T001 [P] Write contract test for find-database action inputs in tests/contract/find-database-action.test.ts
- [x] T002 [P] Write contract test for find-database action outputs in tests/contract/find-database-action.test.ts
- [x] T003 [P] Write integration test for artifact upload/download in tests/integration/artifacts.test.ts

**Checkpoint**: Tests written and failing - ready for implementation

---

## Phase 2: Implementation of find-database Action

**Purpose**: Implement the find-database GitHub Action according to the contract specification

- [x] T004 Create action metadata file .github/actions/find-database/action.yml
- [x] T005 Implement action entrypoint with GitHub API integration in src/actions/find-database.ts
- [x] T006 Add input validation and error handling in src/actions/find-database.ts
- [x] T007 Add output setting (database-found, database-path, source-run-id) in src/actions/find-database.ts
- [x] T008 Update build script to include find-database action in scripts/build-actions.ts

**Checkpoint**: find-database action implemented and all tests passing

---

## Task Summary

- **Total Tasks**: 8
- **Phase 1 (Tests)**: 3 tasks (3 completed)
- **Phase 2 (Implementation)**: 5 tasks (5 completed)

### Current Status: 8/8 tasks completed (100%) ✅

### Parallel Opportunities
- T001, T002, T003 can run in parallel (different test files)

---

## Notes

- [P] tasks = different files, no dependencies
- Verify tests fail before implementing (TDD approach)
- Run lint/typecheck frequently during development
- This action is independent from the main metrics tracking workflow
- Action has been extracted from specs/001-mvp-metrics-tracking/tasks.md (original tasks T049-T060)
