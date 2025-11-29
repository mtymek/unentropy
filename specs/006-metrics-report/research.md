# Research: Metrics Report

**Feature**: 006-metrics-report  
**Date**: 2025-11-29

## Overview

This document consolidates research findings for implementing the Metrics Report enhancements: normalized build history across charts, missing data handling, and the preview data toggle.

---

## 1. Chart.js Gap Handling for Missing Data Points

### Decision
Use `null` values in the data array combined with `spanGaps: false` to display visual gaps where metrics are missing for specific builds.

### Rationale
- Chart.js natively treats `null`, `NaN`, or `undefined` as "skipped" points, creating natural gaps
- Setting `spanGaps: false` (default) ensures gaps are visible rather than connected
- The `segment` option allows styling gap regions differently (e.g., dashed lines) if desired
- Tooltips naturally skip `null` points - no special handling needed for basic behavior

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Interpolate missing values | Continuous line, no gaps | Misleading - implies data exists | Rejected |
| Use `spanGaps: true` with dashed segments | Shows continuity with visual cue | More complex, may confuse users | Rejected for MVP |
| Use `null` with `spanGaps: false` | Clear gap, accurate representation | Some users may find gaps jarring | **Selected** |

### Implementation Details

```typescript
// Data structure with gaps for missing builds
const dataWithGaps = allBuilds.map(build => {
  const metricValue = getMetricValueForBuild(metricName, build.id);
  return metricValue !== undefined ? metricValue : null;
});

// Chart.js configuration
const chartConfig = {
  type: 'line',
  data: {
    labels: allBuilds.map(b => b.timestamp),
    datasets: [{
      data: dataWithGaps,
      spanGaps: false, // Ensures gaps are visible
    }]
  }
};
```

### Tooltip Handling for Gaps
The `interaction.intersect: false` setting combined with `mode: 'index'` allows tooltips to appear at X positions even when no data point exists. Custom tooltip callback can show "No data recorded" message.

---

## 2. Normalized X-Axis Across All Metrics

### Decision
All charts share the same `labels` array derived from the complete list of build contexts, ensuring visual alignment across metric cards.

### Rationale
- Users need to compare metrics at the same build/time points
- Missing data is explicitly shown as gaps rather than condensed timelines
- Consistent X-axis allows for easier visual scanning across cards

### Implementation Approach
1. Query all build contexts from the database (already available via `getAllBuildContexts()`)
2. Pass the complete build list to report generation
3. For each metric, map values to the full build list, using `null` for missing entries

```typescript
interface NormalizedMetricData {
  labels: string[];           // All build timestamps
  values: (number | null)[];  // Values or null for gaps
}

function normalizeMetricData(
  allBuilds: BuildContext[],
  metricTimeSeries: TimeSeriesData
): NormalizedMetricData {
  const buildMap = new Map(
    metricTimeSeries.dataPoints.map(dp => [dp.timestamp, dp.valueNumeric])
  );
  
  return {
    labels: allBuilds.map(b => b.timestamp),
    values: allBuilds.map(b => buildMap.get(b.timestamp) ?? null),
  };
}
```

---

## 3. Tailwind CSS Toggle Component

### Decision
Implement toggle using native checkbox with Tailwind CSS styling and `peer` utilities. No additional JavaScript framework required.

### Rationale
- Native checkbox provides built-in accessibility (keyboard, screen reader)
- Tailwind's `peer` modifier enables CSS-only state styling
- `sr-only` class hides checkbox visually while keeping it accessible
- Works in static HTML without React/Vue runtime

### Implementation Pattern

```html
<label class="inline-flex items-center cursor-pointer">
  <input 
    type="checkbox" 
    id="preview-toggle"
    class="sr-only peer"
    role="switch"
  />
  <div class="
    relative w-11 h-6
    bg-gray-200 dark:bg-gray-700
    rounded-full peer
    peer-checked:bg-blue-600
    peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800
    after:content-[''] after:absolute after:top-[2px] after:start-[2px]
    after:bg-white after:border after:rounded-full
    after:h-5 after:w-5 after:transition-all
    peer-checked:after:translate-x-full
  "></div>
  <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
    Show preview data
  </span>
</label>
```

