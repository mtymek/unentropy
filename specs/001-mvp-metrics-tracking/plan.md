# Implementation Plan: MVP Metrics Tracking System

**Branch**: `003-mvp-metrics-tracking` | **Date**: Thu Oct 16 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-mvp-metrics-tracking/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a serverless metrics tracking system that allows developers to define custom metrics via `unentropy.json`, automatically collect those metrics during CI/CD runs through a GitHub Action, store data in SQLite, and generate self-contained HTML reports with trend visualizations using Chart.js. After implementing the core functionality, the MVP will include a self-monitoring implementation where Unentropy tracks its own test coverage and lines of code, serving as both a demonstration and genuine project health monitoring.

## Technical Context

**Language/Version**: TypeScript 5.x / Bun 1.2.x (matches existing project setup and constitution requirements)  
**Primary Dependencies**: 
- `bun:sqlite` for database operations (Bun native)
- `@actions/core` and `@actions/github` for GitHub Actions integration
- Chart.js (via CDN) for HTML report visualizations
- `zod` for configuration validation
- `yargs` v18.x for command-line argument parsing and help generation
- `@types/yargs` for TypeScript support in CLI development

**Storage**: SQLite database file stored as GitHub Actions artifact (persisted across workflow runs)  
**Testing**: Existing test setup (bun test with unit and integration tests)  
**Target Platform**: GitHub Actions runners (Ubuntu latest, Bun 1.2.x)  
**Project Type**: Single project (CLI tool / library with GitHub Action wrapper)  
**Performance Goals**: 
- Configuration validation: <100ms for typical configs
- CLI verification command: <2 seconds for typical configuration files
- Database artifact download: <15 seconds (including API calls)
- Metric collection: <30 seconds total overhead per CI run
- Report generation: <10 seconds for 100 data points

**Constraints**: 
- Must be serverless (no external services)
- Single-file HTML output (no separate assets)
- Database must handle concurrent writes from parallel jobs
- Zero configuration for standard use cases
- Uses Bun runtime for both local development and GitHub Actions
- Database persistence via GitHub Actions artifacts (no external storage)

**Scale/Scope**: 
- Support 50+ concurrent workflow runs
- Handle 1000+ metric data points per repository
- Support 10+ custom metrics per project
- Self-monitoring implementation: 2 metrics (test coverage, LoC) for demonstration (User Story 4)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Serverless Architecture
**Status**: PASS  
**Justification**: All components run within GitHub Actions. SQLite database stored as artifact (no external database service). HTML reports generated locally. No servers required.

### ✅ II. Technology Stack Consistency
**Status**: PASS  
**Justification**: Using Bun runtime with TypeScript as required by constitution. SQLite for storage (as specified). Chart.js for visualization (as specified in dependencies). Bun as package manager. Bun runtime is used consistently for both local development and GitHub Actions.

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
specs/001-mvp-metrics-tracking/
 ├── plan.md              # This file (/speckit.plan command output)
 ├── research.md          # Phase 0 output (/speckit.plan command)
 ├── data-model.md        # Phase 1 output (/speckit.plan command)
 ├── quickstart.md        # Phase 1 output (/speckit.plan command)
 ├── contracts/           # Phase 1 output (/speckit.plan command)
 │   ├── config-schema.md              # unentropy.json schema
 │   ├── database-schema.md            # SQLite table definitions
 │   ├── storage-provider-interface.md # Storage provider contract (extensibility)
 │   └── action-interface.md           # GitHub Action inputs/outputs
 └── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
 src/
 ├── cli/
 │   ├── cmd/
 │   │   ├── cmd.ts          # Command builder utility
 │   │   └── verify.ts       # CLI verification command
 │   └── index.ts            # CLI entrypoint
 ├── config/
 │   ├── schema.ts           # Zod schema for unentropy.json
 │   └── loader.ts           # Config file reading and validation
 ├── storage/
 │   ├── providers/
 │   │   ├── interface.ts    # StorageProvider interface + config types
 │   │   ├── factory.ts      # createStorageProvider() factory function
 │   │   ├── sqlite-local.ts # SqliteLocalStorageProvider (local file)
 │   │   └── sqlite-s3.ts    # SqliteS3StorageProvider (S3-compatible)
 │   ├── adapters/
 │   │   ├── interface.ts    # DatabaseAdapter interface
 │   │   └── sqlite.ts       # SqliteDatabaseAdapter implementation
 │   ├── storage.ts          # Storage orchestrator (coordinates provider + adapter + repository)
 │   ├── repository.ts       # MetricsRepository (domain operations: recordBuild, getMetricComparison)
 │   ├── migrations.ts       # Schema initialization
 │   ├── queries.ts          # Low-level SQL query functions (used by adapter)
 │   └── types.ts            # Database entity types
 ├── collector/
 │   ├── runner.ts           # Execute metric collection commands
 │   ├── collector.ts        # Main collection orchestration
 │   └── context.ts          # Build context extraction (git SHA, etc.)
 ├── reporter/
 │   ├── generator.ts        # HTML report generation
 │   ├── charts.ts           # Chart.js configuration builder
 │   └── templates/          # HTML component templates (TSX)
 ├── actions/
 │   ├── collect.ts          # GitHub Action entrypoint for collection
 │   ├── report.ts           # GitHub Action entrypoint for reporting
 │   ├── find-database.ts    # GitHub Action for artifact discovery
 │   └── track-metrics.ts    # GitHub Action combining collection + reporting
 └── index.ts                # Main library exports

