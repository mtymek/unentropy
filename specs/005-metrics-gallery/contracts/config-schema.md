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

```typescript
interface MetricConfig {
  $ref?: string;                  // NEW: Optional built-in metric ID
  name?: string;                  // Required when no $ref, optional override when $ref present
  type?: 'numeric' | 'label';     // Required when no $ref, inherited when $ref present
  command?: string;               // Required when no $ref, optional override when $ref present
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

### Override Properties (optional for built-in metric references)

When using `$ref`, all `MetricConfig` properties can be provided as overrides:

| Property | Type | Constraints | Effect |
|----------|------|-------------|--------|
| `name` | string | Pattern: `^[a-z0-9-]+$`, Length: 1-64 chars | Overrides built-in metric name |
| `description` | string | Max 256 characters | Overrides built-in description |
| `command` | string | Non-empty, Max 1024 characters | Overrides built-in command |
| `unit` | string | Max 10 characters | Overrides built-in unit |
| `timeout` | number | Positive integer, Max 300000 ms | Adds/overrides timeout |

**Override Behavior**:
- Properties specified alongside `$ref` take precedence over built-in defaults
- Unspecified properties use built-in defaults
- All overrides are validated against MetricConfig schema rules
- Type field (`numeric` | `label`) cannot be overridden (inherited from built-in metric)

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
            "required": ["$ref"],
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

### 1. Pure Built-in Metric References

```json
{
  "metrics": [
    {"$ref": "coverage"},
    {"$ref": "bundle-size"},
    {"$ref": "loc"}
  ]
}
```

### 2. Built-in Metrics with Overrides

```json
{
  "metrics": [
    {
      "$ref": "coverage",
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

### 3. Mixed Built-in and Custom Metrics

```json
{
  "metrics": [
    {"$ref": "coverage"},
    {"$ref": "loc"},
    {
      "name": "custom-score",
      "type": "numeric",
      "command": "./scripts/calculate-score.sh"
    }
  ]
}
```

### 4. Complete Configuration

```json
{
  "metrics": [
    {"$ref": "coverage"},
    {"$ref": "bundle-size"}
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
2. **No type override**: Type is inherited from built-in metric and cannot be overridden
3. **Override validation**: All override properties must pass MetricConfig validation
4. **Name uniqueness**: Resolved metric names must be unique (applies after override)

### Resolution Order

1. Parse configuration JSON
2. For each metrics array entry:
   - If `$ref` present: Look up built-in metric
   - If not found: Error with available IDs
   - Merge built-in defaults with user overrides
   - Validate merged metric against MetricConfig schema
3. Check for duplicate metric names across all resolved metrics
4. Return validated configuration

## Error Messages

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

## Backward Compatibility

### Version 1.x Compatibility

- All version 1.x configurations remain valid without changes
- Existing custom metrics work exactly as before
- No breaking changes to schema structure
- `$ref` is purely additive functionality

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
