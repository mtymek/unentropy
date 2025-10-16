# Quickstart Guide: MVP Metrics Tracking

**Feature**: 003-mvp-metrics-tracking  
**Audience**: Developers implementing this feature  
**Last Updated**: Thu Oct 16 2025

## Overview

This guide provides a step-by-step implementation roadmap for building the MVP metrics tracking system. Follow these phases in order to deliver incrementally testable functionality.

## Implementation Phases

### Phase 1: Configuration Layer (Foundation)

**Goal**: Users can define metrics in `unentropy.json` with validation

**Components**:
1. `src/config/schema.ts` - Zod schema definitions
2. `src/config/loader.ts` - Config file loading and validation
3. `src/config/types.ts` - TypeScript type exports

**Implementation Steps**:

```typescript
// 1. Define Zod schema in src/config/schema.ts
import { z } from 'zod';

export const MetricConfigSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/).min(1).max(64),
  type: z.enum(['numeric', 'label']),
  description: z.string().max(256).optional(),
  command: z.string().min(1).max(1024),
  unit: z.string().max(10).optional(),
});

export const DatabaseConfigSchema = z.object({
  path: z.string().optional(),
  artifactName: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

export const UnentropyConfigSchema = z.object({
  metrics: z.array(MetricConfigSchema).min(1).max(50),
  database: DatabaseConfigSchema.optional(),
});

// 2. Export inferred types in src/config/types.ts
export type MetricConfig = z.infer<typeof MetricConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type UnentropyConfig = z.infer<typeof UnentropyConfigSchema>;

// 3. Implement loader in src/config/loader.ts
export async function loadConfig(path: string): Promise<UnentropyConfig> {
  const content = await fs.readFile(path, 'utf-8');
  const json = JSON.parse(content);
  return UnentropyConfigSchema.parse(json);
}
```

**Tests** (`tests/unit/config/`):
- Valid config parses successfully
- Invalid metric names rejected
- Duplicate metric names rejected
- Type mismatches caught
- Clear error messages

**Acceptance**: User Story 1, Scenario 1-2

---

### Phase 2: Database Layer

**Goal**: SQLite database with schema initialization and basic CRUD operations

**Components**:
1. `src/database/client.ts` - Database connection management
2. `src/database/migrations.ts` - Schema creation
3. `src/database/queries.ts` - Data access functions
4. `src/database/types.ts` - Entity types

**Implementation Steps**:

```typescript
// 1. Setup connection in src/database/client.ts
import Database from 'better-sqlite3';

export function openDatabase(path: string): Database.Database {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
}

// 2. Schema initialization in src/database/migrations.ts
export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metric_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('numeric', 'label')),
      unit TEXT,
      description TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS build_contexts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commit_sha TEXT NOT NULL,
      branch TEXT NOT NULL,
      run_id TEXT NOT NULL,
      run_number INTEGER NOT NULL,
      actor TEXT,
      event_name TEXT,
      timestamp DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(commit_sha, run_id)
    );
    
    CREATE TABLE IF NOT EXISTS metric_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_id INTEGER NOT NULL,
      build_id INTEGER NOT NULL,
      value_numeric REAL,
      value_label TEXT,
      collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      collection_duration_ms INTEGER,
      FOREIGN KEY (metric_id) REFERENCES metric_definitions(id),
      FOREIGN KEY (build_id) REFERENCES build_contexts(id),
      UNIQUE(metric_id, build_id)
    );
  `);
}

