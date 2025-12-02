import type { MetricThresholdConfig } from "../config/schema.js";

export type MetricGateStatus = "pass" | "fail" | "unknown";

export interface MetricSample {
  name: string;
  unit?: string;
  type: "numeric" | "label";
  baselineValues: number[];
  pullRequestValue?: number;
}

export interface MetricEvaluationResult {
  metric: string;
  unit?: string;
  baselineMedian?: number;
  pullRequestValue?: number;
  absoluteDelta?: number;
  relativeDeltaPercent?: number;
  threshold?: MetricThresholdConfig;
  status: MetricGateStatus;
  message?: string;
  isBlocking?: boolean;
}

export type QualityGateOverallStatus = "pass" | "fail" | "unknown";

export interface QualityGateResult {
  status: QualityGateOverallStatus;
  mode: "off" | "soft" | "hard";
  metrics: MetricEvaluationResult[];
  failingMetrics: MetricEvaluationResult[];
  summary: {
    totalMetrics: number;
    evaluatedMetrics: number;
    passed: number;
    failed: number;
    unknown: number;
  };
  baselineInfo: {
    referenceBranch: string;
    buildsConsidered: number;
    maxBuilds: number;
    maxAgeDays: number;
  };
}

export interface QualityGateBaselineInfo {
  referenceBranch: string;
  buildsConsidered: number;
  maxBuilds: number;
  maxAgeDays: number;
}
