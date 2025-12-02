import type { MetricsRepository } from "../storage/repository.js";
import type { MetricSample } from "./types.js";

export function buildMetricSamples(
  collectedMetrics: {
    definition: {
      name: string;
      type: "numeric" | "label";
      unit?: string;
      description?: string;
    };
    value_numeric?: number;
    value_label?: string;
  }[],
  repository: MetricsRepository,
  referenceBranch: string,
  maxBuilds: number,
  maxAgeDays: number
): MetricSample[] {
  const samples: MetricSample[] = [];

  for (const collected of collectedMetrics) {
    const def = collected.definition;

    if (def.type !== "numeric") {
      continue;
    }

    const baselineValues = repository
      .getBaselineMetricValues(def.name, referenceBranch, maxBuilds, maxAgeDays)
      .map((v) => v.value_numeric);

    samples.push({
      name: def.name,
      unit: def.unit,
      type: "numeric",
      baselineValues,
      pullRequestValue: collected.value_numeric,
    });
  }

  return samples;
}

export function calculateBuildsConsidered(samples: MetricSample[]): number {
  return Math.max(...samples.map((s) => s.baselineValues.length), 0);
}
