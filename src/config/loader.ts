import { readFile } from "fs/promises";
import { validateConfig } from "./schema";
import { resolveMetricReference } from "../metrics/resolver.js";
import type { ResolvedMetricConfig, StorageConfig, MetricConfig } from "./schema";

export interface ResolvedUnentropyConfig {
  metrics: ResolvedMetricConfig[];
  storage: StorageConfig;
}

export async function loadConfig(configPath = "unentropy.json"): Promise<ResolvedUnentropyConfig> {
  const fileContent = await readFile(configPath, "utf-8");
  const parsedJson = JSON.parse(fileContent);

  // Resolve built-in metric references before validation
  const resolvedMetrics = (parsedJson.metrics as MetricConfig[]).map((metric) => {
    if (metric.$ref) {
      return resolveMetricReference(metric);
    }
    return metric;
  });

  const configWithResolvedMetrics = {
    ...parsedJson,
    metrics: resolvedMetrics,
  };

  const validated = validateConfig(configWithResolvedMetrics);

  return validated as ResolvedUnentropyConfig;
}
