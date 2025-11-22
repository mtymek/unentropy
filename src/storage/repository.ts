import type { DatabaseAdapter } from "./adapters/interface";
import type {
  InsertBuildContext,
  InsertMetricDefinition,
  InsertMetricValue,
  MetricDefinition,
} from "./types";

/**
 * MetricsRepository provides domain-specific operations (WHY - business logic).
 *
 * This layer exposes a clean API for application code without coupling to SQL
 * or database implementation details. It uses DatabaseAdapter internally to
 * execute queries.
 */
export class MetricsRepository {
  constructor(private adapter: DatabaseAdapter) {}

  /**
   * Record a complete build with all its metrics in a single operation.
   *
   * @param buildContext - Build metadata (commit, branch, run info)
   * @param metrics - Array of metrics to record for this build
   * @returns Build ID
   */
  async recordBuild(
    buildContext: InsertBuildContext,
    metrics: {
      definition: InsertMetricDefinition;
      value_numeric?: number;
      value_label?: string;
      collected_at: string;
      collection_duration_ms?: number;
    }[]
  ): Promise<number> {
    // Insert build context
    const buildId = this.adapter.insertBuildContext(buildContext);

    // Insert each metric definition and value
    for (const metric of metrics) {
      const metricDef = this.adapter.upsertMetricDefinition(metric.definition);

      const valueData: InsertMetricValue = {
        metric_id: metricDef.id,
        build_id: buildId,
        value_numeric: metric.value_numeric,
        value_label: metric.value_label,
        collected_at: metric.collected_at,
        collection_duration_ms: metric.collection_duration_ms,
      };

      this.adapter.insertMetricValue(valueData);
    }

    return buildId;
  }

  /**
   * Get metric comparison between two commits.
   *
   * Note: Full commit-specific comparison will be implemented in Phase 2.
   * Currently returns baseline from reference branch.
   *
   * @param metricName - Name of the metric to compare
   * @returns Comparison object with baseline and current values
   */
  async getMetricComparison(metricName: string): Promise<{
    metric: MetricDefinition;
    baseline?: { value: number; commit_sha: string };
    current?: { value: number; commit_sha: string };
    delta?: number;
    deltaPercent?: number;
  }> {
    const metricDef = this.adapter.getMetricDefinition(metricName);
    if (!metricDef) {
      throw new Error(`Metric not found: ${metricName}`);
    }

    // Get baseline values (latest from reference branch)
    const baselineValues = this.adapter.getBaselineMetricValues(metricName, "main", 1);
    const baseline = baselineValues.length > 0 ? baselineValues[0] : undefined;

    // For now, return structure with baseline
    // Full implementation would query by specific commits
    return {
      metric: metricDef,
      baseline: baseline
        ? {
            value: baseline.value_numeric,
            commit_sha: "latest", // Will use _baseCommit in future
          }
        : undefined,
    };
  }

  /**
   * Get metric history with optional filtering.
   *
   * @param metricName - Name of the metric
   * @param options - Filtering options (branch, time range, limit)
   * @returns Array of metric values with build context
   */
  async getMetricHistory(
    metricName: string,
    options?: {
      branch?: string;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<
    {
      value_numeric?: number;
      value_label?: string;
      commit_sha: string;
      branch: string;
      run_number: number;
      build_timestamp: string;
    }[]
  > {
    // Get time series data
    const timeSeries = this.adapter.getMetricTimeSeries(metricName);

    // Apply filtering if needed
    let filtered = timeSeries;

    if (options?.branch) {
      filtered = filtered.filter((v) => v.branch === options.branch);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered.map((v) => ({
      value_numeric: v.value_numeric ?? undefined,
      value_label: v.value_label ?? undefined,
      commit_sha: v.commit_sha,
      branch: v.branch,
      run_number: v.run_number,
      build_timestamp: v.build_timestamp,
    }));
  }

  /**
   * Get all metric definitions.
   *
   * @returns Array of all metric definitions
   */
  getAllMetrics(): MetricDefinition[] {
    return this.adapter.getAllMetricDefinitions();
  }

  /**
   * Expose adapter for test assertions.
   *
   * This allows tests to verify database state directly while keeping
   * production code using the clean repository API.
   */
  get queries(): DatabaseAdapter {
    return this.adapter;
  }
}
