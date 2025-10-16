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

  const latest = numericValues[numericValues.length - 1]!;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const average = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;

  let trendDirection: "up" | "down" | "stable" | null = null;
  let trendPercent: number | null = null;

  if (numericValues.length >= 2) {
    const first = numericValues[0]!;
    const last = numericValues[numericValues.length - 1]!;
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
