import type {
  TimeSeriesData,
  NormalizedDataPoint,
  LineChartData,
  BarChartData,
  MetadataPoint,
} from "./types";

export function buildLineChartData(
  metricId: string,
  metricName: string,
  normalizedData: NormalizedDataPoint[]
): LineChartData {
  return {
    id: metricId,
    name: metricName,
    values: normalizedData.map((dp) => dp.value),
    metadata: normalizedData.map((dp): MetadataPoint | null =>
      dp.value !== null ? { sha: dp.commitSha.substring(0, 7), run: dp.runNumber } : null
    ),
  };
}

export function buildBarChartData(
  metricId: string,
  metricName: string,
  timeSeries: TimeSeriesData
): BarChartData {
  const labelCounts = new Map<string, number>();

  for (const dp of timeSeries.dataPoints) {
    if (dp.valueLabel) {
      labelCounts.set(dp.valueLabel, (labelCounts.get(dp.valueLabel) ?? 0) + 1);
    }
  }

  const labels = Array.from(labelCounts.keys()).sort();

  return {
    id: metricId,
    name: metricName,
    labels,
    counts: labels.map((label) => labelCounts.get(label) ?? 0),
  };
}