### Accessibility Features
- `role="switch"` for screen readers
- Keyboard accessible via native checkbox (Space/Enter)
- `peer-focus:ring-4` provides visible focus indicator
- Dark mode support via `dark:` prefixed classes
- Label wrapping makes entire element clickable

---

## 4. Synthetic Data Generation

### Decision
Use seeded Mulberry32 PRNG with mean-reverting (Ornstein-Uhlenbeck) algorithm for generating realistic preview data.

### Rationale
- Deterministic: same metric name + timestamp seed produces same output
- Mean-reverting creates natural fluctuation around a central value
- Gaussian noise (Box-Muller) provides bell-curve distributed variations
- Existing data statistics inform value ranges and volatility

### Alternatives Considered
| Algorithm | Use Case | Decision |
|-----------|----------|----------|
| Pure random walk | Unrealistic unbounded drift | Rejected |
| Geometric Brownian Motion | Percentage metrics | Could use for coverage % |
| Mean-reverting (O-U) | Most metrics | **Selected** - most realistic |
| Linear interpolation | Filling gaps | Rejected - too artificial |

### Key Implementation Components

**1. Seeded PRNG (Mulberry32)**
```typescript
function createSeededRng(seed: number): () => number {
  let state = seed;
  return function(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**2. Deterministic Seed from Metric**
```typescript
function createMetricSeed(metricName: string, baseTimestamp: number): number {
  let hash = 5381;
  for (let i = 0; i < metricName.length; i++) {
    hash = ((hash << 5) + hash) + metricName.charCodeAt(i);
  }
  return Math.abs((hash ^ baseTimestamp) | 0);
}
```

**3. Mean-Reverting Generation**
```typescript
function generateMeanReverting(
  startValue: number,
  meanValue: number,
  revertSpeed: number,  // 0.1-0.3 typical
  volatility: number,
  steps: number,
  rng: () => number
): number[] {
  const values = [startValue];
  for (let i = 1; i < steps; i++) {
    const prev = values[i - 1];
    const noise = gaussianRandom(rng);
    const change = revertSpeed * (meanValue - prev) + volatility * noise;
    values.push(prev + change);
  }
  return values;
}
```

### Parameters by Metric Type
| Type | Typical Value | Constraints | Volatility |
|------|---------------|-------------|------------|
| Coverage | 75% | 0-100 | 2-5% of mean |
| Size (KB) | 500 | 0-∞ | 5-10% of mean |
| Count | 100 | 0-∞, integer | 5-15% of mean |
| Duration (ms) | 30000 | 0-∞ | 10-20% of mean |

---

## 5. Client-Side State Management

### Decision
Use vanilla JavaScript with DOM event listeners for toggle state. Chart.js instance `update()` method for re-rendering.

### Rationale
- Report is static HTML with no framework runtime
- Chart.js instances are already tracked in the rendered script
- Toggle state doesn't need to persist (resets on page reload per spec)

### Implementation Pattern

```javascript
// In rendered <script> tag
const toggle = document.getElementById('preview-toggle');
const chartInstances = {}; // Store Chart.js instances by ID

// Initialize charts
chartsData.forEach(({ id, config }) => {
  const ctx = document.getElementById('chart-' + id);
  if (ctx) {
    chartInstances[id] = new Chart(ctx, config);
  }
});

// Toggle handler
toggle?.addEventListener('change', function(e) {
  const showPreview = e.target.checked;
  
  chartsData.forEach(({ id, realData, previewData }) => {
    const chart = chartInstances[id];
    if (chart) {
      chart.data.datasets[0].data = showPreview ? previewData : realData;
      chart.update('none'); // No animation for instant switch
    }
  });
  
  // Update statistics displays
  updateStatistics(showPreview);
});
```

---

## Summary of Technical Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Gap display | `null` values + `spanGaps: false` | Clear, accurate representation |
| X-axis normalization | Shared labels array from all builds | Visual consistency across charts |
| Toggle component | Native checkbox + Tailwind `peer` | Accessible, no JS framework needed |
| Synthetic data | Mulberry32 + mean-reverting algorithm | Deterministic, realistic patterns |
| State management | Vanilla JS + Chart.js `update()` | Minimal footprint, static HTML compatible |
