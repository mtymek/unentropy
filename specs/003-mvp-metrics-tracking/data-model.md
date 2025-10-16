# Data Model: MVP Metrics Tracking

**Feature**: 003-mvp-metrics-tracking  
**Date**: Thu Oct 16 2025  
**Status**: Complete

## Overview

This document defines the data entities, their relationships, validation rules, and state transitions for the metrics tracking system. The model is designed to support efficient time-series queries, concurrent writes, and flexible metric definitions.

## Core Entities

### 1. Metric Definition

**Description**: Represents a user-defined metric that can be tracked over time.

**Attributes**:
- `id` (integer, primary key): Auto-generated unique identifier
- `name` (string, unique, required): Metric name (e.g., "test-coverage", "bundle-size")
- `type` (enum, required): Either 'numeric' or 'label'
- `unit` (string, optional): Display unit for numeric metrics (e.g., "%", "ms", "KB", "LOC")
- `description` (string, optional): Human-readable description of what this metric measures
- `created_at` (timestamp, required): When this metric was first defined

**Validation Rules**:
- `name`: Must match pattern `^[a-z0-9-]+$` (lowercase alphanumeric with hyphens)
- `name`: Length 1-64 characters
- `type`: Must be either 'numeric' or 'label'
- `unit`: Max 10 characters if provided
- `description`: Max 256 characters if provided

**Uniqueness Constraints**:
- `name` must be unique across all metrics

**Relationships**:
- Has many `MetricValue` records (one-to-many)

**Lifecycle**:
- Created when first referenced in a metric collection run
- Immutable once created (type cannot change)
- No deletion in MVP (historical data preservation)

---

### 2. Build Context

**Description**: Represents a single CI/CD pipeline execution with associated metadata.

**Attributes**:
- `id` (integer, primary key): Auto-generated unique identifier
- `commit_sha` (string, required): Git commit SHA (40 characters)
- `branch` (string, required): Git branch name
- `run_id` (string, required): GitHub Actions run ID
- `run_number` (integer, required): GitHub Actions run number
- `actor` (string, optional): User/bot that triggered the run
- `event_name` (string, optional): GitHub event type (push, pull_request, schedule, etc.)
- `created_at` (timestamp, required): When this record was inserted

**Validation Rules**:
- `commit_sha`: Must be 40-character hexadecimal string
- `branch`: Max 255 characters
- `run_id`: Max 64 characters
- `run_number`: Positive integer
- `actor`: Max 64 characters if provided
- `event_name`: Max 32 characters if provided

**Uniqueness Constraints**:
- (`commit_sha`, `run_id`) combination must be unique (same commit can have multiple runs in rare cases, but run_id is always unique)

**Relationships**:
- Has many `MetricValue` records (one-to-many)

**Lifecycle**:
- Created at the start of each metric collection run
- Immutable once created
- Used for filtering and grouping in reports

---

### 3. Metric Value

**Description**: Represents a single measurement of a metric for a specific build.

**Attributes**:
- `id` (integer, primary key): Auto-generated unique identifier
- `metric_id` (integer, foreign key, required): References `MetricDefinition.id`
- `build_id` (integer, foreign key, required): References `BuildContext.id`
- `value_numeric` (float, optional): Numeric value (populated when metric type is 'numeric')
- `value_label` (string, optional): Text value (populated when metric type is 'label')
- `collected_at` (timestamp, required): When this specific metric was collected
- `collection_duration_ms` (integer, optional): How long the collection command took to execute

**Validation Rules**:
- Exactly one of `value_numeric` or `value_label` must be populated (based on metric type)
- `value_numeric`: Any valid float (including negative, zero, infinity)
- `value_label`: Max 256 characters
- `collection_duration_ms`: Positive integer if provided

**Uniqueness Constraints**:
- (`metric_id`, `build_id`) combination must be unique (one value per metric per build)

**Relationships**:
- Belongs to one `MetricDefinition` (many-to-one)
- Belongs to one `BuildContext` (many-to-one)

**Lifecycle**:
- Created during metric collection for each successful measurement
- Immutable once created
- Used for time-series analysis and reporting

