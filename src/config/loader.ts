import { readFile } from "fs/promises";
import { validateConfig } from "./schema";
import type { ResolvedMetricConfig, StorageConfig } from "./schema";

export interface ResolvedUnentropyConfig {
  metrics: ResolvedMetricConfig[];
  storage: StorageConfig;
}

export async function loadConfig(configPath = "unentropy.json"): Promise<ResolvedUnentropyConfig> {
  const fileContent = await readFile(configPath, "utf-8");
  const parsedJson = JSON.parse(fileContent);

  const validated = validateConfig(parsedJson);

  return validated as ResolvedUnentropyConfig;
}
