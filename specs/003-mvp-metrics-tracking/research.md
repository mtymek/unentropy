# Research & Technical Decisions: MVP Metrics Tracking

**Feature**: 003-mvp-metrics-tracking  
**Date**: Thu Oct 16 2025  
**Status**: Complete

## Overview

This document captures the research findings and technical decisions for implementing the MVP metrics tracking system. Each decision is documented with rationale and alternatives considered.

## Key Technical Decisions

### 1. Database Layer: SQLite with better-sqlite3

**Decision**: Use `better-sqlite3` as the SQLite driver

**Rationale**:
- Synchronous API simplifies error handling in GitHub Actions context
- Better performance than node-sqlite3 (no async overhead for simple operations)
- More reliable for concurrent access patterns with WAL mode
- Smaller bundle size for GitHub Action distribution
- Native C++ binding provides stability

**Alternatives Considered**:
- `node-sqlite3`: Rejected due to async-only API and callback hell
- `sql.js`: Rejected due to WASM overhead and lack of native performance
- External database: Violates serverless constraint

**Implementation Notes**:
- Enable WAL (Write-Ahead Logging) mode for better concurrent write support
- Use IMMEDIATE transactions to reduce lock contention
- Implement retry logic with exponential backoff for SQLITE_BUSY errors

### 2. Configuration Validation: Zod

**Decision**: Use `zod` for schema validation and TypeScript type inference

**Rationale**:
- Type-safe schema definition with automatic TypeScript type inference
- Clear, actionable error messages for validation failures (FR-004 requirement)
- Composable schemas for extensibility
- Zero dependencies (other than TypeScript)
- Industry standard for runtime validation

**Alternatives Considered**:
- `ajv` (JSON Schema): More verbose, separate type definitions needed
- `yup`: Similar features but larger bundle size
- `joi`: Server-oriented, heavier dependencies
- Custom validation: Would reinvent wheel, error handling complexity

**Implementation Notes**:
- Define schema in `src/config/schema.ts`
- Export inferred TypeScript types for use throughout codebase
- Provide custom error formatter for user-friendly messages

### 3. GitHub Actions Artifact Storage

**Decision**: Store SQLite database as GitHub Actions artifact with download/merge pattern

**Rationale**:
- Artifacts persist across workflow runs (requirement FR-011)
- Built-in versioning and retention policies
- No repository bloat (database not committed)
- Supports concurrent workflows with merge strategy

**Alternatives Considered**:
- Git LFS: Rejected due to repository bloat and merge conflicts
- Commit to repository: Rejected due to binary file conflicts
- External storage (S3, etc.): Violates serverless constraint
- GitHub releases: Not designed for frequent updates

**Implementation Notes**:
- Action downloads previous artifact at start of run
- Merges new data into existing database (upsert pattern)
- Uploads updated database as new artifact
- Use artifact naming with repository context to avoid collisions

### 4. Concurrent Write Handling

**Decision**: SQLite WAL mode + optimistic locking with retry strategy

**Rationale**:
- WAL mode allows concurrent readers during writes
- Optimistic locking (using busy timeout) handles rare write collisions
- Retry with exponential backoff prevents cascade failures
- Simpler than distributed locking solutions

**Alternatives Considered**:
- Pessimistic locking: Rejected due to deadlock risk
- Queue-based writes: Rejected due to complexity and serverless constraint
- Separate databases per run: Rejected due to reporting complexity
- Distributed lock (Redis): Violates serverless constraint

**Implementation Notes**:
- Set `busy_timeout` to 5000ms
- Implement 3 retries with exponential backoff (100ms, 200ms, 400ms)
- Log warnings on retry, error on final failure
- Use IMMEDIATE transactions to fail fast on conflicts

### 5. Report Generation: Server-Side HTML with Embedded Chart.js

**Decision**: Generate complete HTML with Chart.js from CDN and inline data

**Rationale**:
- Self-contained single file (FR-015 requirement)
- Works offline after initial download (SC-006 requirement)
- No build step for report generation
- Chart.js is industry standard with excellent documentation
- CDN ensures latest version without bundling

**Alternatives Considered**:
- SVG generation: Rejected due to limited interactivity
- Canvas rendering: Requires headless browser, complex
- PNG/image export: Static, no interactivity
- Separate JS files: Violates self-contained requirement

**Implementation Notes**:
- Use Chart.js v4 from jsDelivr CDN
- Embed metric data as JSON in `<script>` tag
- Template system with placeholders for dynamic content
- Support multiple chart types (line for time series, bar for categories)

### 6. Metric Collection Command Execution

**Decision**: Shell command execution with environment variable context

**Rationale**:
- Maximum flexibility for users to define custom metrics
- Leverages existing CI environment and tools
- Simple integration with existing scripts
- Standard output parsing for metric values

**Alternatives Considered**:
- JavaScript/TypeScript API only: Too restrictive, limited adoption
- Plugin system: Over-engineered for MVP
- Built-in metric calculators: Too opinionated, scope creep

