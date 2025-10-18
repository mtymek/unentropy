import type { SummaryStats } from "./generator";
import type { ChartConfig } from "./charts";

export interface ReportMetadata {
  repository: string;
  generatedAt: string;
  buildCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface MetricReportData {
  id: string;
  name: string;
  description: string | null;
  stats: SummaryStats;
  chartConfig: ChartConfig;
  sparse: boolean;
  dataPointCount: number;
}

export interface ReportData {
  metadata: ReportMetadata;
  metrics: MetricReportData[];
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTrendArrow(direction: "up" | "down" | "stable" | null): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  if (direction === "stable") return "→";
  return "—";
}

function getTrendColor(direction: "up" | "down" | "stable" | null): string {
  if (direction === "up") return "text-green-600 dark:text-green-400";
  if (direction === "down") return "text-red-600 dark:text-red-400";
  return "text-gray-600 dark:text-gray-400";
}

function formatValue(value: number | null, unit: string | null): string {
  if (value === null) return "N/A";
  const formatted = value.toFixed(2);
  return unit ? `${formatted}${unit}` : formatted;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderMetricCard(metric: MetricReportData): string {
  const safeName = escapeHtml(metric.name);
  const safeDescription = metric.description ? escapeHtml(metric.description) : "";
  const { stats } = metric;

  const trendArrow = formatTrendArrow(stats.trendDirection);
  const trendColor = getTrendColor(stats.trendDirection);
  const trendPercent =
    stats.trendPercent !== null ? Math.abs(stats.trendPercent).toFixed(1) : "0.0";

  const chartType = metric.chartConfig.type === "line" ? "Line" : "Bar";
  const ariaLabel = `${chartType} chart showing ${safeName} over time`;

  const sparseWarning = metric.sparse
    ? `
    <div class="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-yellow-700 dark:text-yellow-200">
            Limited data available (${metric.dataPointCount} builds). More data will improve trend accuracy.
          </p>
        </div>
      </div>
    </div>
  `
    : "";

  return `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 metric-card">
      <div class="mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          ${safeName}
        </h2>
        ${safeDescription ? `<p class="text-sm text-gray-600 dark:text-gray-400">${safeDescription}</p>` : ""}
      </div>
      
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            ${formatValue(stats.latest, null)}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Latest</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            ${formatValue(stats.min, null)}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Min</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            ${formatValue(stats.max, null)}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Max</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold ${trendColor}">
            ${trendArrow} ${trendPercent}%
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Trend</div>
        </div>
      </div>
      
      <div class="relative h-64 sm:h-80">
        <canvas id="chart-${escapeHtml(metric.id)}" aria-label="${escapeHtml(ariaLabel)}"></canvas>
      </div>
      ${sparseWarning}
    </div>
  `;
}

function renderEmptyState(): string {
  return `
    <div class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No metrics data</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        No metrics have been collected yet. Run your CI pipeline to start collecting data.
      </p>
    </div>
  `;
}

export function generateHtmlReport(data: ReportData): string {
  const safeRepository = escapeHtml(data.metadata.repository);
  const generatedDate = formatDate(data.metadata.generatedAt);
  const startDate = formatDate(data.metadata.dateRange.start);
  const endDate = formatDate(data.metadata.dateRange.end);
  const buildCount = data.metadata.buildCount;

  const metricsHtml =
    data.metrics.length > 0
      ? data.metrics.map((metric) => renderMetricCard(metric)).join("\n")
      : renderEmptyState();

  const chartsJson = JSON.stringify(
    data.metrics.map((m) => ({
      id: m.id,
      config: m.chartConfig,
    }))
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unentropy Metrics Report - ${safeRepository}</title>
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
  
  <style>
    @media print {
      body {
        background: white !important;
      }
      
      .no-print {
        display: none !important;
      }
      
      .metric-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      canvas {
        max-height: 300px;
      }
    }
  </style>
</head>
<body class="bg-gray-50 dark:bg-gray-900">
  <header class="bg-white dark:bg-gray-800 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Unentropy Metrics Report
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            ${safeRepository}
          </p>
        </div>
        <div class="mt-4 sm:mt-0 text-sm text-gray-600 dark:text-gray-400">
          <div>Generated: ${generatedDate}</div>
          <div>Data Range: ${startDate} - ${endDate}</div>
          <div>Total Builds: ${buildCount}</div>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      ${metricsHtml}
    </div>
  </main>

  <footer class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-8 border-t border-gray-200 dark:border-gray-700">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 dark:text-gray-400">
      <div>
        Generated by <span class="font-semibold">Unentropy</span> v0.1.0
      </div>
      <div class="mt-2 sm:mt-0">
        <a href="https://github.com/unentropy/unentropy" class="hover:text-gray-900 dark:hover:text-white">
          View Documentation
        </a>
      </div>
    </div>
  </footer>

  <script>
    const chartsData = ${chartsJson};
    
    chartsData.forEach(chartData => {
      const ctx = document.getElementById('chart-' + chartData.id);
      if (ctx) {
        new Chart(ctx, chartData.config);
      }
    });
  </script>
</body>
</html>`;
}
