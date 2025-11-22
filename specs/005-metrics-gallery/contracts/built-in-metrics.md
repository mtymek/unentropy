# Built-in Metrics Registry Contract

**Feature**: 005-metrics-gallery  
**Version**: 1.0.0  
**Last Updated**: 2025-11-22

## Overview

This contract defines the built-in metrics available in the Metrics Gallery. Each metric includes a unique ID, default configuration, and collection command optimized for GitHub Actions environments.

## Registry Structure

```typescript
interface MetricTemplate {
  id: string;           // Unique identifier for $ref
  name: string;         // Default metric name
  description: string;  // What the metric measures
  type: 'numeric' | 'label';
  command: string;      // Shell command for collection
  unit?: string;        // Display unit
}
```

## Built-in Metrics

### Coverage Metrics

#### 1. coverage

```typescript
{
  id: 'coverage',
  name: 'coverage',
  description: 'Overall test coverage percentage across the codebase',
  type: 'numeric',
  command: 'bun test --coverage --coverage-reporter=json 2>/dev/null | jq -r ".total.lines.pct" 2>/dev/null || echo "0"',
  unit: '%'
}
```

**Recommended Threshold**: `no-regression` with tolerance 0.5%

**Command Notes**:
- Uses Bun's built-in coverage reporter
- Outputs JSON format for parsing
- Falls back to "0" if coverage data unavailable
- Suppresses stderr to avoid noise

---

#### 2. function-coverage

```typescript
{
  id: 'function-coverage',
  name: 'function-coverage',
  description: 'Percentage of functions covered by tests',
  type: 'numeric',
  command: 'bun test --coverage --coverage-reporter=json 2>/dev/null | jq -r ".total.functions.pct" 2>/dev/null || echo "0"',
  unit: '%'
}
```

**Recommended Threshold**: `no-regression` with tolerance 0.5%

**Command Notes**:
- Similar to overall coverage but tracks functions
- Useful for ensuring all functions have at least some test coverage

---

### Code Size Metrics

#### 3. loc

```typescript
{
  id: 'loc',
  name: 'loc',
  description: 'Total lines of code in the codebase',
  type: 'numeric',
  command: 'find src/ -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk \'{print $1}\' || echo "0"',
  unit: 'lines'
}
```

**Recommended Threshold**: None (informational metric)

**Command Notes**:
- Counts TypeScript/TSX files in src/ directory
- Uses standard Unix utilities
- Adjustable by overriding command for different file patterns

---

#### 4. bundle-size

```typescript
{
  id: 'bundle-size',
  name: 'bundle-size',
  description: 'Total size of production build artifacts',
  type: 'numeric',
  command: 'find dist/ -name "*.js" -type f 2>/dev/null | xargs wc -c 2>/dev/null | tail -1 | awk \'{print int($1/1024)}\' || echo "0"',
  unit: 'KB'
}
```

**Recommended Threshold**: `delta-max-drop` with 5% maximum increase

**Command Notes**:
- Measures all JS files in dist/ directory
- Converts bytes to KB using integer division
- Useful for tracking bundle bloat over time

---

### Performance Metrics

#### 5. build-time

```typescript
{
  id: 'build-time',
  name: 'build-time',
  description: 'Time taken to complete the build',
  type: 'numeric',
  command: '(time bun run build) 2>&1 | grep real | awk \'{print $2}\' | sed \'s/[^0-9.]//g\' || echo "0"',
  unit: 'seconds'
}
```

**Recommended Threshold**: `delta-max-drop` with 10% maximum increase

**Command Notes**:
- Uses Unix `time` command to measure build duration
- Extracts "real" time (wall clock time)
- Removes formatting to get numeric seconds value

---

#### 6. test-time

```typescript
{
  id: 'test-time',
  name: 'test-time',
  description: 'Time taken to run all tests',
  type: 'numeric',
  command: '(time bun test) 2>&1 | grep real | awk \'{print $2}\' | sed \'s/[^0-9.]//g\' || echo "0"',
  unit: 'seconds'
}
```

