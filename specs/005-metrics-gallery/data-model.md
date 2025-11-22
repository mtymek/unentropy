# Data Model: Metrics Gallery

**Feature**: 005-metrics-gallery  
**Date**: 2025-11-22  
**Status**: Complete

## Overview

This document defines the data structures and entities for the Metrics Gallery feature. The feature extends the existing configuration model to support built-in metric references while maintaining backward compatibility.

## Core Entities

### 1. MetricTemplate (Built-in Metric Definition)

Represents a built-in metric template in the registry.

```typescript
interface MetricTemplate {
  // Unique identifier for $ref lookups
  id: string;
  
  // Human-readable name (default if not overridden)
  name: string;
  
  // What this metric measures
  description: string;
  
  // Metric type: numeric or label
  type: 'numeric' | 'label';
  
  // Shell command to collect the metric
  command: string;
  
  // Display unit (optional, e.g., '%', 'KB', 'seconds')
  unit?: string;
}
```

**Validation Rules**:
- `id` must be unique across built-in metrics
- `id` must match pattern: `^[a-z0-9-]+$`
- `name` must match existing MetricConfig.name pattern
- `type` must be 'numeric' or 'label'
- `command` must be non-empty string
- `unit` max 10 characters (inherited from MetricConfig)

**Example**:
```typescript
{
  id: 'coverage',
  name: 'coverage',
  description: 'Overall test coverage percentage across the codebase',
  type: 'numeric',
  command: 'bun test --coverage --coverage-reporter=json | jq -r ".total.lines.pct"',
  unit: '%'
}
```

---

### 2. MetricConfig (Extended)

The existing `MetricConfig` interface is extended to support an optional `$ref` property for built-in metric references.

```typescript
interface MetricConfig {
  // NEW: Optional built-in metric reference
  $ref?: string;
  
  // Required for custom metrics, optional when $ref present (overrides)
  name?: string;
  type?: 'numeric' | 'label';
  command?: string;
  
  // Optional properties (existing)
  description?: string;
  unit?: string;
  timeout?: number;
}
```

**Validation Rules**:
- **When `$ref` is present**: Only `$ref` is required, other properties are overrides
- **When `$ref` is absent**: `name`, `type`, and `command` are required (existing behavior)
- Override properties follow same validation as base MetricConfig
- `$ref` value must exist in built-in metrics registry

**Example with $ref**:
```typescript
{
  $ref: 'coverage',
  name: 'my-custom-coverage',
  command: 'npm run test:coverage | custom-parser'
}
```

**Example without $ref (custom metric)**:
```typescript
{
  name: 'custom-metric',
  type: 'numeric',
  command: 'echo 42'
}
```

**Example Array (mixing both)**:
```typescript
[
  { $ref: 'coverage' },                    // Built-in metric reference
  { $ref: 'bundle-size', unit: 'MB' },    // Built-in ref with override
  {                                        // Custom metric
    name: 'custom-metric',
    type: 'numeric',
    command: 'echo 42'
  }
]
```

---

## Configuration Schema Extension

### UnentropyConfig (Unchanged)

```typescript
interface UnentropyConfig {
  // Accepts MetricConfig with optional $ref
  metrics: MetricConfig[];
  
  // Existing properties unchanged
  storage?: StorageConfig;
  qualityGate?: QualityGateConfig;
}
```

**Change**: `MetricConfig` now supports optional `$ref` property for built-in metric references.

**Backward Compatibility**: Existing configs with full `MetricConfig` objects remain valid (no `$ref` means custom metric).

---

## Resolution Process

### Input: Configuration with References

```json
{
  "metrics": [
    {"$ref": "coverage"},
    {"$ref": "bundle-size", "name": "prod-bundle"},
    {
      "name": "custom-metric",
      "type": "numeric",
      "command": "echo 42"
    }
  ]
}
```

### Resolution Steps

1. **Load Configuration**: Parse JSON into `UnentropyConfig` structure
2. **Iterate Metrics**: For each entry in `metrics` array:
   - **If `$ref` present**: 
     - Look up built-in metric by ID
     - If not found, throw validation error with available IDs
     - Merge built-in definition with user overrides
     - Validate merged result against `MetricConfig` schema
   - **If no `$ref`**: Keep entry as-is (existing custom metric)
3. **Return Resolved Config**: All metrics are now full `MetricConfig` objects

### Output: Resolved Configuration