// 3. CRUD operations in src/database/queries.ts
export function insertBuildContext(db: Database.Database, context: BuildContext): number {
  const stmt = db.prepare(`
    INSERT INTO build_contexts (commit_sha, branch, run_id, run_number, actor, event_name, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(/* params */);
  return result.lastInsertRowid as number;
}

export function upsertMetricDefinition(db: Database.Database, metric: MetricConfig): number {
  const stmt = db.prepare(`
    INSERT INTO metric_definitions (name, type, unit, description)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      unit = excluded.unit,
      description = excluded.description
    RETURNING id
  `);
  const row = stmt.get(/* params */) as { id: number };
  return row.id;
}
```

**Tests** (`tests/unit/database/`):
- Schema creates all tables and indexes
- CRUD operations work correctly
- Foreign keys enforced
- Unique constraints enforced
- Concurrent writes handled (busy timeout)

**Acceptance**: FR-009, FR-011

---

### Phase 3: Metric Collection

**Goal**: Execute commands and store metric values

**Components**:
1. `src/collector/context.ts` - Build context extraction
2. `src/collector/runner.ts` - Command execution
3. `src/collector/collector.ts` - Main orchestration

**Implementation Steps**:

```typescript
// 1. Build context in src/collector/context.ts
export function getBuildContext(): BuildContext {
  return {
    commitSha: process.env.GITHUB_SHA!,
    branch: process.env.GITHUB_REF!.replace('refs/heads/', ''),
    runId: process.env.GITHUB_RUN_ID!,
    runNumber: parseInt(process.env.GITHUB_RUN_NUMBER!),
    actor: process.env.GITHUB_ACTOR,
    eventName: process.env.GITHUB_EVENT_NAME,
    timestamp: new Date().toISOString(),
  };
}

// 2. Command execution in src/collector/runner.ts
export async function executeMetricCommand(
  command: string,
  context: BuildContext,
  metricName: string,
  metricType: string
): Promise<string> {
  const env = {
    ...process.env,
    UNENTROPY_COMMIT_SHA: context.commitSha,
    UNENTROPY_BRANCH: context.branch,
    UNENTROPY_METRIC_NAME: metricName,
    UNENTROPY_METRIC_TYPE: metricType,
  };
  
  const result = execSync(command, {
    env,
    timeout: 60000,
    encoding: 'utf-8',
  });
  
  return result.trim();
}

// 3. Main collector in src/collector/collector.ts
export async function collectMetrics(
  config: UnentropyConfig,
  db: Database.Database
): Promise<CollectionResult> {
  const context = getBuildContext();
  const buildId = insertBuildContext(db, context);
  
  const results = await Promise.allSettled(
    config.metrics.map(async (metric) => {
      const metricId = upsertMetricDefinition(db, metric);
      const startTime = Date.now();
      const output = await executeMetricCommand(
        metric.command,
        context,
        metric.name,
        metric.type
      );
      const duration = Date.now() - startTime;
      
      const value = parseMetricValue(output, metric.type);
      insertMetricValue(db, metricId, buildId, value, duration);
    })
  );
  
  return {
    collected: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}
```

**Tests** (`tests/unit/collector/`):
- Commands execute successfully
- Timeout after 60 seconds
- Environment variables passed correctly
- Partial failures handled (FR-010)
- Parse numeric and label values

**Tests** (`tests/integration/`):
- End-to-end collection workflow
- Multiple metrics collected in parallel
- Database updated correctly

**Acceptance**: User Story 2 (all scenarios)

---

### Phase 4: GitHub Action (Collection)

**Goal**: Wrap collector in GitHub Action with artifact management

**Components**:
1. `.github/actions/collect-metrics/action.yml` - Action definition
2. `src/actions/collect.ts` - Action entrypoint

**Implementation Steps**:

```typescript
// 1. Action entrypoint in src/actions/collect.ts
import * as core from '@actions/core';
import * as artifact from '@actions/artifact';

async function run(): Promise<void> {
  try {
    const configPath = core.getInput('config-path') || './unentropy.json';
    const artifactName = core.getInput('database-artifact') || 'unentropy-metrics';
    const dbPath = core.getInput('database-path') || '.unentropy/metrics.db';
    
    // Download existing artifact (if exists)
    await downloadArtifact(artifactName, dbPath);
    
    // Load config and collect metrics
    const config = await loadConfig(configPath);
    const db = openDatabase(dbPath);
    initializeSchema(db);
    const result = await collectMetrics(config, db);
    db.close();
    
    // Upload updated artifact
    await uploadArtifact(artifactName, dbPath);
    
    // Set outputs
    core.setOutput('metrics-collected', result.collected);
    core.setOutput('metrics-failed', result.failed);
    core.setOutput('database-path', dbPath);
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
```

```yaml
# 2. Action definition in .github/actions/collect-metrics/action.yml
name: 'Unentropy Collect Metrics'
description: 'Collect custom code metrics'
inputs:
  config-path:
    description: 'Path to unentropy.json'
    default: './unentropy.json'
  database-artifact:
    description: 'Artifact name for database'
    default: 'unentropy-metrics'
outputs:
  metrics-collected:
    description: 'Number of metrics collected'
  metrics-failed:
    description: 'Number of metrics failed'
runs:
  using: 'node20'
  main: 'dist/collect.js'
```

**Tests** (`tests/contract/`):
- Action inputs validated
- Action outputs set correctly
- Artifact upload/download works
- Error handling (missing config, etc.)

**Acceptance**: FR-006, FR-007, FR-008, FR-012

---

### Phase 5: Report Generation

**Goal**: Generate HTML reports with Chart.js visualizations

**Components**:
1. `src/reporter/generator.ts` - HTML generation
2. `src/reporter/charts.ts` - Chart configuration
3. `src/reporter/templates.ts` - HTML templates

**Implementation Steps**:

```typescript
// 1. Query data in src/reporter/generator.ts
export function generateReport(
  db: Database.Database,
  options: ReportOptions
): string {
  const metrics = queryMetricsWithValues(db, options.timeRange);
  const chartConfigs = metrics.map(buildChartConfig);
  return renderTemplate(metrics, chartConfigs, options);
}

// 2. Chart config in src/reporter/charts.ts
export function buildChartConfig(metric: MetricData): ChartConfig {
  return {
    type: metric.type === 'numeric' ? 'line' : 'bar',
    data: {
      labels: metric.values.map((v) => v.timestamp),
      datasets: [{
        label: metric.name,
        data: metric.values.map((v) => v.value),
      }],
    },
    options: {
      responsive: true,
      scales: metric.type === 'numeric' ? {
        y: { beginAtZero: true }
      } : undefined,
    },
  };
}

// 3. HTML template in src/reporter/templates.ts
export function renderTemplate(
  metrics: MetricData[],
  charts: ChartConfig[],
  options: ReportOptions
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(options.title)}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
      <style>
        @media print {
          .no-print { display: none !important; }
          .metric-card { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body class="bg-gray-50 dark:bg-gray-900">
      ${renderHeader(options.metadata)}
      ${renderMetricsGrid(metrics, charts)}
      ${renderFooter(options.version)}
      <script>${renderChartScripts(charts)}</script>
    </body>
    </html>
  `;
}

// XSS sanitization helper
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Render responsive header with metadata
function renderHeader(metadata: ReportMetadata): string {
  return `
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Unentropy Metrics Report
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              ${escapeHtml(metadata.repository)}
            </p>
          </div>
          <div class="mt-4 sm:mt-0 text-sm text-gray-600 dark:text-gray-400">
            <div>Generated: ${formatDate(metadata.generatedAt)}</div>
            <div>Builds: ${metadata.buildCount}</div>
          </div>
        </div>
      </div>
    </header>
  `;
}

// Render metrics in responsive grid
function renderMetricsGrid(metrics: MetricData[], charts: ChartConfig[]): string {
  if (metrics.length === 0) {
    return renderEmptyState();
  }
  
  return `
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        ${metrics.map((m, i) => renderMetricCard(m, charts[i])).join('')}
      </div>
    </main>
  `;
}

// Render individual metric card with stats and chart
function renderMetricCard(metric: MetricData, chart: ChartConfig): string {
  const stats = calculateStats(metric.values);
  const trend = calculateTrend(metric.values);
  
  return `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div class="mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          ${escapeHtml(metric.name)}
        </h2>
        ${metric.description ? `<p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(metric.description)}</p>` : ''}
      </div>
      
      <!-- Summary Statistics -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">${stats.latest}</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Latest</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">${stats.min}</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Min</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">${stats.max}</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Max</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold ${trend.color}">${trend.arrow} ${trend.percent}%</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Trend</div>
        </div>
      </div>
      
      <!-- Chart Canvas with accessibility -->
      <div class="relative h-64 sm:h-80">
        <canvas id="chart-${metric.id}" aria-label="Line chart showing ${escapeHtml(metric.name)} over time"></canvas>
      </div>
      
      ${metric.values.length < 5 ? renderSparseDataWarning(metric.values.length) : ''}
    </div>
  `;
}
    </html>
  `;
}
```

