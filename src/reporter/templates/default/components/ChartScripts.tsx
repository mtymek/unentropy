import type { MetricReportData } from "../../../types";

interface ChartScriptsProps {
  metrics: MetricReportData[];
}

export function ChartScripts({ metrics }: ChartScriptsProps) {
  const chartsData = metrics.map((m) => ({
    id: m.id,
    config: m.chartConfig,
  }));

  const scriptContent = `
    const chartsData = ${JSON.stringify(chartsData)};
    chartsData.forEach(chartData => {
      const ctx = document.getElementById('chart-' + chartData.id);
      if (ctx) {
        new Chart(ctx, chartData.config);
      }
    });
  `;

  return <script dangerouslySetInnerHTML={{ __html: scriptContent }} />;
}
