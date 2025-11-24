# Configuration Schema Contract: Metrics Gallery

**Feature**: 005-metrics-gallery  
**File**: `unentropy.json`  
**Version**: 2.0.0  
**Last Updated**: 2025-11-22

## Overview

This document extends the base configuration schema from 001-mvp-metrics-tracking to support built-in metric references. The extension adds the ability to reference pre-defined metrics using `$ref` syntax while maintaining full backward compatibility with existing custom metric definitions.

## Schema Changes

### Base Schema Reference

The base configuration schema is defined in `/specs/001-mvp-metrics-tracking/contracts/config-schema.md` and covers:
- `metrics`: Array of metric definitions
- `storage`: Optional storage configuration (from 003-unified-s3-action)
- `qualityGate`: Optional quality gate configuration (from 004-metrics-quality-gate)

### Extension: MetricConfig with Optional $ref

This feature extends `MetricConfig` to support an optional `$ref` property for built-in metric references.

**Important**: The `command` field is ALWAYS required, regardless of whether `$ref` is used. Built-in metrics are metadata templates only and do not provide commands. This ensures Unentropy remains technology-agnostic and supports diverse project setups.

```typescript
interface MetricConfig {
  $ref?: string;                  // NEW: Optional built-in metric ID
  name?: string;                  // Required when no $ref, optional override when $ref present
  type?: 'numeric' | 'label';     // Required when no $ref, inherited when $ref present
  command: string;                // ALWAYS required (user must provide project-specific command)
  description?: string;           // Optional
  unit?: string;                  // Optional
  timeout?: number;               // Optional
}
```

### Metrics Array (Unchanged Interface)

```typescript
interface UnentropyConfig {
  metrics: MetricConfig[];  // Accepts MetricConfig with optional $ref
  storage?: StorageConfig;
  qualityGate?: QualityGateConfig;
}
```

## Field Specifications

### $ref (required for built-in metric references)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `$ref` | string | Yes (for references) | Must match a built-in metric template ID | References a built-in metric template by its unique identifier |

**Validation Rules**:
- Must be a non-empty string
- Must match an existing built-in metric ID
- Case-sensitive lookup
- When present, creates a `MetricReference` type

**Available Built-in Metric IDs** (v2.0.0):
- `coverage` - Test coverage percentage
- `function-coverage` - Function coverage percentage
- `loc` - Lines of code
- `bundle-size` - Production bundle size
- `build-time` - Build duration
- `test-time` - Test suite duration
- `dependencies-count` - Dependency count

### Required and Override Properties

When using `$ref`, the following rules apply:

| Property | Required | Constraints | Effect |
|----------|----------|-------------|--------|
| `command` | **Yes** | Non-empty, Max 1024 characters | **Always required** - must be provided by user for project-specific execution |
| `name` | No | Pattern: `^[a-z0-9-]+$`, Length: 1-64 chars | Optional override of built-in metric name |
| `description` | No | Max 256 characters | Optional override of built-in description |
| `unit` | No | Max 10 characters | Optional override of built-in unit |
| `timeout` | No | Positive integer, Max 300000 ms | Optional timeout specification |

**Inheritance and Override Behavior**:
- `type` field (`numeric` | `label`) is inherited from built-in metric and cannot be overridden
- `name`, `description`, and `unit` use built-in defaults unless explicitly overridden
- `command` is NEVER inherited - must always be provided by the user
- All properties are validated against MetricConfig schema rules

