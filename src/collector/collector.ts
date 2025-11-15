import { runCommand } from "./runner";
import type { MetricConfig } from "../config/schema";
import { Storage } from "../storage/storage";

export interface ParseResult {
  success: boolean;
  numericValue?: number;
  labelValue?: string;
  error?: string;
}

export interface FailureDetail {
  metricName: string;
  reason: string;
}

export interface CollectionResult {
  total: number;
  successful: number;
  failed: number;
  failures: FailureDetail[];
}

export function parseMetricValue(output: string, type: "numeric" | "label"): ParseResult {
  const trimmedOutput = output.trim();
  const firstLine = trimmedOutput.split("\n")[0]?.trim() ?? "";

  if (firstLine === "") {
    return {
      success: false,
      error: "Output is empty",
    };
  }

  if (type === "numeric") {
    const numericValue = parseFloat(firstLine);
    if (isNaN(numericValue)) {
      return {
        success: false,
        error: `Failed to parse numeric value from output: ${firstLine}`,
      };
    }
    return {
      success: true,
      numericValue,
    };
  } else {
    return {
      success: true,
      labelValue: firstLine,
    };
  }
}

export async function collectMetrics(
  metrics: MetricConfig[],
  buildId: number,
  dbPath: string
): Promise<CollectionResult> {
  const result: CollectionResult = {
    total: metrics.length,
    successful: 0,
    failed: 0,
    failures: [],
  };

  if (metrics.length === 0) {
    return result;
  }

  const db = new Storage({
    provider: {
      type: "sqlite-local",
      path: dbPath,
    },
  });
  await db.ready();

  for (const metric of metrics) {
    try {
      const commandResult = await runCommand(metric.command, {}, metric.timeout ?? 60000);

      if (!commandResult.success) {
        const reason = commandResult.timedOut
          ? `Command timed out after ${metric.timeout ?? 60000}ms`
          : `Command failed with exit code ${commandResult.exitCode}`;

        result.failed++;
        result.failures.push({
          metricName: metric.name,
          reason,
        });
        continue;
      }

      const parseResult = parseMetricValue(commandResult.stdout, metric.type);

      if (!parseResult.success) {
        result.failed++;
        result.failures.push({
          metricName: metric.name,
          reason: `Failed to parse output: ${parseResult.error}`,
        });
        continue;
      }

      const metricDef = db.upsertMetricDefinition({
        name: metric.name,
        type: metric.type,
        unit: metric.unit,
        description: metric.description,
      });

      db.insertMetricValue({
        metric_id: metricDef.id,
        build_id: buildId,
        value_numeric: parseResult.numericValue,
        value_label: parseResult.labelValue,
        collected_at: new Date().toISOString(),
        collection_duration_ms: commandResult.durationMs,
      });

      result.successful++;
    } catch (error) {
      result.failed++;
      result.failures.push({
        metricName: metric.name,
        reason: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  await db.close();
  return result;
}
