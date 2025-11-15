# Implementation Plan: Unified S3-Compatible Storage Action

**Branch**: `003-unified-s3-action` | **Date**: Thu Nov 13 2025 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-unified-s3-action/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a track-metrics GitHub Action that orchestrates the complete Unentropy metrics workflow: download database from S3-compatible storage, collect metrics, upload updated database, and generate HTML reports. The action will support S3-compatible storage backends with secure credential handling via GitHub Action parameters. 
**Note**: When `storage.type` is `sqlite-artifact`, the track-metrics action runs in a limited mode (collect + report only) and expects surrounding workflow steps to handle GitHub Artifact downloads/uploads.

## Technical Context

**Language/Version**: TypeScript with Bun runtime (per constitution)  
**Primary Dependencies**: Bun native S3 client, existing Unentropy collector and reporter modules  
**Storage**: SQLite database files stored in S3-compatible storage (full workflow) with limited artifact-mode support for collection/reporting when users choose GitHub Artifacts  
**Testing**: Bun test framework (per constitution), unit/integration/contract tests  
**Target Platform**: GitHub Actions runners (Linux serverless environment)  
**Project Type**: Single project with modular action architecture  
**Performance Goals**: Database download/upload within 30-45 seconds for 10MB files, complete workflow under 5 minutes  
**Constraints**: Serverless architecture, no external servers, <50MB database files, secure credential handling  
**Scale/Scope**: Support for 4+ S3-compatible providers, concurrent workflow handling, simplified S3-only implementation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Serverless Architecture ✅
- **Requirement**: All components operate within GitHub Actions workflows
- **Compliance**: Unified action runs entirely in GitHub Actions, no external servers
- **Status**: PASS

### II. Technology Stack Consistency ✅
- **Requirement**: Bun runtime with TypeScript, SQLite, Chart.js
- **Compliance**: Uses existing Bun/TypeScript codebase, SQLite database, existing Chart.js reports
- **Status**: PASS

### III. Code Quality Standards ✅
- **Requirement**: Strict TypeScript, Prettier formatting, minimal comments
- **Compliance**: Follows existing code conventions and linting rules
- **Status**: PASS

### IV. Security Best Practices ✅
- **Requirement**: Never log/expose secrets, follow security guidelines
- **Compliance**: Credentials passed as GitHub Action parameters from Secrets, never in config files or logs
- **Status**: PASS

### V. Testing Discipline ✅
- **Requirement**: Comprehensive unit, integration, contract tests
- **Compliance**: Will follow existing test patterns for actions and storage backends
- **Status**: PASS

### Additional Constraints ✅
- **Requirement**: Lightweight, self-contained, CI/CD compatible
- **Compliance**: Single action, no external dependencies beyond S3 SDK
- **Status**: PASS

**Overall Status**: ✅ PASS - Ready for Phase 2 task creation

### Post-Design Re-evaluation

**Phase 0 Research**: ✅ COMPLETED
- S3 SDK selection: Bun native S3 client (zero dependencies)
- Provider compatibility: All major S3-compatible providers supported
- Security patterns: GitHub Secrets + action parameters
- Error handling: Exponential backoff, clear categorization
- Storage limitation: GitHub Artifacts run in limited mode (manual artifact transfers) because API permissions prevent automated persistence

**Phase 1 Design**: ✅ COMPLETED
- Data model: Complete entity definitions and relationships
- Contracts: GitHub Action interface fully specified
- Quickstart: Comprehensive setup guide for all providers
- Agent context: Updated with new technologies

**Constitution Compliance**: ✅ MAINTAINED
- Serverless architecture: Action runs entirely in GitHub Actions
- Technology consistency: Uses Bun/TypeScript, follows existing patterns
- Security: Credentials properly separated from configuration
- Testing: Comprehensive test strategy defined
- Lightweight: Single action with modular storage adapters

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── actions/
│   ├── collect.ts           # Existing metric collection action
│   ├── find-database.ts     # Existing artifact finder action
│   ├── report.ts            # Existing report generation action
│   └── track-metrics.ts     # NEW: Track-Metrics S3-compatible action
├── storage/
│   ├── adapters/
│   │   └── s3.ts            # NEW: S3-compatible storage adapter (Bun native)
│   └── factory.ts           # NEW: Storage backend factory
├── config/
│   ├── loader.ts            # Existing config loading
│   └── schema.ts            # Existing config validation
├── collector/               # Existing metric collection modules
├── reporter/                # Existing report generation modules
└── database/                # Existing database operations

tests/
├── contract/
│   └── track-metrics-action.test.ts    # NEW: Track-Metrics action contract tests
├── integration/
│   ├── artifacts.test.ts
│   ├── collection.test.ts
│   ├── reporting.test.ts
│   └── s3-storage.test.ts         # NEW: S3 storage integration tests
└── unit/
    ├── storage/
    │   ├── s3-adapter.test.ts    # NEW: S3 adapter unit tests
    │   └── factory.test.ts       # NEW: Storage factory tests
    └── actions/
        └── track-metrics.test.ts        # NEW: Track-Metrics action unit tests

.github/
└── workflows/
    ├── ci.yml
    ├── metrics.yml
    └── track-metrics-example.yml        # NEW: Example track-metrics action workflow
```

**Structure Decision**: Single project structure following existing patterns. New track-metrics action integrates with existing collector, reporter, and database modules. Storage abstraction layer delivers full automation for S3-compatible storage while providing a limited artifact mode (manual persistence) due to GitHub API permission constraints.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