**Tests** (`tests/unit/reporter/`):
- HTML output is valid and well-formed
- Chart configs generated correctly for numeric and categorical metrics
- Self-contained (includes CDN links, no external files needed after load)
- Empty data handled gracefully with proper empty state UI
- XSS sanitization prevents malicious content in metric names
- Responsive layout renders correctly at mobile/tablet/desktop breakpoints
- Summary statistics (min/max/avg/trend) calculated accurately
- Dark mode classes applied correctly
- ARIA labels present for accessibility
- Print stylesheet produces readable output

**Acceptance**: User Story 3 (all scenarios), FR-013-FR-025

---

### Phase 6: GitHub Action (Reporting)

**Goal**: Wrap reporter in GitHub Action

**Components**:
1. `.github/actions/generate-report/action.yml` - Action definition
2. `src/actions/report.ts` - Action entrypoint

**Implementation Steps**:

```typescript
// 1. Action entrypoint in src/actions/report.ts
async function run(): Promise<void> {
  try {
    const artifactName = core.getInput('database-artifact') || 'unentropy-metrics';
    const outputPath = core.getInput('output-path') || './unentropy-report.html';
    const timeRange = core.getInput('time-range') || 'all';
    const title = core.getInput('title') || 'Metrics Report';
    
    // Download artifact
    const dbPath = await downloadArtifact(artifactName);
    
    // Generate report
    const db = openDatabase(dbPath);
    const html = generateReport(db, { timeRange, title, outputPath });
    await fs.writeFile(outputPath, html);
    db.close();
    
    // Set outputs
    core.setOutput('report-path', outputPath);
    core.setOutput('metrics-count', /* count */);
  } catch (error) {
    core.setFailed(`Report generation failed: ${error.message}`);
  }
}
```