tests/
 ├── unit/
 │   ├── config/             # Configuration validation tests
 │   ├── storage/            # Storage provider and database tests
 │   ├── collector/          # Collection logic tests
 │   └── reporter/           # Report generation tests
 ├── integration/
 │   ├── end-to-end.test.ts  # Full workflow tests
 │   └── fixtures/           # Test data and configs
 └── contract/
     └── action.test.ts      # GitHub Action interface tests

.github/
 ├── actions/
 │   ├── collect-metrics/
 │   │   ├── action.yml      # GitHub Action definition (collection)
 │   │   └── dist/           # Compiled action code
 │   └── generate-report/
 │       ├── action.yml      # GitHub Action definition (reporting)
 │       └── dist/           # Compiled action code
 └── workflows/
     └── ci.yml              # Updated to include self-monitoring steps

unentropy.json               # Self-monitoring configuration (test coverage + LoC)
```

**Structure Decision**: Using single project structure as this is a CLI tool/library with GitHub Action wrappers. All components are TypeScript/Bun. Clear separation of concerns follows a layered architecture:

1. **CLI Layer** (`cli/`): Command-line interface with yargs for argument parsing and help generation
2. **Configuration Layer** (`config/`): Schema validation and file loading
3. **Storage Layer** (`storage/`): Three-layer separation of concerns:
   - **Providers** (`providers/`): Database lifecycle & location (WHERE to store)
   - **Adapters** (`adapters/`): Query execution engine (WHAT queries to run)
   - **Repository** (`repository.ts`): Domain operations (WHY - business logic)
   - **Storage** (`storage.ts`): Orchestration layer that coordinates provider, adapter, and repository
4. **Collection Layer** (`collector/`): Metric extraction and command execution
5. **Reporting Layer** (`reporter/`): HTML generation and visualization
6. **Action Layer** (`actions/`): GitHub Actions entrypoints

This architecture enables independent testing of each layer and future extensibility (e.g., PostgreSQL adapter, alternative storage providers).

**Storage Architecture**: The `storage/` directory implements a three-layer separation:

1. **StorageProvider** (`providers/`): Manages database lifecycle and storage location (local file, S3, GitHub Artifacts). Handles initialization, open/close, and persistence.
2. **DatabaseAdapter** (`adapters/`): Abstracts database query execution. SQLite adapter provides SQL-based operations; future PostgreSQL adapter would provide Postgres-specific queries.
3. **MetricsRepository** (`repository.ts`): Exposes domain-specific operations (`recordBuild()`, `getMetricComparison()`) that use the adapter internally.
4. **Storage** (`storage.ts`): Orchestrates the three layers, providing a unified API.

This separation enables:
- Future database engines (PostgreSQL) via new adapters
- Alternative storage locations (S3, Artifacts) via new providers
- Clean business logic in repository without coupling to SQL or storage details
- Independent testing of each layer

Provider naming: `<database-engine>-<storage-location>` (e.g., `sqlite-local`, `sqlite-s3`). See `contracts/storage-provider-interface.md` and `contracts/database-adapter-interface.md` for detailed contracts.

## User Story 4 Implementation: Self-Monitoring

### Reference Configuration

After core functionality is complete, the project will include `unentropy.json` in the root directory:

```json
{
  "metrics": [
    {
      "name": "test_coverage",
      "type": "percentage", 
      "description": "Test coverage percentage for the codebase",
      "command": "bun test --coverage 2>/dev/null | grep -E '^Lines\\s*:' | awk '{print $2}' | sed 's/%//' || echo '0'"
    },
    {
      "name": "lines_of_code",
      "type": "numeric",
      "description": "Total lines of TypeScript code in src/ directory", 
      "command": "find src/ -name '*.ts' -not -path '*/node_modules/*' | xargs wc -l | tail -1 | awk '{print $1}' || echo '0'"
    }
  ]
}
```

### CI/CD Integration

The existing `.github/workflows/ci.yml` will be extended to include:

1. **Configuration Verification Step**: Run `unentropy verify` to validate configuration before collection
2. **Database Download Step**: Download database artifact from previous successful runs using GitHub's actions/download-artifact
3. **Metric Collection Step**: Run the collect-metrics action with downloaded database (or create new)
4. **Database Persistence**: Store updated SQLite database as workflow artifact  
5. **Report Generation**: Generate HTML report and attach as artifact or PR comment

### Demonstration Value

This self-monitoring setup provides:
- **Live Example**: Users can see actual Unentropy configuration and results
- **Validation**: Each PR shows impact on test coverage and code size
- **Performance Tracking**: Monitor how changes affect project metrics
- **Documentation**: Working reference implementation
- **CLI Usage**: Demonstrates `unentropy verify` command in CI context

### Success Metrics for Self-Monitoring

- Test coverage trends visible over time
- LoC growth tracking for project scope management  
- Reports generated successfully on each commit
- Configuration serves as clear example for new users
- CLI verification runs successfully on each commit before collection

