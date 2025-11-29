# Data Model: Metrics Report

**Feature**: 006-metrics-report  
**Date**: 2025-11-29

## Overview

This document defines the data structures for the enhanced Metrics Report, including normalized build data, synthetic preview data, and toggle state management.

---

## Entities

### 1. NormalizedBuildData

Represents the complete build history shared across all metric charts.

| Field | Type | Description |
|-------|------|-------------|
| builds | BuildContext[] | All builds in chronological order |
| timestamps | string[] | ISO timestamps for X-axis labels |
| count | number | Total number of builds |

**Source**: Derived from `getAllBuildContexts()` in existing repository

**Used by**: All chart configurations to ensure consistent X-axis

---

### 2. NormalizedMetricData

Represents a single metric's data aligned to the complete build history.

| Field | Type | Description |
|-------|------|-------------|
| metricId | string | Sanitized metric identifier |
| metricName | string | Display name |
| metricType | 'numeric' \| 'label' | Determines chart type |
| description | string \| null | Optional description |
| values | (number \| null)[] | Values aligned to build history, null for gaps |
| stats | SummaryStats | Calculated statistics (existing type) |
| sparse | boolean | True if < 5 data points |
| dataPointCount | number | Actual number of non-null values |

**Relationships**:
- `values.length` === `NormalizedBuildData.count`
- Each index in `values` corresponds to same index in `NormalizedBuildData.timestamps`

---

### 3. SyntheticDataSet

Generated preview data for a metric when toggle is active.

| Field | Type | Description |
|-------|------|-------------|
| metricId | string | Links to NormalizedMetricData |
| values | number[] | 20 synthetic data points |
| stats | SummaryStats | Statistics for synthetic data |
| seed | number | Deterministic seed used for generation |

**Generation Rules**:
- Always generates exactly 20 data points
- Uses mean-reverting algorithm with Gaussian noise
- Seed derived from `hash(metricName) XOR timestamp`
- Constrained to metric-appropriate ranges (e.g., 0-100 for percentages)

---

### 4. ReportRenderData

Extended report data structure including preview data and toggle visibility.

| Field | Type | Description |
|-------|------|-------------|
| metadata | ReportMetadata | Existing: repository, timestamps, build count |
| metrics | NormalizedMetricData[] | Metrics aligned to build history |
| showToggle | boolean | True if buildCount < 10 |
| previewData | SyntheticDataSet[] | One per metric (only if showToggle) |

**State Transitions**:
- `showToggle` is determined at generation time, not runtime
- Toggle state is runtime-only (client-side JavaScript)

---

### 5. ChartRenderContext

Data passed to Chart.js for rendering, supporting toggle switching.

| Field | Type | Description |
|-------|------|-------------|
| id | string | DOM element ID |
| config | ChartConfig | Chart.js configuration object |
| realData | number[] | Actual metric values |
| previewData | number[] \| null | Synthetic values (if showToggle) |

**Usage**: Embedded in `<script>` tag for client-side chart management

---

## Entity Relationships

```
NormalizedBuildData
       │
       │ defines X-axis for all
       ▼
┌──────────────────┐
│ NormalizedMetric │──── values aligned to builds
│     Data[]       │
└────────┬─────────┘
         │
         │ 1:1 relationship
         ▼
┌──────────────────┐
│ SyntheticDataSet │──── generated if showToggle
│       []         │
└──────────────────┘
         │
         │ combined into
         ▼
┌──────────────────┐
│  ChartRender     │──── passed to client JS
│    Context[]     │
└──────────────────┘
```

---

## Validation Rules

### NormalizedMetricData
- `values.length` MUST equal `NormalizedBuildData.count`
- `dataPointCount` MUST equal count of non-null values
- `sparse` MUST be true if `dataPointCount < 5`

### SyntheticDataSet
- `values.length` MUST equal 20
- All values MUST be finite numbers (no NaN/Infinity)
- Values MUST respect metric type constraints:
  - Numeric with unit '%': 0-100
  - Numeric without unit: no lower bound enforced
  - Label metrics: N/A (no synthetic data)

### ReportRenderData
- `showToggle` MUST be true if `metadata.buildCount < 10`
- `previewData.length` MUST equal `metrics.length` when showToggle is true
- `previewData` MUST be empty array when showToggle is false

---

## State Management

### Server-Side (Generation Time)
- All entity data is computed during report generation
- Embedded as JSON in the HTML `<script>` tag
- Immutable after generation

### Client-Side (Runtime)
- Toggle state stored in DOM checkbox `checked` property
- Chart instances stored in JavaScript object by ID
- State resets on page reload (no persistence)

```
┌─────────────────────────────────────────────────────┐
│                  HTML Report                         │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ <script>                                     │    │
│  │   const reportData = { /* embedded JSON */ } │    │
│  │   const chartInstances = {};                 │    │
│  │   let showingPreview = false;                │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ Toggle Event Handler                         │    │
│  │   → Updates showingPreview                   │    │
│  │   → Calls chart.update() for each chart      │    │
│  │   → Updates stats display elements           │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Migration Notes

This feature extends existing types without breaking changes:

| Existing Type | Change |
|---------------|--------|
| `ReportData` | Extended with `showToggle`, `previewData` |
| `MetricReportData` | Values normalized to full build count |
| `ChartConfig` | No schema change, data array may contain nulls |
| `TimeSeriesData` | No change (input type) |

Backward compatibility maintained - existing report generation continues to work.