```typescript
{
  metrics: [
    {
      name: 'coverage',
      type: 'numeric',
      description: 'Overall test coverage percentage across the codebase',
      command: 'bun test --coverage --coverage-reporter=json | jq -r ".total.lines.pct"',
      unit: '%'
    },
    {
      name: 'prod-bundle',
      type: 'numeric',
      description: 'Total size of production build artifacts',
      command: 'find dist/ -name "*.js" -type f | xargs wc -c | tail -1 | awk \'{print int($1/1024)}\'',
      unit: 'KB'
    },
    {
      name: 'custom-metric',
      type: 'numeric',
      command: 'echo 42'
    }
  ]
}
```

---

## Built-in Metrics Registry Structure

### Registry Map

```typescript
type BuiltInMetricsRegistry = Record<string, MetricTemplate>;

const BUILT_IN_METRICS: BuiltInMetricsRegistry = {
  'coverage': { /* metric definition */ },
  'function-coverage': { /* metric definition */ },
  'loc': { /* metric definition */ },
  'bundle-size': { /* metric definition */ },
  'build-time': { /* metric definition */ },
  'test-time': { /* metric definition */ },
  'dependencies-count': { /* metric definition */ }
};
```

**Access Pattern**:
```typescript
function getBuiltInMetric(id: string): MetricTemplate | undefined {
  return BUILT_IN_METRICS[id];
}
```

---

## Error Scenarios

### 1. Invalid Reference ID

**Input**:
```json
{"$ref": "unknown-metric"}
```

**Error**:
```
Invalid metric reference: "$ref: unknown-metric"
Available built-in metrics: coverage, function-coverage, loc, bundle-size, 
build-time, test-time, dependencies-count
```

### 2. Invalid Override Property

**Input**:
```json
{"$ref": "coverage", "type": "invalid-type"}
```

**Error**:
```
Error in metric "coverage": type must be either 'numeric' or 'label'
Found: 'invalid-type'
```

### 3. Conflicting Override

**Input**:
```json
{"$ref": "coverage", "name": "Test Coverage"}
```

**Error**:
```
Error in metric "Test Coverage": name must be lowercase with hyphens only
Valid pattern: ^[a-z0-9-]+$
Example: test-coverage
```

---

## Relationship to Existing Data Model

### No Changes to Storage Schema

- Built-in metrics are resolved at configuration load time
- Storage layer receives standard `MetricConfig` objects
- No database schema changes required
- Existing tables (`metric_definitions`, `metric_values`) unchanged

### Integration with Quality Gate (Feature 004)

- Built-in metrics include recommended threshold behaviors (documented)
- Users configure thresholds explicitly in `qualityGate.thresholds[]`
- Built-in metrics do not auto-apply thresholds
- Quality gate feature operates on resolved metrics (indistinguishable from custom)

---

## Type Definitions Summary

```typescript
// Core built-in metric template type
interface MetricTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'numeric' | 'label';
  command: string;
  unit?: string;
}

// Extended MetricConfig (supports both custom and built-in refs)
interface MetricConfig {
  $ref?: string;              // NEW: Optional built-in metric reference
  name?: string;              // Required when no $ref, optional override when $ref present
  type?: 'numeric' | 'label'; // Required when no $ref, inherited when $ref present
  command?: string;           // Required when no $ref, optional override when $ref present
  description?: string;
  unit?: string;
  timeout?: number;
}

// Registry
type BuiltInMetricsRegistry = Record<string, MetricTemplate>;

// Config (unchanged signature)
interface UnentropyConfig {
  metrics: MetricConfig[];
  storage?: StorageConfig;
  qualityGate?: QualityGateConfig;
}
```

---

## Implementation Notes

1. **Type Guards**: Check for `$ref` property to distinguish built-in metric references from custom metrics:
   ```typescript
   function hasBuiltInRef(config: MetricConfig): config is MetricConfig & { $ref: string } {
     return '$ref' in config && typeof config.$ref === 'string';
   }
   ```

2. **Validation Order**:
   - Check if `$ref` is present
   - If present: validate $ref exists in registry, resolve and merge overrides
   - If absent: validate as full custom metric (name, type, command required)
   - Validate final metric against MetricConfig schema

3. **Export Strategy**:
   - `src/metrics/index.ts` exports public API
   - `src/metrics/types.ts` exports MetricTemplate interface
   - `src/metrics/registry.ts` exports built-in metric template definitions
   - `src/metrics/resolver.ts` exports resolution logic
   - `src/config/schema.ts` extends existing MetricConfig schema with optional $ref
