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
  
  // Display unit (optional, e.g., '%', 'KB', 'seconds')
  unit?: string;
  
  // Note: command is NOT included - users must provide project-specific commands
}
```

**Validation Rules**:
- `id` must be unique across built-in metrics
- `id` must match pattern: `^[a-z0-9-]+$`
- `name` must match existing MetricConfig.name pattern
- `type` must be 'numeric' or 'label'
- `unit` max 10 characters (inherited from MetricConfig)
- `command` is NOT included - users must provide project-specific commands

**Example**:
```typescript
{
  id: 'coverage',
  name: 'coverage',
  description: 'Overall test coverage percentage across codebase',
  type: 'numeric',
  unit: '%'
  // Note: command is NOT included - users provide project-specific commands
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
  
  // ALWAYS required - users must provide project-specific commands
  command: string;
  
  // Optional properties (existing)
  description?: string;
  unit?: string;
  timeout?: number;
}
```

**Validation Rules**:
- **When `$ref` is present**: `$ref` and `command` are required, other properties are overrides
- **When `$ref` is absent**: `name`, `type`, and `command` are required (existing behavior)
- Override properties follow same validation as base MetricConfig
- `$ref` value must exist in built-in metrics registry
- `command` is ALWAYS required - built-in metrics do not provide commands

**Example with $ref**:
```typescript
{
  $ref: 'coverage',
  name: 'my-custom-coverage',
  command: 'npm run test:coverage && unentropy collect coverage-json ./coverage/coverage.json'
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
  { 
    $ref: 'coverage',
    command: 'bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json'
  },                                      // Built-in metric reference
  { 
    $ref: 'bundle-size', 
    unit: 'MB',
    command: 'bun run build && unentropy collect size ./dist/'
  },                                      // Built-in ref with override
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
    {
      "$ref": "coverage",
      "command": "bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json"
    },
    {
      "$ref": "bundle-size", 
      "name": "prod-bundle",
      "command": "bun run build && unentropy collect size ./dist/"
    },
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
      description: 'Overall test coverage percentage across codebase',
      command: 'bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json',
      unit: '%'
    },
    {
      name: 'prod-bundle',
      type: 'numeric',
      description: 'Total size of production build artifacts',
      command: 'bun run build && unentropy collect size ./dist/',
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

## CLI Helper Architecture

### CLI Helper Command Structure

CLI helpers provide simplified commands for standard format parsing:

```typescript
interface CliHelperCommand {
  format: 'coverage-lcov' | 'coverage-json' | 'coverage-xml' | 'size';
  sourcePath: string;
  options?: Record<string, any>;
}
```

### Supported Format Parsers

```typescript
interface FormatParser {
  parse(input: string | Buffer): number | string;
  validate(input: string | Buffer): boolean;
  getDefaultOutput(): number | string;
}

// Coverage parsers
interface LcovParser extends FormatParser {
  parse(lcovContent: string): number; // Returns coverage percentage
}

interface JsonCoverageParser extends FormatParser {
  parse(jsonContent: string): number; // Returns coverage percentage
}

interface XmlCoverageParser extends FormatParser {
  parse(xmlContent: string): number; // Returns coverage percentage
}

// Size parser
interface SizeParser extends FormatParser {
  parse(path: string): number; // Returns size in KB
}
```

### CLI Helper Integration

CLI helpers are invoked through the main CLI:
```bash
unentropy collect <format-type> <source-path>
```

**Examples**:
- `unentropy collect coverage-json ./coverage/coverage.json`
- `unentropy collect coverage-lcov ./coverage/lcov.info`
- `unentropy collect size ./dist/`

### CLI Helper Data Flow

1. **CLI Invocation**: User runs `unentropy collect format path`
2. **Format Detection**: CLI routes to appropriate parser based on format type
3. **File Processing**: Parser reads and processes the source file/directory
4. **Value Extraction**: Parser extracts numeric value from standard format
5. **Output**: CLI outputs single numeric value to stdout
6. **Integration**: Value can be captured in metric collection commands

### CLI Helper Benefits

- **Simplified Commands**: Replace complex jq/awk pipelines
- **Standard Formats**: Support industry-standard formats (LCOV, JSON, XML)
- **Tool Agnostic**: Work with any tool outputting standard formats
- **Error Handling**: Built-in error handling and sensible defaults
- **Optional**: Users can still use custom commands when needed

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
  unit?: string;
  // Note: command is NOT included - users provide project-specific commands
}

// Extended MetricConfig (supports both custom and built-in refs)
interface MetricConfig {
  $ref?: string;              // NEW: Optional built-in metric reference
  name?: string;              // Required when no $ref, optional override when $ref present
  type?: 'numeric' | 'label'; // Required when no $ref, inherited when $ref present
  command: string;             // ALWAYS required - users must provide commands
  description?: string;
  unit?: string;
  timeout?: number;
}

// CLI Helper types
interface CliHelperCommand {
  format: 'coverage-lcov' | 'coverage-json' | 'coverage-xml' | 'size';
  sourcePath: string;
  options?: Record<string, any>;
}

interface FormatParser {
  parse(input: string | Buffer): number | string;
  validate(input: string | Buffer): boolean;
  getDefaultOutput(): number | string;
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
   - `src/metrics/collectors/` exports format parsers for CLI helpers
   - `src/cli/cmd/collect.ts` exports CLI helper command handler
   - `src/config/schema.ts` extends existing MetricConfig schema with optional $ref
