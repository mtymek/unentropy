# Contract: Report Configuration Schema

**Feature**: 006-metrics-report  
**Date**: 2025-11-29

## Overview

This contract defines configuration options for the Metrics Report generation, specifically for the preview data toggle and chart display settings.

---

## Report Generation Options

### Extended GenerateReportOptions

```typescript
interface GenerateReportOptions {
  // Existing options
  repository?: string;
  metricNames?: string[];
  config?: ResolvedUnentropyConfig;
  
  // New options for 006
  enablePreviewToggle?: boolean;  // Override auto-detection, default: auto
  previewThreshold?: number;      // Build count threshold, default: 10
}
```

### Option Details

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enablePreviewToggle` | boolean \| undefined | auto | Force enable/disable toggle. Auto = show if builds < threshold |
| `previewThreshold` | number | 10 | Build count below which toggle appears |

---

## Preview Data Generation Configuration

### SyntheticGenerationConfig

```typescript
interface SyntheticGenerationConfig {
  targetPoints: number;      // Number of synthetic points to generate
  revertSpeed: number;       // Mean-reversion strength (0-1)
  volatilityFactor: number;  // Multiplier for noise amplitude
}
```

### Default Values

| Metric Type | targetPoints | revertSpeed | volatilityFactor |
|-------------|--------------|-------------|------------------|
| All types | 20 | 0.2 | 0.05 |

### Metric Type Constraints

| Type Pattern | Min Value | Max Value |
|--------------|-----------|-----------|
| unit = '%' | 0 | 100 |
| unit = 'KB' or 'MB' | 0 | Infinity |
| type = 'label' | N/A | N/A |
| default numeric | -Infinity | Infinity |

---

## Chart Display Configuration

### ChartDisplayConfig

```typescript
interface ChartDisplayConfig {
  // Gap handling
  spanGaps: boolean;           // Connect across missing data, default: false
  showGapIndicator: boolean;   // Visual marker at gap positions, default: true
  
  // Axis normalization
  normalizeXAxis: boolean;     // Use full build range for all charts, default: true
  
  // Animation
  toggleAnimationDuration: number;  // ms for toggle transition, default: 0
}
```

### Default Configuration

```typescript
const DEFAULT_CHART_CONFIG: ChartDisplayConfig = {
  spanGaps: false,
  showGapIndicator: true,
  normalizeXAxis: true,
  toggleAnimationDuration: 0,  // Instant switch per spec
};
```

---

## Toggle Component Configuration

### ToggleDisplayConfig

```typescript
interface ToggleDisplayConfig {
  label: string;           // Toggle label text
  position: 'header';      // Where toggle appears (only header supported)
  defaultState: boolean;   // Initial checked state
}
```

### Default Values

```typescript
const DEFAULT_TOGGLE_CONFIG: ToggleDisplayConfig = {
  label: 'Show preview data',
  position: 'header',
  defaultState: false,  // Start showing real data
};
```

---

## Embedded Report Data Schema

### ReportDataJSON

Structure of JSON embedded in the generated HTML `<script>` tag:

```typescript
interface ReportDataJSON {
  metadata: {
    repository: string;
    generatedAt: string;        // ISO 8601
    buildCount: number;
    dateRange: {
      start: string;            // ISO 8601
      end: string;              // ISO 8601
    };
  };
  
  showToggle: boolean;
  
  charts: Array<{
    id: string;
    config: ChartJsConfig;       // Full Chart.js configuration
    realData: (number | null)[];
    previewData: number[] | null;
    realStats: SummaryStats;
    previewStats: SummaryStats | null;
  }>;
}
```

---

## Validation Rules

### Generation-Time Validation

1. **previewThreshold** MUST be a positive integer
2. **enablePreviewToggle** when `true` MUST generate synthetic data regardless of build count
3. **enablePreviewToggle** when `false` MUST omit toggle and synthetic data from output

### Runtime Validation (Client-Side)

1. Toggle checkbox MUST exist when `showToggle === true`
2. All chart IDs in `charts[]` MUST have corresponding canvas elements
3. `previewData` MUST be non-null for all charts when `showToggle === true`

---

## Example Usage

### Basic Report Generation

```typescript
// Auto-detect toggle visibility (default behavior)
const html = generateReport(db, {
  repository: 'owner/repo',
});
```

### Force Toggle Visible (for testing)

```typescript
const html = generateReport(db, {
  repository: 'owner/repo',
  enablePreviewToggle: true,
});
```

### Custom Threshold

```typescript
const html = generateReport(db, {
  repository: 'owner/repo',
  previewThreshold: 5,  // Show toggle if < 5 builds
});
```

---

## Backward Compatibility

All new options are optional with sensible defaults. Existing code calling `generateReport()` without these options will:

1. Auto-detect toggle visibility based on `buildCount < 10`
2. Use default chart configuration
3. Generate synthetic data only when toggle is shown
