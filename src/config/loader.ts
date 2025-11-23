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
  let parsedJson;
  try {
    parsedJson = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Check if metrics array exists
  if (!parsedJson.metrics || !Array.isArray(parsedJson.metrics)) {
    throw new Error("Configuration must contain a 'metrics' array");
  }

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