---

## Entity Relationships

```
MetricDefinition (1) ──────< (N) MetricValue
                                      │
                                      │
BuildContext (1) ──────────────< (N) MetricValue
```

**Relationship Rules**:
1. Each `MetricValue` must reference exactly one `MetricDefinition`
2. Each `MetricValue` must reference exactly one `BuildContext`
3. A `MetricDefinition` can have zero or many `MetricValue` records
4. A `BuildContext` can have zero or many `MetricValue` records
5. Cascade behavior: No cascading deletes in MVP (preserve historical data)

---

## Configuration Entity (Not Persisted)

### Unentropy Configuration

**Description**: User-defined configuration from `unentropy.json`. This is NOT stored in the database but validated at runtime.

**Structure**:
```typescript
{
  metrics: MetricConfig[],
  database?: DatabaseConfig
}

MetricConfig {
  name: string,              // Maps to MetricDefinition.name
  type: 'numeric' | 'label', // Maps to MetricDefinition.type
  description?: string,      // Maps to MetricDefinition.description
  command: string,           // Shell command to execute (not stored)
  unit?: string              // Maps to MetricDefinition.unit
}

DatabaseConfig {
  path?: string,             // Custom database file path
  artifactName?: string      // Custom GitHub Actions artifact name
}
```

**Validation Rules** (enforced by Zod schema):
- `metrics`: Array with at least 1 item, max 50 items
- `metrics[].name`: Same rules as MetricDefinition.name
- `metrics[].type`: Must be 'numeric' or 'label'
- `metrics[].command`: Non-empty string, max 1024 characters
- `metrics[].unit`: Max 10 characters if provided
- `metrics[].description`: Max 256 characters if provided
- `database.path`: Valid file path if provided
- `database.artifactName`: Valid artifact name pattern if provided

---

## State Transitions

### Metric Collection Workflow

```
1. Load Configuration
   └─> Validate schema (fail fast on error)
   
2. Initialize Database
   └─> Create tables if not exist
   └─> Enable WAL mode
   
3. Create Build Context
   └─> Insert BuildContext record
   └─> Capture git metadata (commit, branch, etc.)
   
4. For each metric in configuration:
   ├─> Check if MetricDefinition exists
   │   └─> If not, create new MetricDefinition
   │
   ├─> Execute collection command
   │   ├─> Success: Parse output
   │   └─> Failure: Log error, continue to next metric
   │
   └─> If successful:
       └─> Insert MetricValue with parsed value
       
5. Finalize
   └─> Close database connection
   └─> Upload database artifact
```

### Report Generation Workflow

```
1. Download Database Artifact
   └─> Download latest from GitHub Actions
   
2. Query Data
   ├─> Load all MetricDefinitions
   ├─> Load BuildContexts (optionally filtered by time range)
   └─> Load MetricValues for selected builds
   
3. Transform Data
   ├─> Group values by metric
   ├─> Sort by timestamp
   └─> Format for Chart.js
   
4. Generate HTML
   ├─> Render template with embedded data
   ├─> Include Chart.js from CDN
   └─> Write to output file
```

---

## Database Schema (SQLite)

### Table: `metric_definitions`

```sql
CREATE TABLE metric_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('numeric', 'label')),
  unit TEXT,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metric_name ON metric_definitions(name);
```

### Table: `build_contexts`

```sql
CREATE TABLE build_contexts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commit_sha TEXT NOT NULL,
  branch TEXT NOT NULL,
  run_id TEXT NOT NULL,
  run_number INTEGER NOT NULL,
  actor TEXT,
  event_name TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(commit_sha, run_id)
);

CREATE INDEX idx_build_timestamp ON build_contexts(timestamp);
CREATE INDEX idx_build_branch ON build_contexts(branch);
```

### Table: `metric_values`

