import type { DatabaseClient } from "../database/client";
import type { MetricType } from "../database/types";
import { buildChartConfig } from "./charts";
import {
  generateHtmlReport,
  type ReportData,
  type ReportMetadata,
  type MetricReportData,
} from "./templates";

export interface TimeSeriesDataPoint {
  timestamp: string;
  valueNumeric: number | null;
  valueLabel: string | null;
  commitSha: string;
  branch: string;
  runNumber: number;
}

export interface TimeSeriesData {
  metricName: string;
  metricType: MetricType;
  unit: string | null;
  description: string | null;
  dataPoints: TimeSeriesDataPoint[];
}

export interface SummaryStats {
  latest: number | null;
  min: number | null;
  max: number | null;
  average: number | null;
  trendDirection: "up" | "down" | "stable" | null;
  trendPercent: number | null;
}

export interface GenerateReportOptions {
  repository?: string;
  metricNames?: string[];
}

export function getMetricTimeSeries(db: DatabaseClient, metricName: string): TimeSeriesData {
  const metricDef = db.getMetricDefinition(metricName);
  if (!metricDef) {
    throw new Error(`Metric '${metricName}' not found`);
  }

  const rows = db.getMetricTimeSeries(metricName);

  const dataPoints: TimeSeriesDataPoint[] = rows.map((row) => ({
    timestamp: row.build_timestamp,
    valueNumeric: row.value_numeric,
    valueLabel: row.value_label,
    commitSha: row.commit_sha,
    branch: row.branch,
    runNumber: row.run_number,
  }));

  return {
    metricName: metricDef.name,
    metricType: metricDef.type,
    unit: metricDef.unit,
    description: metricDef.description,
    dataPoints,
  };
}

export function calculateSummaryStats(data: TimeSeriesData): SummaryStats {
  if (data.metricType !== "numeric" || data.dataPoints.length === 0) {
    return {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };
  }

  const numericValues = data.dataPoints
    .map((dp) => dp.valueNumeric)
    .filter((v): v is number => v !== null);

  if (numericValues.length === 0) {
    return {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };
  }

  const latest = numericValues[numericValues.length - 1] ?? null;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const average = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;

  let trendDirection: "up" | "down" | "stable" | null = null;
  let trendPercent: number | null = null;

  if (numericValues.length >= 2) {
    const first = numericValues[0];
    const last = numericValues[numericValues.length - 1];
    if (first === undefined || last === undefined) {
      return {
        latest,
        min,
        max,
        average,
        trendDirection: null,
        trendPercent: null,
      };
    }
    const change = last - first;
    const percentChange = first !== 0 ? (change / Math.abs(first)) * 100 : 0;

    if (Math.abs(percentChange) < 0.01) {
      trendDirection = "stable";
    } else if (change > 0) {
      trendDirection = "up";
    } else {
      trendDirection = "down";
    }

    trendPercent = percentChange;
  }

  return {
    latest,
    min,
    max,
    average,
    trendDirection,
    trendPercent,
  };
}

function getReportMetadata(db: DatabaseClient, repository: string): ReportMetadata {
  const allBuilds = db.getAllBuildContexts();

  if (allBuilds.length === 0) {
    const now = new Date().toISOString();
    return {
      repository,
      generatedAt: now,
      buildCount: 0,
      dateRange: {
        start: now,
        end: now,
      },
    };
  }

  const timestamps = allBuilds.map((b: { timestamp: string }) => b.timestamp).sort();
  const start = timestamps[0];
  const end = timestamps[timestamps.length - 1];

  if (!start || !end) {
    const now = new Date().toISOString();
    return {
      repository,
      generatedAt: now,
      buildCount: allBuilds.length,
      dateRange: {
        start: now,
        end: now,
      },
    };
  }

  return {
    repository,
    generatedAt: new Date().toISOString(),
    buildCount: allBuilds.length,
    dateRange: {
      start,
      end,
    },
  };
}

export function generateReport(db: DatabaseClient, options: GenerateReportOptions = {}): string {
  const repository = options.repository || "unknown/repository";

  const allMetrics = db.getAllMetricDefinitions();
  const metricNames = options.metricNames || allMetrics.map((m) => m.name);

  const metrics: MetricReportData[] = [];

  for (const metricName of metricNames) {
    try {
      const timeSeries = getMetricTimeSeries(db, metricName);
      const stats = calculateSummaryStats(timeSeries);
      const chartConfig = buildChartConfig(timeSeries);

      const sparse = timeSeries.dataPoints.length < 10;

      metrics.push({
        id: metricName.replace(/[^a-zA-Z0-9-]/g, "-"),
        name: timeSeries.metricName,
        description: timeSeries.description,
        stats,
        chartConfig,
        sparse,
        dataPointCount: timeSeries.dataPoints.length,
      });
    } catch (error) {
      console.warn(`Failed to generate report for metric '${metricName}':`, error);
    }
  }

  const metadata = getReportMetadata(db, repository);

  const reportData: ReportData = {
    metadata,
    metrics,
  };

  return generateHtmlReport(reportData);
}
