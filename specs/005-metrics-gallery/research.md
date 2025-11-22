# Research: Metrics Gallery

**Feature**: 005-metrics-gallery  
**Date**: 2025-11-22  
**Status**: Complete

## Overview

This document captures research findings and design decisions for implementing the Metrics Gallery feature. All technical clarifications from the planning phase are resolved here.

## Key Design Decisions

### 1. Configuration Syntax for Built-in Metric References

**Decision**: Use `$ref` property with metric ID for built-in metric references

**Rationale**:
- `$ref` is a well-established convention from JSON Schema and OpenAPI specs
- Clear distinction from regular metric definitions
- Familiar to developers who have used schema-based configurations
- Allows coexistence with other properties for overrides

**Alternatives Considered**:
- `preset: "coverage"` - Less standard, could conflict with future properties
- `extends: "coverage"` - Implies inheritance which is more complex than needed
- `template: "coverage"` - Less commonly used in configuration contexts

**Example**:
```json
{
  "metrics": [
    {"$ref": "coverage"},
    {"$ref": "bundle-size", "name": "custom-bundle"}
  ]
}
```

### 2. Override Behavior and Merge Strategy

**Decision**: Shallow merge with user properties taking precedence

**Rationale**:
- Simple and predictable behavior
- User intent is clear: explicit properties override defaults
- No need for deep merging since metric configs are flat structures
- Validation occurs after merge, catching conflicts early

**Merge Algorithm**:
1. Load built-in metric definition by ID
2. Apply user-provided properties as overrides
3. Validate final merged config against MetricConfig schema
4. Return resolved metric

**Example**:
```typescript
// Built-in: {id: "coverage", type: "numeric", unit: "%", command: "..."}
// User: {$ref: "coverage", name: "my-coverage"}
// Result: {name: "my-coverage", type: "numeric", unit: "%", command: "..."}
```

### 3. Command Implementation Strategy

**Decision**: Store commands as strings in registry, not as separate modules per command

**Rationale**:
- Commands are simple shell strings, not complex logic
- Keeping them in registry makes it self-contained
- Easier to maintain and understand all metrics in one place
- Commands can be environment-specific (detected at runtime if needed)

**Implementation**:
```typescript
// src/metrics/registry.ts
export const BUILT_IN_METRICS: Record<string, MetricTemplate> = {
  coverage: {
    id: 'coverage',
    name: 'coverage',
    description: 'Overall test coverage percentage',
    type: 'numeric',
    unit: '%',
    command: 'bun test --coverage --coverage-reporter=json | jq -r ".total.lines.pct"'
  },
  // ... more metrics
};
```

### 4. Schema Validation Extension

**Decision**: Extend existing MetricConfig Zod schema to support optional `$ref` property

**Rationale**:
- Simpler than maintaining separate types for MetricConfig and MetricReference
- Single interface easier to understand and maintain
- Zod can handle conditional validation (required fields depend on presence of $ref)
- Type safety maintained with conditional types

**Schema Design**:
```typescript
const MetricConfigSchema = z.object({
  $ref: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(['numeric', 'label']).optional(),
  command: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  timeout: z.number().optional(),
}).refine((data) => {
  // If $ref is present, it's a gallery reference (overrides optional)
  if (data.$ref) return true;
  // If no $ref, require name, type, command (custom metric)
  return data.name && data.type && data.command;
}, {
  message: "Metric must either have $ref or provide name, type, and command"
});
```

### 5. Resolution Timing

**Decision**: Resolve gallery references during config loading, before validation

**Rationale**:
- Config loader already centralized in `src/config/loader.ts`
- Early resolution means rest of system works with resolved metrics
- No changes needed to collector, storage, or reporter
- Validation of resolved metrics uses existing logic

**Resolution Flow**:
1. Load unentropy.json
2. Parse JSON
3. For each metric in metrics array:
   - If has `$ref`, resolve from gallery and merge overrides
   - If no `$ref`, keep as-is
4. Validate all resolved metrics with existing schema
5. Return final config

### 6. Default Threshold Behavior

**Decision**: Store threshold defaults in gallery but don't automatically apply them

**Rationale**:
- Quality gate feature (004) is optional, not required
- Users who don't use quality gates shouldn't have thresholds
- Threshold defaults documented for users to copy if desired
- Keeps gallery feature independent of quality gate feature

**Implementation**:
- Built-in metrics include threshold recommendations in comments/docs
- Users explicitly configure quality gate thresholds if they want them
- Built-in metrics only provide command, unit, type - not threshold config

### 7. Error Messages for Invalid References

**Decision**: List available built-in metric IDs in error message

**Rationale**:
- Helps users discover valid options
- Reduces back-and-forth with documentation
- Common pattern in CLI tools and config validation

**Example Error**:
```
Invalid metric reference: "$ref: unknown-metric"
Available built-in metrics: coverage, function-coverage, loc, bundle-size, 
build-time, test-time, dependencies-count
```

## Command Research

### Coverage Commands

**Bun/Node.js Projects**:
```bash
# Overall coverage
bun test --coverage --coverage-reporter=json | jq -r '.total.lines.pct'

# Function coverage
bun test --coverage --coverage-reporter=json | jq -r '.total.functions.pct'
```

**Rationale**: Unentropy uses Bun, this is the standard approach. Output is JSON with coverage data.

### Lines of Code

**Standard Unix Approach**:
```bash
find src/ -name '*.ts' -o -name '*.tsx' | xargs wc -l | tail -1 | awk '{print $1}'
```

**Rationale**: Works in any Unix environment, no dependencies, filters to TS/TSX files.

### Bundle Size

**Standard Unix Approach**:
```bash
find dist/ -name '*.js' -type f | xargs wc -c | tail -1 | awk '{print int($1/1024)}'
```

**Rationale**: Measures compiled output, converts to KB, standard utilities only.

### Build/Test Time

**Using Unix `time` Command**:
```bash
# Build time (seconds)
(time bun run build) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g'

# Test time (seconds)
(time bun test) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g'
```

**Rationale**: Standard Unix timing, parses "real" time, converts to seconds.

### Dependency Count

**Using package.json**:
```bash
cat package.json | jq '.dependencies | length'
```

**Rationale**: Direct count from package.json, simple and accurate.

## Integration Points

### With Existing Config System

**Current Flow**:
1. `loader.ts` reads unentropy.json
2. `schema.ts` validates with Zod
3. Returns validated UnentropyConfig

**Updated Flow**:
1. `loader.ts` reads unentropy.json
2. **NEW**: `loader.ts` resolves $ref entries via `metrics/resolver.ts`
3. `schema.ts` validates resolved config with Zod
4. Returns validated UnentropyConfig

**Code Location**: Modify `src/config/loader.ts` function `loadConfig()`

### With Metric Collection

**No Changes Required**:
- Collector receives resolved MetricConfig objects
- Commands are executed same as before
- Gallery metrics indistinguishable from custom metrics after resolution

### Backward Compatibility

**Guarantee**: Existing configs without $ref work unchanged
- Schema validation allows both forms
- Resolution step skips non-$ref entries
- All existing tests pass without modification

## Open Questions

None. All design decisions finalized and documented above.

## Next Steps

Proceed to Phase 1: Data Model and Contracts
