import type { MetricThresholdConfig, QualityGateConfig } from "../config/schema.js";
import type {
  MetricSample,
  MetricEvaluationResult,
  QualityGateResult,
  QualityGateBaselineInfo,
} from "./types.js";

export function calculateMedian(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    const left = sorted[mid - 1];
    const right = sorted[mid];
    if (left === undefined || right === undefined) {
      return undefined;
    }
    return (left + right) / 2;
  }

  return sorted[mid];
}

export function evaluateThreshold(
  sample: MetricSample,
  threshold: MetricThresholdConfig,
  baselineMedian: number | undefined
): MetricEvaluationResult {
  const result: MetricEvaluationResult = {
    metric: sample.name,
    unit: sample.unit,
    baselineMedian,
    pullRequestValue: sample.pullRequestValue,
    threshold,
    status: "unknown",
    isBlocking: threshold.severity !== "warning",
  };

  if (baselineMedian !== undefined && sample.pullRequestValue !== undefined) {
    result.absoluteDelta = sample.pullRequestValue - baselineMedian;
    if (baselineMedian !== 0) {
      result.relativeDeltaPercent = (result.absoluteDelta / baselineMedian) * 100;
    }
  }

  if (sample.pullRequestValue === undefined) {
    result.status = "unknown";
    result.message = "Metric value not available for pull request";
    return result;
  }

  if (baselineMedian === undefined) {
    result.status = "unknown";
    result.message = "Baseline data not available";
    return result;
  }

  switch (threshold.mode) {
    case "min":
      if (threshold.target === undefined) {
        result.status = "unknown";
        result.message = "Threshold target not specified";
        break;
      }
      if (sample.pullRequestValue >= threshold.target) {
        result.status = "pass";
      } else {
        result.status = "fail";
        result.message = `${sample.name} (${sample.pullRequestValue}) is below minimum threshold of ${threshold.target}`;
      }
      break;

    case "max":
      if (threshold.target === undefined) {
        result.status = "unknown";
        result.message = "Threshold target not specified";
        break;
      }
      if (sample.pullRequestValue <= threshold.target) {
        result.status = "pass";
      } else {
        result.status = "fail";
        result.message = `${sample.name} (${sample.pullRequestValue}) exceeds maximum threshold of ${threshold.target}`;
      }
      break;

    case "no-regression": {
      const tolerance = threshold.tolerance ?? 0.5;
      if (sample.pullRequestValue >= baselineMedian - tolerance) {
        result.status = "pass";
      } else {
        result.status = "fail";
        result.message = `${sample.name} regressed beyond tolerance (${sample.pullRequestValue} vs baseline ${baselineMedian}, tolerance: ${tolerance})`;
      }
      break;
    }

    case "delta-max-drop": {
      if (threshold.maxDropPercent === undefined) {
        result.status = "unknown";
        result.message = "maxDropPercent not specified";
        break;
      }

      if (baselineMedian === 0) {
        result.status = "unknown";
        result.message = "Cannot calculate percentage drop from zero baseline";
        break;
      }

      const dropPercent = ((baselineMedian - sample.pullRequestValue) / baselineMedian) * 100;

      if (dropPercent <= threshold.maxDropPercent) {
        result.status = "pass";
      } else {
        result.status = "fail";
        result.message = `${sample.name} dropped by ${dropPercent.toFixed(2)}%, exceeding max allowed drop of ${threshold.maxDropPercent}%`;
      }
      break;
    }
  }

  return result;
}

export function evaluateQualityGate(
  samples: MetricSample[],
  config: QualityGateConfig,
  baselineInfo: QualityGateBaselineInfo
): QualityGateResult {
  const mode = config.mode ?? "soft";
  const thresholds = config.thresholds ?? [];

  if (mode === "off") {
    return {
      status: "unknown",
      mode: "off",
      metrics: [],
      failingMetrics: [],
      summary: {
        totalMetrics: samples.length,
        evaluatedMetrics: 0,
        passed: 0,
        failed: 0,
        unknown: samples.length,
      },
      baselineInfo,
    };
  }

  const thresholdMap = new Map<string, MetricThresholdConfig>();
  for (const threshold of thresholds) {
    thresholdMap.set(threshold.metric, threshold);
  }

  const evaluationResults: MetricEvaluationResult[] = [];

  for (const sample of samples) {
    const threshold = thresholdMap.get(sample.name);

    if (!threshold) {
      const baselineMedian = calculateMedian(sample.baselineValues);
      const result: MetricEvaluationResult = {
        metric: sample.name,
        unit: sample.unit,
        baselineMedian,
        pullRequestValue: sample.pullRequestValue,
        status: "unknown",
        message: "No threshold configured for this metric",
        isBlocking: false,
      };

      if (baselineMedian !== undefined && sample.pullRequestValue !== undefined) {
        result.absoluteDelta = sample.pullRequestValue - baselineMedian;
        if (baselineMedian !== 0) {
          result.relativeDeltaPercent = (result.absoluteDelta / baselineMedian) * 100;
        }
      }

      evaluationResults.push(result);
      continue;
    }

    const baselineMedian = calculateMedian(sample.baselineValues);
    const result = evaluateThreshold(sample, threshold, baselineMedian);
    evaluationResults.push(result);
  }

  const failingMetrics = evaluationResults.filter(
    (r) => r.status === "fail" && r.isBlocking === true
  );

  const summary = {
    totalMetrics: samples.length,
    evaluatedMetrics: evaluationResults.filter((r) => r.threshold !== undefined).length,
    passed: evaluationResults.filter((r) => r.status === "pass").length,
    failed: evaluationResults.filter((r) => r.status === "fail").length,
    unknown: evaluationResults.filter((r) => r.status === "unknown").length,
  };

  let overallStatus: "pass" | "fail" | "unknown";
  if (thresholds.length === 0) {
    overallStatus = "unknown";
  } else if (failingMetrics.length > 0) {
    overallStatus = "fail";
  } else if (summary.evaluatedMetrics === 0) {
    overallStatus = "unknown";
  } else if (summary.evaluatedMetrics > 0 && failingMetrics.length === 0) {
    overallStatus = "pass";
  } else {
    overallStatus = "unknown";
  }

  return {
    status: overallStatus,
    mode,
    metrics: evaluationResults,
    failingMetrics,
    summary,
    baselineInfo,
  };
}
