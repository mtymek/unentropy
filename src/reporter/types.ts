import type { MetricType } from "../storage/types";
import type { ChartConfig } from "./charts";

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

export interface ReportMetadata {
  repository: string;
  generatedAt: string;
  buildCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface MetricReportData {
  id: string;
  name: string;
  description: string | null;
  stats: SummaryStats;
  chartConfig: ChartConfig;
  sparse: boolean;
  dataPointCount: number;
}

export interface ReportData {
  metadata: ReportMetadata;
  metrics: MetricReportData[];
}

export interface GenerateReportOptions {
  repository?: string;
  metricNames?: string[];
  config?: import("../config/loader").ResolvedUnentropyConfig;
}
