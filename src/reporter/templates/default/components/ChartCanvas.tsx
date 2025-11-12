interface ChartCanvasProps {
  id: string;
  name: string;
  chartType: "line" | "bar";
}

export function ChartCanvas({ id, name, chartType }: ChartCanvasProps) {
  const chartTypeLabel = chartType === "line" ? "Line" : "Bar";
  const ariaLabel = `${chartTypeLabel} chart showing ${name} over time`;

  return (
    <div class="relative h-64 sm:h-80">
      <canvas id={`chart-${id}`} aria-label={ariaLabel}></canvas>
    </div>
  );
}
