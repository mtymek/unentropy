import type { MetricTemplate, BuiltInMetricsRegistry } from "./types.js";

export const BUILT_IN_METRICS: BuiltInMetricsRegistry = {};

export function getBuiltInMetric(id: string): MetricTemplate | undefined {
  return BUILT_IN_METRICS[id];
}

export function listBuiltInMetricIds(): string[] {
  return Object.keys(BUILT_IN_METRICS);
}
