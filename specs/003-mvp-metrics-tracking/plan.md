# Implementation Plan: MVP Metrics Tracking System

**Branch**: `003-mvp-metrics-tracking` | **Date**: Thu Oct 16 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-mvp-metrics-tracking/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a serverless metrics tracking system that allows developers to define custom metrics via `unentropy.json`, automatically collect those metrics during CI/CD runs through a GitHub Action, store data in SQLite, and generate self-contained HTML reports with trend visualizations using Chart.js.

## Technical Context

**Language/Version**: TypeScript 5.x / Bun 1.2.x (matches existing project setup and constitution requirements)  
**Primary Dependencies**: 
- `bun:sqlite` for database operations (Bun native)
- `better-sqlite3` for database operations (Node.js/GitHub Actions compatibility)
- Database adapter layer for runtime environment detection
- `@actions/core` and `@actions/github` for GitHub Actions integration
- Chart.js (via CDN) for HTML report visualizations
- `zod` for configuration validation

**Storage**: SQLite database file stored as GitHub Actions artifact (persisted across workflow runs)  
**Testing**: Existing test setup (bun test with unit and integration tests)  
**Target Platform**: GitHub Actions runners (Ubuntu latest, Bun 1.2.x)  
**Project Type**: Single project (CLI tool / library with GitHub Action wrapper)  
**Performance Goals**: 
- Configuration validation: <100ms for typical configs
- Metric collection: <30 seconds total overhead per CI run
- Report generation: <10 seconds for 100 data points

**Constraints**: 
- Must be serverless (no external services)
- Single-file HTML output (no separate assets)
- Database must handle concurrent writes from parallel jobs
- Zero configuration for standard use cases
- Must support both Bun (local development) and Node.js (GitHub Actions) environments
- Database adapter must provide consistent API across both environments

**Scale/Scope**: 
- Support 50+ concurrent workflow runs
- Handle 1000+ metric data points per repository
- Support 10+ custom metrics per project

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Serverless Architecture
**Status**: PASS  
**Justification**: All components run within GitHub Actions. SQLite database stored as artifact (no external database service). HTML reports generated locally. No servers required.

### ✅ II. Technology Stack Consistency
**Status**: PASS with Justification  
**Justification**: Using Bun runtime with TypeScript as required by constitution. SQLite for storage (as specified). Chart.js for visualization (as specified in dependencies). Bun as package manager. **Exception**: better-sqlite3 included for Node.js/GitHub Actions compatibility - justified because GitHub Actions runners use Node.js environment while local development uses Bun. Database adapter pattern provides consistent API across both environments.

### ✅ III. Code Quality Standards
**Status**: PASS  
**Justification**: Will use existing TypeScript strict mode, Prettier config, and ESLint setup. Following existing patterns from `src/lib/` structure.

### ✅ IV. Security Best Practices
**Status**: PASS  
**Justification**: No secrets handling required for MVP. Database contains only metric data (no sensitive information). User-provided metric collection commands run in isolated CI environment.

### ✅ V. Testing Discipline
**Status**: PASS  
**Justification**: Will implement unit tests for configuration parsing, database operations, and report generation. Integration tests for end-to-end workflow. Contract tests for GitHub Action interface.

### ✅ Additional Constraints
**Status**: PASS  
**Justification**: Lightweight implementation. Self-contained with no external service dependencies beyond GitHub Actions. Compatible with standard CI/CD environments.

**Overall Gate Status**: ✅ PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```
specs/003-mvp-metrics-tracking/
 ├── plan.md              # This file (/speckit.plan command output)
 ├── research.md          # Phase 0 output (/speckit.plan command)
 ├── data-model.md        # Phase 1 output (/speckit.plan command)
 ├── quickstart.md        # Phase 1 output (/speckit.plan command)
 ├── contracts/           # Phase 1 output (/speckit.plan command)
 │   ├── config-schema.md       # unentropy.json schema
 │   ├── database-schema.md     # SQLite table definitions
 │   └── action-interface.md    # GitHub Action inputs/outputs
 └── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
 ├── config/
 │   ├── schema.ts           # Zod schema for unentropy.json
 │   ├── loader.ts           # Config file reading and validation
 │   └── types.ts            # TypeScript types for configuration
 ├── database/
 │   ├── adapters/
 │   │   ├── interface.ts    # Common database adapter interface
 │   │   ├── better-sqlite3.ts  # Node.js adapter (better-sqlite3)
 │   │   ├── bun-sqlite.ts   # Bun adapter (bun:sqlite)
 │   │   └── factory.ts      # Runtime environment detection
 │   ├── client.ts           # SQLite connection management (uses adapter)
 │   ├── migrations.ts       # Schema initialization
 │   ├── queries.ts          # Data access functions
 │   └── types.ts            # Database entity types
 ├── collector/
 │   ├── runner.ts           # Execute metric collection commands
 │   ├── collector.ts        # Main collection orchestration
 │   └── context.ts          # Build context extraction (git SHA, etc.)
 ├── reporter/
 │   ├── generator.ts        # HTML report generation
 │   ├── charts.ts           # Chart.js configuration builder
 │   └── templates.ts        # HTML templates
 ├── actions/
 │   ├── collect.ts          # GitHub Action entrypoint for collection
 │   └── report.ts           # GitHub Action entrypoint for reporting
 └── index.ts                # Main library exports

tests/
 ├── unit/
 │   ├── config/             # Configuration validation tests
 │   ├── database/           # Database operations tests
 │   ├── collector/          # Collection logic tests
 │   └── reporter/           # Report generation tests
 ├── integration/
 │   ├── end-to-end.test.ts  # Full workflow tests
 │   └── fixtures/           # Test data and configs
 └── contract/
    └── action.test.ts      # GitHub Action interface tests

.github/
 └── actions/
     ├── collect-metrics/
     │   ├── action.yml      # GitHub Action definition (collection)
     │   └── dist/           # Compiled action code
     └── generate-report/
         ├── action.yml      # GitHub Action definition (reporting)
         └── dist/           # Compiled action code
```

**Structure Decision**: Using single project structure as this is a CLI tool/library with GitHub Action wrappers. All components are TypeScript/Bun. Clear separation of concerns: config parsing, database operations, collection logic, and reporting are independent modules that can be tested separately.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| better-sqlite3 dependency (Constitution II) | GitHub Actions runners use Node.js environment, not Bun. better-sqlite3 provides native SQLite bindings for Node.js with high performance and proper concurrency handling. | bun:sqlite only works in Bun environment. Using only bun:sqlite would prevent the tool from running in GitHub Actions, which is the primary CI/CD target platform. |
| Database adapter pattern | Provides consistent API across Bun (local dev) and Node.js (GitHub Actions) environments while maintaining performance. | Conditional imports would complicate the codebase and make testing harder. Runtime detection with adapter pattern keeps the implementation clean and maintainable. |

