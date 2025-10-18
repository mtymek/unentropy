import { runCommand } from "./runner.node";
import type { MetricConfig } from "../config/schema";
import { DatabaseClient } from "../database/client";
import { DatabaseQueries } from "../database/queries";

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

  const db = new DatabaseClient({ path: dbPath });
  await db.ready();
  const queries = new DatabaseQueries(db);

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

        console.warn(`Metric '${metric.name}' failed: ${reason}`);
        if (commandResult.stderr) {
          console.warn(`Stderr: ${commandResult.stderr}`);
        }
        continue;
      }

      const parseResult = parseMetricValue(commandResult.stdout, metric.type);

      if (!parseResult.success) {
        result.failed++;
        result.failures.push({
          metricName: metric.name,
          reason: parseResult.error || "Unknown parse error",
        });

        console.warn(`Metric '${metric.name}' parse failed: ${parseResult.error}`);
        console.warn(`Output: ${commandResult.stdout}`);
        continue;
      }

      // Get or create metric definition
      let metricDef = queries.getMetricDefinition(metric.name);
      if (!metricDef) {
        metricDef = queries.upsertMetricDefinition({
          name: metric.name,
          type: metric.type,
          unit: metric.unit || null,
          description: metric.description || null,
        });
      }

      // Store metric value in database
      if (metric.type === "numeric" && parseResult.numericValue !== undefined) {
        queries.insertMetricValue({
          metric_id: metricDef.id,
          build_id: buildId,
          value_numeric: parseResult.numericValue,
          collected_at: new Date().toISOString(),
        });
      } else if (metric.type === "label" && parseResult.labelValue !== undefined) {
        queries.insertMetricValue({
          metric_id: metricDef.id,
          build_id: buildId,
          value_label: parseResult.labelValue,
          collected_at: new Date().toISOString(),
        });
      }

      result.successful++;
      console.log(`Metric '${metric.name}' collected successfully`);
    } catch (error) {
      result.failed++;
      result.failures.push({
        metricName: metric.name,
        reason: error instanceof Error ? error.message : String(error),
      });

      console.error(`Metric '${metric.name}' error:`, error);
    }
  }

  db.close();
  return result;
}
