# Configuration Schema Contract

**Feature**: 003-mvp-metrics-tracking  
**File**: `unentropy.json`  
**Version**: 1.0.0  
**Last Updated**: Thu Oct 16 2025

## Overview

This document defines the JSON schema for the `unentropy.json` configuration file. This contract ensures backward compatibility and provides validation rules for user configurations.

## Schema Definition

### Root Configuration Object

```typescript
interface UnentropyConfig {
  metrics: MetricConfig[];
  database?: DatabaseConfig;
}
```

### MetricConfig

Defines a single metric to be tracked.

```typescript
interface MetricConfig {
  name: string;
  type: 'numeric' | 'label';
  description?: string;
  command: string;
  unit?: string;
}
```

**Field Specifications**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | Yes | Pattern: `^[a-z0-9-]+$`<br>Length: 1-64 chars<br>Must be unique within config | Unique identifier for the metric. Used in database and reports. |
| `type` | enum | Yes | Either `'numeric'` or `'label'` | Determines how values are stored and visualized. |
| `description` | string | No | Max 256 characters | Human-readable explanation shown in reports. |
| `command` | string | Yes | Non-empty<br>Max 1024 characters | Shell command to execute for collecting this metric. |
| `unit` | string | No | Max 10 characters | Display unit for numeric metrics (e.g., '%', 'ms', 'KB'). |

**Validation Rules**:
- `name` must be lowercase alphanumeric with hyphens only
- `name` must be unique across all metrics in the config
- `type` affects how `command` output is parsed:
  - `numeric`: Output parsed as float (supports scientific notation)
  - `label`: Output taken as-is (trimmed string)
- `command` is executed in shell environment with build context variables
- `unit` is only meaningful for `numeric` type (ignored for `label`)

### DatabaseConfig

Optional database configuration for advanced use cases.

```typescript
interface DatabaseConfig {
  path?: string;
  artifactName?: string;
}
```

**Field Specifications**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `path` | string | No | Valid file path<br>Default: `.unentropy/metrics.db` | Custom location for SQLite database file. |
| `artifactName` | string | No | Pattern: `^[a-zA-Z0-9_-]+$`<br>Default: `unentropy-metrics` | Custom name for GitHub Actions artifact. |

## JSON Schema (for validators)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metrics"],
  "properties": {
    "metrics": {
      "type": "array",
      "minItems": 1,
      "maxItems": 50,
      "items": {
        "type": "object",
        "required": ["name", "type", "command"],
        "properties": {
          "name": {
            "type": "string",
            "pattern": "^[a-z0-9-]+$",
            "minLength": 1,
            "maxLength": 64
          },
          "type": {
            "type": "string",
            "enum": ["numeric", "label"]
          },
          "description": {
            "type": "string",
            "maxLength": 256
          },
          "command": {
            "type": "string",
            "minLength": 1,
            "maxLength": 1024
          },
          "unit": {
            "type": "string",
            "maxLength": 10
          }
        }
      }
    },
    "database": {
      "type": "object",
      "properties": {
        "path": {
          "type": "string"
        },
        "artifactName": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9_-]+$"
        }
      }
    }
  }
}
```

## Example Configurations

### Minimal Configuration

```json
{
  "metrics": [
    {
      "name": "test-coverage",
      "type": "numeric",
      "command": "npm run test:coverage -- --json | jq -r '.total.lines.pct'"
    }
  ]
}
```

### Complete Configuration

```json
{
  "metrics": [
    {
      "name": "test-coverage",
      "type": "numeric",
      "description": "Percentage of code covered by tests",
      "command": "npm run test:coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    },
    {
      "name": "bundle-size",
      "type": "numeric",
      "description": "Production bundle size in kilobytes",
      "command": "du -k dist/bundle.js | cut -f1",
      "unit": "KB"
    },
    {
      "name": "build-status",
      "type": "label",
      "description": "Overall build health status",
      "command": "npm run build && echo 'healthy' || echo 'failing'"
    }
  ],
  "database": {
    "path": ".metrics/unentropy.db",
    "artifactName": "my-project-metrics"
  }
}
```

### Multiple Projects Example

```json
{
  "metrics": [
    {
      "name": "api-test-coverage",
      "type": "numeric",
      "command": "cd api && npm run test:coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    },
    {
      "name": "frontend-bundle-size",
      "type": "numeric",
      "command": "du -k frontend/dist/main.js | cut -f1",
      "unit": "KB"
    },
    {
      "name": "e2e-pass-rate",
      "type": "numeric",
      "command": "npm run test:e2e -- --json | jq -r '(.numPassedTests / .numTotalTests * 100)'",
      "unit": "%"
    }
  ]
}
```

## Command Execution Context

When metrics commands are executed, the following environment variables are available:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `UNENTROPY_COMMIT_SHA` | string | Current git commit SHA | `a3f5c2b...` |
| `UNENTROPY_BRANCH` | string | Current git branch | `main` |
| `UNENTROPY_RUN_ID` | string | GitHub Actions run ID | `1234567890` |
| `UNENTROPY_RUN_NUMBER` | string | GitHub Actions run number | `42` |
| `UNENTROPY_ACTOR` | string | User/bot who triggered run | `dependabot[bot]` |
| `UNENTROPY_METRIC_NAME` | string | Name of current metric | `test-coverage` |
| `UNENTROPY_METRIC_TYPE` | string | Type of current metric | `numeric` |

**Command Execution Rules**:
- Commands run in repository root directory
- Standard shell environment (`/bin/sh` on Linux/macOS)
- 60-second timeout per command
- Exit code ignored (only stdout/stderr used)
- Stdout is captured and parsed based on metric type
- Stderr is logged but doesn't fail the metric

## Validation Error Messages

The system provides clear error messages for common mistakes:

**Invalid metric name**:
```
Error in metric "Test-Coverage": name must be lowercase with hyphens only
Valid pattern: ^[a-z0-9-]+$
Example: test-coverage
```

**Duplicate metric names**:
```
Error: Duplicate metric name "test-coverage" found
Metric names must be unique within the configuration
```

**Invalid metric type**:
```
Error in metric "coverage": type must be either 'numeric' or 'label'
Found: 'percentage'
```

**Empty command**:
```
Error in metric "test-coverage": command cannot be empty
Provide a shell command that outputs the metric value
```

**Missing required fields**:
```
Error in metric configuration: missing required fields
Required: name, type, command
Found: name, type
```

## Backward Compatibility

**Version 1.0.0 (MVP)**:
- Initial schema
- All fields defined above

**Future Versions**:
- New optional fields may be added without breaking existing configs
- Required fields will never be removed
- Type changes will be avoided (new fields added instead)
- Deprecated fields will be supported for at least 2 major versions

## Versioning Strategy

Configuration files don't include a version field in MVP. The system assumes version 1.0.0 for all configs.

Future versions may add:
```json
{
  "version": "1.1.0",
  "metrics": [...]
}
```

The system will use the presence of new fields to detect schema version.
