import type { MetricReportData } from "../../../types";
import serialize from "serialize-javascript";

interface ChartScriptsProps {
  metrics: MetricReportData[];
}

export function ChartScripts({ metrics }: ChartScriptsProps) {
  const chartsData = metrics.map((m) => ({
    id: m.id,
    config: m.chartConfig,
  }));

  const scriptContent = `
    const chartsData = ${serialize(chartsData)};

    // Custom tooltip callback for handling null data points
    function createCustomTooltipCallbacks(metricName, labels) {
      return {
        title: function(tooltipItems) {
          if (tooltipItems.length === 0) return '';
          const item = tooltipItems[0];
          const rawLabel = labels[item.dataIndex];
          const date = new Date(rawLabel);
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          });
        },
        label: function(context) {
          const value = context.raw;
          if (value === null || value === undefined) {
            return 'No data recorded for this build';
          }
          const metadata = context.dataset.metadata?.[context.dataIndex];
          let label = metricName + ': ' + value;
          if (metadata) {
            const parts = [];
            if (metadata.runNumber) {
              parts.push('Build #' + metadata.runNumber);
            }
            if (metadata.commitSha) {
              parts.push(metadata.commitSha.substring(0, 7));
            }
            if (parts.length > 0) {
              label += ' (' + parts.join(', ') + ')';
            }
          }
          return label;
        }
      };
    }

    chartsData.forEach(chartData => {
      const ctx = document.getElementById('chart-' + chartData.id);
      if (ctx) {
        // Apply custom tooltip callback if configured
        if (chartData.config.options?.plugins?.tooltip?.useCustomCallback) {
          const metricName = chartData.config.data.datasets[0]?.label || 'Value';
          const labels = chartData.config.data.labels || [];
          chartData.config.options.plugins.tooltip.callbacks = createCustomTooltipCallbacks(metricName, labels);
          delete chartData.config.options.plugins.tooltip.useCustomCallback;
        }
        new Chart(ctx, chartData.config);
      }
    });
  `;

  return <script dangerouslySetInnerHTML={{ __html: scriptContent }} />;
}
