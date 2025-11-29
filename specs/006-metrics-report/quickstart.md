# Quickstart: Metrics Report Enhancements

**Feature**: 006-metrics-report  
**Date**: 2025-11-29

## Overview

This guide provides quick implementation steps for enhancing the Metrics Report with normalized build history, missing data handling, and the preview data toggle.

---

## Prerequisites

- Existing Unentropy installation with report generation working
- Understanding of `src/reporter/` module structure
- Familiarity with Preact components and Chart.js

---

## Implementation Steps

### Step 1: Add Synthetic Data Generator

Create `src/reporter/synthetic.ts`:

```typescript
// Seeded PRNG for deterministic generation
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

// Generate synthetic data for preview mode
export function generateSyntheticData(
  metricName: string,
  existingStats: SummaryStats,
  unit: string | null
): number[] {
  const seed = hashString(metricName);
  const rng = createSeededRng(seed);
  
  const mean = existingStats.average ?? 50;
  const values: number[] = [];
  let current = mean * (0.8 + rng() * 0.4);
  
  for (let i = 0; i < 20; i++) {
    const noise = (rng() - 0.5) * mean * 0.1;
    const reversion = 0.2 * (mean - current);
    current = current + reversion + noise;
    
    // Apply constraints
    if (unit === '%') current = Math.max(0, Math.min(100, current));
    else if (unit === 'KB' || unit === 'MB') current = Math.max(0, current);
    
    values.push(Math.round(current * 100) / 100);
  }
  
  return values;
}
```

### Step 2: Update Types

Add to `src/reporter/types.ts`:

```typescript
export interface ReportData {
  metadata: ReportMetadata;
  metrics: MetricReportData[];
  showToggle: boolean;          // NEW
  previewData: PreviewDataSet[]; // NEW
}

export interface PreviewDataSet {
  metricId: string;
  values: number[];
  stats: SummaryStats;
}
```

### Step 3: Create Toggle Component

Create `src/reporter/templates/default/components/PreviewToggle.tsx`:

```tsx
interface PreviewToggleProps {
  visible: boolean;
}

export function PreviewToggle({ visible }: PreviewToggleProps) {
  if (!visible) return null;
  
  return (
    <div class="mt-4 sm:mt-0">
      <label class="inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          id="preview-toggle"
          class="sr-only peer"
          role="switch"
        />
        <div class="
          relative w-11 h-6 bg-gray-200 dark:bg-gray-700
          rounded-full peer peer-checked:bg-blue-600
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
    </div>
  );
}
```

### Step 4: Update Header Component

Modify `src/reporter/templates/default/components/Header.tsx`:

```tsx
import { PreviewToggle } from "./PreviewToggle";

interface HeaderProps {
  metadata: ReportMetadata;
  showToggle: boolean;  // NEW
}

export function Header({ metadata, showToggle }: HeaderProps) {
  // ... existing code ...
  
  return (
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* ... existing title/repo ... */}
          </div>
          <div class="mt-4 sm:mt-0 text-sm text-gray-600 dark:text-gray-400">
            {/* ... existing metadata ... */}
            <PreviewToggle visible={showToggle} />
          </div>
        </div>
      </div>
    </header>
  );
}
```

### Step 5: Update ChartScripts for Toggle

Modify `src/reporter/templates/default/components/ChartScripts.tsx`:

```tsx
export function ChartScripts({ metrics, previewData, showToggle }: ChartScriptsProps) {
  const chartsData = metrics.map((m, i) => ({
    id: m.id,
    config: m.chartConfig,
    realData: m.chartConfig.data.datasets[0].data,
    previewData: showToggle ? previewData[i]?.values : null,
    realStats: m.stats,
    previewStats: showToggle ? previewData[i]?.stats : null,
  }));

  const scriptContent = `
    const chartsData = ${serialize(chartsData)};
    const chartInstances = {};
    
    // Initialize charts
    chartsData.forEach(chartData => {
      const ctx = document.getElementById('chart-' + chartData.id);
      if (ctx) {
        chartInstances[chartData.id] = new Chart(ctx, chartData.config);
      }
    });
    
    // Toggle handler
    const toggle = document.getElementById('preview-toggle');
    toggle?.addEventListener('change', function(e) {
      const showPreview = e.target.checked;
      
      chartsData.forEach(chartData => {
        const chart = chartInstances[chartData.id];
        if (chart && chartData.previewData) {
          chart.data.datasets[0].data = showPreview 
            ? chartData.previewData 
            : chartData.realData;
          chart.update('none');
        }
        
        // Update stats display
        const statsEl = document.getElementById('stats-' + chartData.id);
        if (statsEl) {
          const stats = showPreview ? chartData.previewStats : chartData.realStats;
          // Update stats DOM elements
        }
      });
    });
  `;

  return <script dangerouslySetInnerHTML={{ __html: scriptContent }} />;
}
```

### Step 6: Normalize Build Data in Generator

Update `src/reporter/generator.ts`:

```typescript
export function generateReport(db: Storage, options: GenerateReportOptions = {}): string {
  const allBuilds = db.getRepository().getAllBuildContexts();
  const buildCount = allBuilds.length;
  const showToggle = options.enablePreviewToggle ?? (buildCount < (options.previewThreshold ?? 10));
  
  // ... existing metric processing ...
  
  // Normalize metric data to full build range
  for (const metric of metrics) {
    metric.chartConfig.data.labels = allBuilds.map(b => b.timestamp);
    // Fill gaps with null
    metric.chartConfig.data.datasets[0].data = normalizeToBuilds(
      allBuilds,
      originalDataPoints
    );
  }
  
  // Generate preview data if needed
  const previewData = showToggle 
    ? metrics.map(m => generatePreviewDataSet(m))
    : [];
  
  const reportData: ReportData = {
    metadata,
    metrics,
    showToggle,
    previewData,
  };
  
  // ... render JSX ...
}
```

---

## Testing

### Visual Review

```bash
# Generate fixtures and open in browser
bun run visual-review
```

### Test Cases to Verify

1. **Toggle Visibility**
   - Open `sparse-data` fixture → toggle should appear
   - Open `full-featured` fixture → toggle should NOT appear

2. **Toggle Functionality**
   - Click toggle → charts should switch to preview data
   - Statistics should update to reflect preview values

3. **Gap Handling**
   - Create a metric with missing builds
   - Verify gap appears in chart (not connected line)

4. **Accessibility**
   - Tab to toggle → should have visible focus ring
   - Space/Enter → should toggle state
   - Screen reader should announce "Show preview data, switch"

---

## Checklist

- [ ] `src/reporter/synthetic.ts` created
- [ ] `src/reporter/types.ts` updated with new interfaces
- [ ] `PreviewToggle.tsx` component created
- [ ] `Header.tsx` updated to include toggle
- [ ] `ChartScripts.tsx` updated with toggle logic
- [ ] `generator.ts` updated for normalization and preview data
- [ ] Visual fixtures updated/verified
- [ ] Unit tests added for synthetic generation
- [ ] Integration tests added for toggle functionality