**Implementation Notes**:
- Execute commands using Bun's native `Bun.spawn()` API for improved timeout handling and CI reliability
- Pass build context as environment variables (COMMIT_SHA, BRANCH, etc.)
- Parse stdout for metric value (numeric or string)
- Timeout after 60 seconds to prevent hanging using Bun's built-in timeout mechanism
- Capture stderr for error logging

### 7. Configuration File Schema Design

**Decision**: JSON format with explicit metric definitions and collection commands

**Rationale**:
- JSON is universal and familiar to developers
- Schema validation ensures correctness before collection
- Explicit > implicit for clarity
- Supports both numeric and categorical metrics (FR-003)

**Schema Structure**:
```typescript
{
  metrics: [
    {
      name: string,              // Unique identifier
      type: 'numeric' | 'label',  // Metric type
      description?: string,       // Human-readable description
      command: string,            // Shell command to collect metric
      unit?: string               // Display unit (e.g., 'ms', '%', 'LOC')
    }
  ],
  database?: {
    path?: string,                // Custom DB path (default: .unentropy/metrics.db)
    artifactName?: string         // Custom artifact name
  }
}
```

**Alternatives Considered**:
- YAML: Less structured, parsing complexity
- TOML: Less familiar to JavaScript developers
- JavaScript config: Security risk (code execution)

### 8. Database Schema Design

**Decision**: Simple normalized schema with three tables

**Tables**:
1. `metrics` - Metric definitions (name, type, unit)
2. `builds` - Build context (commit_sha, branch, timestamp, run_id)
3. `metric_values` - Individual measurements (metric_id, build_id, value, timestamp)

**Rationale**:
- Normalized structure prevents data duplication
- Easy to query for time-series data
- Supports efficient report generation
- Allows metric definition evolution

**Alternatives Considered**:
- Single denormalized table: Rejected due to data duplication
- Document store approach: Rejected due to query complexity
- Time-series specific schema: Over-engineered for MVP scale

### 9. Error Handling Strategy

**Decision**: Fail-fast for configuration errors, graceful degradation for collection

**Rationale**:
- Configuration errors should stop execution immediately (FR-004)
- Partial metric collection is better than total failure (FR-010)
- Clear error messages guide users to fixes

**Implementation**:
- Configuration validation: Throw on first error with details
- Metric collection: Log error, continue with remaining metrics
- Database operations: Retry on lock, fail on corruption
- Report generation: Show available data, warn on missing metrics

### 10. GitHub Action Interface Design

**Decision**: Two separate actions - `collect-metrics` and `generate-report`

**Rationale**:
- Separation of concerns (collection vs visualization)
- Allows different trigger patterns (collect on push, report on schedule)
- Independent testing and versioning
- Users can use collection without reporting

**Action Inputs**:
- `collect-metrics`:
  - `config-path`: Path to unentropy.json (default: ./unentropy.json)
  - `database-artifact`: Artifact name (default: unentropy-metrics)
  
- `generate-report`:
  - `database-artifact`: Artifact name to read from
  - `output-path`: Report output location (default: ./metrics-report.html)
  - `time-range`: Optional filter (e.g., 'last-30-days')

**Alternatives Considered**:
- Single action with mode parameter: Less clear interface
- Separate repositories: Maintenance overhead
- CLI tool only: Missed GitHub Actions integration benefit

## Performance Considerations

### Database Performance
- WAL mode for concurrent access
- Index on (metric_id, timestamp) for time-series queries
- VACUUM on report generation to maintain performance

### Collection Performance
- Parallel metric collection with Promise.all()
- Timeout per metric to prevent hanging (60s default)
- Batch database inserts for efficiency

### Report Generation Performance
- Stream-based HTML generation for large datasets
- Client-side Chart.js rendering (offload from server)
- Lazy loading for charts if >10 metrics

## Security Considerations

### Command Execution
- No shell injection mitigation needed (commands from trusted config file)
- Commands execute in CI environment (already trusted context)
- Environment variables for context (read-only)

### Database Security
- No sensitive data stored (only metric values)
- Artifact access controlled by GitHub permissions
- No SQL injection risk (parameterized queries only)

### Report Security
- No user input in report generation
- Static HTML output (no XSS vectors)
- CDN resources use integrity hashes (SRI)

## Testing Strategy

### Unit Tests
- Configuration validation (valid/invalid schemas)
- Database operations (CRUD, concurrent writes)
- Metric collection (command execution, parsing)
- Report generation (HTML output, data formatting)

### Integration Tests
- End-to-end workflow (config → collect → report)
- Concurrent collection simulation
- Database persistence across runs
- Error scenarios (missing config, failed metrics)

### Contract Tests
- GitHub Action interface (inputs/outputs)
- Artifact upload/download
- Environment variable access

## Open Questions

*None - all technical decisions are resolved based on spec requirements and constitution constraints.*

## References

- SQLite WAL mode: https://www.sqlite.org/wal.html
- better-sqlite3 docs: https://github.com/WiseLibs/better-sqlite3
- Zod documentation: https://zod.dev/
- Chart.js v4: https://www.chartjs.org/docs/latest/
- GitHub Actions artifacts: https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts
