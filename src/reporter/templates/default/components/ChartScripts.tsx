import type { ChartsData } from "../../../types";
import serialize from "serialize-javascript";
import chartInitScript from "../scripts/charts.js" with { type: "text" };

interface ChartScriptsProps {
  chartsData: ChartsData;
}

export function ChartScripts({ chartsData }: ChartScriptsProps) {
  const dataScript = `
    var __chartData = {
      timeline: ${serialize(chartsData.timeline)},
      metadata: ${serialize(chartsData.metadata)},
      lineCharts: ${serialize(chartsData.lineCharts)},
      barCharts: ${serialize(chartsData.barCharts)}
    };
    initializeCharts(__chartData.timeline, __chartData.metadata, __chartData.lineCharts, __chartData.barCharts);
  `;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: chartInitScript }} />
      <script dangerouslySetInnerHTML={{ __html: dataScript }} />
    </>
  );
}