```sql
CREATE TABLE metric_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_id INTEGER NOT NULL,
  build_id INTEGER NOT NULL,
  value_numeric REAL,
  value_label TEXT,
  collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  collection_duration_ms INTEGER,
  FOREIGN KEY (metric_id) REFERENCES metric_definitions(id),
  FOREIGN KEY (build_id) REFERENCES build_contexts(id),
  UNIQUE(metric_id, build_id),
  CHECK(
    (value_numeric IS NOT NULL AND value_label IS NULL) OR
    (value_numeric IS NULL AND value_label IS NOT NULL)
  )
);

CREATE INDEX idx_metric_value_metric ON metric_values(metric_id, collected_at);
CREATE INDEX idx_metric_value_build ON metric_values(build_id);
```

---

## Concurrency Model

### Write Concurrency
- **WAL Mode**: Enabled for all database connections
- **Transaction Mode**: IMMEDIATE transactions for writes
- **Busy Timeout**: 5000ms
- **Retry Strategy**: 3 attempts with exponential backoff (100ms, 200ms, 400ms)

### Read Concurrency
- **Isolation Level**: Read Uncommitted (acceptable for metrics)
- **No Lock Contention**: WAL mode allows concurrent reads during writes

### Artifact Merge Strategy
When multiple concurrent jobs write to the database:
1. Each job downloads the latest artifact
2. Job performs its writes (new build + metric values)
3. Job uploads updated database as new artifact
4. GitHub Actions handles artifact versioning
5. Report generation uses latest artifact

**Note**: Concurrent jobs may overwrite each other's artifacts, but each job's data is preserved because they insert to different builds. The "last write wins" artifact model is acceptable since SQLite ensures data consistency within each write operation.

---

## Data Retention

**MVP Policy**: No automatic deletion

- All historical data is preserved
- Database size management is user responsibility

**Estimated Storage**:
- Metric definition: ~100 bytes
- Build context: ~200 bytes
- Metric value: ~50 bytes
- 1000 builds × 10 metrics = ~500KB (negligible)

---

## Error Handling

### Validation Errors
- **Config validation**: Fail fast with detailed error message
- **Type mismatch**: Error if numeric value provided for label metric (and vice versa)
- **Foreign key violations**: Should never occur (defensive programming)

### Collection Errors
- **Command execution failure**: Log error, skip metric, continue with others
- **Parse error**: Log warning, skip metric value
- **Database lock**: Retry with backoff, fail after 3 attempts

### Report Generation Errors
- **Missing data**: Generate report with available data, show warnings
- **Invalid data**: Skip invalid records, log warnings
- **Empty database**: Generate report with "no data" message

---

## Migration Strategy

**Initial Schema**: Version 1 (MVP)

**Future Migrations**:
- Handled via migration scripts in `src/database/migrations.ts`
- Version tracking table: `schema_version`
- Apply migrations on database initialization
- No breaking changes to existing data

---

## Query Patterns

### Common Queries

**Get all metrics for a time range**:
```sql
SELECT 
  md.name,
  md.type,
  md.unit,
  mv.value_numeric,
  mv.value_label,
  mv.collected_at,
  bc.commit_sha,
  bc.branch
FROM metric_values mv
JOIN metric_definitions md ON mv.metric_id = md.id
JOIN build_contexts bc ON mv.build_id = bc.id
WHERE bc.timestamp >= ? AND bc.timestamp <= ?
ORDER BY md.name, bc.timestamp;
```

**Get latest value for each metric**:
```sql
SELECT 
  md.name,
  mv.value_numeric,
  mv.value_label,
  mv.collected_at
FROM metric_values mv
JOIN metric_definitions md ON mv.metric_id = md.id
JOIN build_contexts bc ON mv.build_id = bc.id
WHERE (md.id, bc.timestamp) IN (
  SELECT md2.id, MAX(bc2.timestamp)
  FROM metric_definitions md2
  JOIN metric_values mv2 ON md2.id = mv2.metric_id
  JOIN build_contexts bc2 ON mv2.build_id = bc2.id
  GROUP BY md2.id
);
```

**Performance Characteristics**:
- Time range queries: O(log n) with timestamp index
- Metric lookup: O(1) with name index
- Full scan for reports: O(n) acceptable for MVP scale (<1000 builds)