```yaml
# 2. Action definition in .github/actions/generate-report/action.yml
name: 'Unentropy Generate Report'
description: 'Generate HTML metrics report'
inputs:
  database-artifact:
    description: 'Artifact name containing database'
    default: 'unentropy-metrics'
  output-path:
    description: 'Output path for HTML report'
    default: './unentropy-report.html'
  time-range:
    description: 'Time range filter'
    default: 'all'
outputs:
  report-path:
    description: 'Path to generated report'
runs:
  using: 'node20'
  main: 'dist/report.js'
```

**Acceptance**: FR-013-FR-018, SC-003, SC-006

---

## Testing Strategy

### Unit Tests

**Per-module coverage** (target: 90%):
- Config validation: All validation rules
- Database operations: CRUD, constraints, indexes
- Collector: Command execution, parsing, error handling
- Reporter: Template rendering, chart generation

**Run**: `npm test -- tests/unit/`

### Integration Tests

**End-to-end workflows**:
1. Load config → Initialize DB → Collect metrics → Verify storage
2. Load DB → Generate report → Verify HTML output
3. Concurrent collection simulation

**Run**: `npm test -- tests/integration/`

### Contract Tests

**GitHub Action interfaces**:
- Input validation
- Output values
- Artifact operations
- Error scenarios

**Run**: `npm test -- tests/contract/`

---

## Build and Deployment

### Local Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

### GitHub Action Packaging

```bash
# Build action distributions
npm run build:actions

# This creates:
# - .github/actions/collect-metrics/dist/
# - .github/actions/generate-report/dist/
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

---

## Acceptance Criteria Checklist

**User Story 1: Configuration**
- [ ] Valid config loads successfully
- [ ] Invalid configs rejected with clear errors
- [ ] Multiple metrics supported

**User Story 2: Collection**
- [ ] Metrics collected in CI pipeline
- [ ] Data stored with timestamps and commit info
- [ ] Partial failures handled gracefully
- [ ] Multiple runs don't corrupt data

**User Story 3: Reporting**
- [ ] HTML report generated with charts
- [ ] Each metric shown in separate section
- [ ] Self-contained single file
- [ ] Works with sparse data

**Success Criteria**
- [ ] SC-001: Config setup < 5 minutes
- [ ] SC-002: Collection overhead < 30 seconds
- [ ] SC-003: Report generation < 10 seconds (100 points)
- [ ] SC-004: Handles 50+ concurrent runs
- [ ] SC-005: 95% first report in < 15 minutes
- [ ] SC-006: Reports work offline in all browsers
- [ ] SC-007: Config errors resolved in < 3 attempts

---

## Troubleshooting Guide

### Common Issues

**"Database is locked"**
- Cause: Concurrent writes from parallel jobs
- Solution: Retry with exponential backoff (already implemented)

**"Config validation failed"**
- Cause: Invalid metric name or missing fields
- Solution: Check error message, fix config, refer to schema docs

**"Command execution failed"**
- Cause: Metric collection command errored
- Solution: Test command locally, check environment variables

**"Artifact not found"**
- Cause: First run or artifact expired
- Solution: Expected behavior, new database created

---

## Next Steps

After MVP implementation:
1. User testing with real projects
2. Documentation improvements based on feedback
3. Performance optimization based on metrics
4. Plan for future enhancements (see spec.md scope boundaries)

---

## Reference Documents

- [Feature Specification](./spec.md)
- [Technical Plan](./plan.md)
- [Research & Decisions](./research.md)
- [Data Model](./data-model.md)
- [Contracts](./contracts/)
  - [Config Schema](./contracts/config-schema.md)
  - [Database Schema](./contracts/database-schema.md)
  - [Action Interface](./contracts/action-interface.md)