## JSON Schema (Extended)

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
        "oneOf": [
          {
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
              },
              "timeout": {
                "type": "number",
                "minimum": 1,
                "maximum": 300000
              }
            },
            "additionalProperties": false
          },
          {
            "type": "object",
            "required": ["$ref", "command"],
            "properties": {
              "$ref": {
                "type": "string",
                "enum": [
                  "coverage",
                  "function-coverage",
                  "loc",
                  "bundle-size",
                  "build-time",
                  "test-time",
                  "dependencies-count"
                ]
              },
              "name": {
                "type": "string",
                "pattern": "^[a-z0-9-]+$",
                "minLength": 1,
                "maxLength": 64
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
              },
              "timeout": {
                "type": "number",
                "minimum": 1,
                "maximum": 300000
              }
            },
            "additionalProperties": false
          }
        ]
      }
    },
    "storage": {
      "$comment": "Unchanged from existing schema"
    },
    "qualityGate": {
      "$comment": "Unchanged from existing schema"
    }
  }
}
```

## Example Configurations

### 1. Pure Built-in Metric References (Traditional Commands)

```json
{
  "metrics": [
    {
      "$ref": "coverage",
      "command": "bun test --coverage --coverage-reporter=json | jq -r '.total.lines.pct'"
    },
    {
      "$ref": "bundle-size",
      "command": "du -k dist/bundle.js | cut -f1"
    },
    {
      "$ref": "loc",
      "command": "find src/ -name '*.ts' | xargs wc -l | tail -1 | awk '{print $1}'"
    }
  ]
}
```

### 1b. Pure Built-in Metric References (CLI Helpers)

```json
{
  "metrics": [
    {
      "$ref": "coverage",
      "command": "bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json"
    },
    {
      "$ref": "bundle-size",
      "command": "bun run build && unentropy collect size ./dist/"
    },
    {
      "$ref": "loc",
      "command": "unentropy collect size ./src/"
    }
  ]
}
```

### 2. Built-in Metrics with Property Overrides

```json
{
  "metrics": [
    {
      "$ref": "coverage",
      "command": "npm run test:coverage -- --json | jq -r '.coverage.total'",
      "name": "unit-test-coverage"
    },
    {
      "$ref": "bundle-size",
      "command": "du -k dist/main.js | cut -f1",
      "unit": "KB"
    }
  ]
}
```

### 2b. Built-in Metrics with Property Overrides (CLI Helpers)

```json
{
  "metrics": [
    {
      "$ref": "coverage",
      "command": "npm run test:coverage && unentropy collect coverage-json ./coverage/coverage.json",
      "name": "unit-test-coverage"
    },
    {
      "$ref": "bundle-size",
      "command": "npm run build && unentropy collect size ./dist/",
      "unit": "KB"
    }
  ]
}
```

### 3. Mixed Built-in and Custom Metrics

```json
{
  "metrics": [
    {
      "$ref": "coverage",
      "command": "bun test --coverage --coverage-reporter=json | jq -r '.total.lines.pct'"
    },
    {
      "$ref": "loc",
      "command": "find src/ -name '*.ts' | xargs wc -l | tail -1 | awk '{print $1}'"
    },
    {
      "name": "custom-score",
      "type": "numeric",
      "command": "./scripts/calculate-score.sh"
    }
  ]
}
```

### 3b. Mixed Built-in and Custom Metrics (CLI Helpers)

```json
{
  "metrics": [
    {
      "$ref": "coverage",
      "command": "bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json"
    },
    {
      "$ref": "loc",
      "command": "unentropy collect size ./src/"
    },
    {
      "name": "custom-score",
      "type": "numeric",
      "command": "./scripts/calculate-score.sh"
    }
  ]
}
```

### 4. Complete Configuration with Quality Gate

```json
{
  "metrics": [
    {
      "$ref": "coverage",
      "command": "bun test --coverage --coverage-reporter=json | jq -r '.total.lines.pct'"
    },
    {
      "$ref": "bundle-size",
      "command": "du -k dist/bundle.js | cut -f1"
    }
  ],
  "storage": {
    "type": "sqlite-s3"
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "no-regression",
        "tolerance": 0.5
      }
    ]
  }
}
```

### 4b. Complete Configuration with Quality Gate (CLI Helpers)

```json
{
  "metrics": [
    {
      "$ref": "coverage",
      "command": "bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json"
    },
    {
      "$ref": "bundle-size",
      "command": "bun run build && unentropy collect size ./dist/"
    }
  ],
  "storage": {
    "type": "sqlite-s3"
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "no-regression",
        "tolerance": 0.5
      }
    ]
  }
}
```

## Validation Rules

### Reference Validation

1. **Valid $ref**: Must match one of the built-in metric IDs (case-sensitive)
2. **Command required**: `command` field must always be provided, regardless of `$ref` usage
3. **No type override**: Type is inherited from built-in metric and cannot be overridden
4. **Property validation**: All properties must pass MetricConfig validation
5. **Name uniqueness**: Resolved metric names must be unique (applies after override)

### Resolution Order

1. Parse configuration JSON
2. For each metrics array entry:
   - If `$ref` present: Look up built-in metric
   - If not found: Error with available IDs
   - Merge built-in defaults with user overrides
   - Validate merged metric against MetricConfig schema
3. Check for duplicate metric names across all resolved metrics
4. Return validated configuration

### Error Messages

### Missing Command Field

```
Error in metric with "$ref: coverage": command field is required
Built-in metrics are templates only and do not provide commands.
You must specify a command appropriate for your project's technology and setup.
```

### Invalid Built-in Metric Reference

```
Invalid metric reference: "$ref: unknown-metric"
Available built-in metrics: coverage, function-coverage, loc, bundle-size, 
build-time, test-time, dependencies-count
```

### Invalid Override

```
Error in metric "coverage": name must be lowercase with hyphens only
Valid pattern: ^[a-z0-9-]+$
Example: test-coverage
```

### Duplicate Name After Resolution

```
Duplicate metric name "coverage" found after resolving built-in metric references.
Metric names must be unique within the configuration.
```

## CLI Helper Command Patterns

### Supported CLI Helper Formats

Unentropy CLI helpers follow this pattern:
```bash
unentropy collect <format-type> <source-path> [options]
```

**Available Format Types**:
- `coverage-lcov <path>` - Parse LCOV format coverage reports
- `coverage-json <path>` - Parse JSON format coverage reports  
- `coverage-xml <path>` - Parse XML format coverage reports
- `size <path>` - Calculate file or directory size (KB)

### CLI Helper Integration Examples

**Coverage with CLI Helper**:
```json
{
  "$ref": "coverage",
  "command": "bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json"
}
```

**Bundle Size with CLI Helper**:
```json
{
  "$ref": "bundle-size", 
  "command": "bun run build && unentropy collect size ./dist/"
}
```

**File Size with CLI Helper**:
```json
{
  "$ref": "bundle-size",
  "command": "unentropy collect size ./dist/bundle.js"
}
```

### CLI Helper Validation

CLI helper commands follow the same validation rules as traditional commands:
- Must be non-empty strings
- Maximum 1024 characters
- Must be executable in GitHub Actions environment
- Output must match metric type (numeric for numeric metrics)

## Backward Compatibility

### Version 1.x Compatibility

- All version 1.x configurations remain valid without changes
- Existing custom metrics work exactly as before
- No breaking changes to schema structure
- `$ref` is purely additive functionality
- CLI helpers are optional - traditional commands continue to work

### Migration Path

No migration required. Users can:
1. Continue using existing custom metrics
2. Gradually replace custom metrics with built-in metric references
3. Mix both approaches in same configuration

### Deprecation Policy

No properties or functionality deprecated in this version.

## Versioning

**Version**: 2.0.0 (major version bump for new feature)

**Breaking Changes**: None - purely additive

**New Features**:
- Built-in metric references via `$ref`
- Property override support for built-in metrics
- 7 built-in metrics

**Future Compatibility**:
- New built-in metrics may be added in minor versions
- Built-in metric definitions may be updated in minor versions
- Schema structure will remain stable