**Recommended Threshold**: `delta-max-drop` with 10% maximum increase

**Command Notes**:
- Measures full test suite execution time
- Helps identify performance regressions in tests
- May vary with parallel test execution settings

---

### Dependency Metrics

#### 7. dependencies-count

```typescript
{
  id: 'dependencies-count',
  name: 'dependencies-count',
  description: 'Total number of direct dependencies',
  type: 'numeric',
  command: 'cat package.json | jq ".dependencies | length" 2>/dev/null || echo "0"',
  unit: 'count'
}
```

**Recommended Threshold**: None (monitoring only)

**Command Notes**:
- Counts entries in package.json dependencies object
- Does not include devDependencies
- Useful for tracking dependency footprint

---

## Command Design Principles

All built-in metric commands follow these principles:

1. **Standard Unix Utilities**: Use widely available tools (find, wc, awk, grep, jq)
2. **GitHub Actions Compatible**: Work in default GitHub Actions Ubuntu runners
3. **Graceful Fallback**: Return "0" or appropriate default if command fails
4. **Error Suppression**: Redirect stderr to /dev/null to avoid noisy output
5. **Single Value Output**: Command produces exactly one numeric value on stdout
6. **No Side Effects**: Commands are read-only and don't modify files

## Command Environment

### Available Tools

GitHub Actions Ubuntu runners include:
- Standard GNU utilities (find, grep, awk, sed, wc)
- jq (JSON processor)
- time (process timing)

### Environment Variables

Commands can access standard Unentropy environment variables:
- `UNENTROPY_COMMIT_SHA`: Current commit SHA
- `UNENTROPY_BRANCH`: Current branch
- `UNENTROPY_RUN_ID`: GitHub Actions run ID
- `UNENTROPY_METRIC_NAME`: Name of current metric
- `UNENTROPY_METRIC_TYPE`: Type of current metric

## Override Examples

### Custom Coverage Command

```json
{
  "$ref": "coverage",
  "command": "npm run test:coverage -- --json | jq -r '.coverage.total'"
}
```

### Different Source Directory

```json
{
  "$ref": "loc",
  "command": "find lib/ -name '*.js' | xargs wc -l | tail -1 | awk '{print $1}'"
}
```

### Multiple Bundle Files

```json
{
  "$ref": "bundle-size",
  "command": "du -k dist/*.bundle.js | awk '{sum+=$1} END {print sum}'"
}
```

## Validation Requirements

### Command Validation

Built-in metric commands must:
1. Exit with status 0 on success
2. Output exactly one line containing a numeric value (for numeric metrics)
3. Complete within default timeout (60 seconds, overridable)
4. Not require interactive input
5. Work from repository root directory

### Output Validation

Command output is validated after execution:
- **Numeric metrics**: Output must be parseable as a float
- **Label metrics**: Output is taken as-is (trimmed)
- Empty output triggers metric collection failure

## Extensibility

### Future Metrics

New built-in metrics may be added in future versions following these guidelines:

1. **ID Convention**: lowercase-with-hyphens
2. **Category Grouping**: coverage, size, quality, security, performance, dependencies
3. **Command Standards**: Follow principles above
4. **Documentation**: Include description, threshold recommendation, command notes
5. **Backward Compatibility**: New metrics don't affect existing IDs

### Platform-Specific Commands

Future versions may support platform detection:
```typescript
{
  id: 'coverage',
  commands: {
    bun: '...',
    node: '...',
    python: '...'
  }
}
```

Currently out of scope - all commands assume Bun/Node.js environment.

## Testing Requirements

Each built-in metric should have:

1. **Unit Test**: Verify metric definition is valid
2. **Command Test**: Execute command in test environment, verify output format
3. **Integration Test**: Resolve metric from registry, collect value, store in DB

## Version History

**1.0.0** (2025-11-22):
- Initial registry with 7 built-in metrics
- Coverage: coverage, function-coverage
- Size: loc, bundle-size
- Performance: build-time, test-time
- Dependencies: dependencies-count
