import * as core from "@actions/core";
import * as github from "@actions/github";
import { loadConfig } from "../config/loader.js";
import { Storage } from "../storage/storage.js";
import { collectMetrics } from "../collector/collector.js";
import type { MetricThresholdConfig, QualityGateConfig, StorageConfig } from "../config/schema.js";
import type { StorageProviderConfig } from "../storage/providers/interface.js";
import type { MetricsRepository } from "../storage/repository.js";
import { formatValue, formatDelta } from "../metrics/unit-formatter.js";
import type { UnitType } from "../metrics/types.js";

// ============================================================================
// Evaluation Types and Logic
// ============================================================================

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

function calculateMedian(values: number[]): number | undefined {
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

function evaluateThreshold(
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
  baselineInfo: {
    referenceBranch: string;
    buildsConsidered: number;
    maxBuilds: number;
    maxAgeDays: number;
  }
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
      evaluationResults.push({
        metric: sample.name,
        unit: sample.unit,
        baselineMedian: calculateMedian(sample.baselineValues),
        pullRequestValue: sample.pullRequestValue,
        status: "unknown",
        message: "No threshold configured for this metric",
        isBlocking: false,
      });
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

  let overallStatus: QualityGateOverallStatus;
  if (thresholds.length === 0) {
    overallStatus = "unknown";
  } else if (failingMetrics.length > 0) {
    overallStatus = "fail";
  } else if (summary.evaluatedMetrics === 0) {
    overallStatus = "unknown";
  } else if (summary.passed > 0) {
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

// ============================================================================
// GitHub Action Entrypoint
// ============================================================================

interface QualityGateInputs {
  storageType: string;
  configFile: string;
  databaseKey: string;
  s3Endpoint?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  qualityGateMode?: string;
  enablePrComment?: boolean;
  prCommentMarker?: string;
  maxPrCommentMetrics?: number;
}

function parseInputs(): QualityGateInputs {
  const storageType = core.getInput("storage-type") || "sqlite-s3";
  const configFile = core.getInput("config-file") || "unentropy.json";
  const databaseKey = core.getInput("database-key") || "unentropy.db";

  const s3Endpoint = core.getInput("s3-endpoint");
  const s3Bucket = core.getInput("s3-bucket");
  const s3Region = core.getInput("s3-region");
  const s3AccessKeyId = core.getInput("s3-access-key-id");
  const s3SecretAccessKey = core.getInput("s3-secret-access-key");

  const qualityGateMode = core.getInput("quality-gate-mode");
  const enablePrCommentInput = core.getInput("enable-pr-comment");
  const prCommentMarkerInput = core.getInput("pr-comment-marker");
  const maxPrCommentMetricsInput = core.getInput("max-pr-comment-metrics");

  const enablePrComment = enablePrCommentInput
    ? enablePrCommentInput.toLowerCase() === "true"
    : true;
  const prCommentMarker = prCommentMarkerInput || "<!-- unentropy-quality-gate -->";
  const maxPrCommentMetrics = maxPrCommentMetricsInput
    ? parseInt(maxPrCommentMetricsInput, 10)
    : 30;

  if (storageType === "sqlite-s3") {
    if (!s3AccessKeyId || !s3SecretAccessKey) {
      throw new Error("S3 storage requires s3-access-key-id and s3-secret-access-key inputs");
    }
  }

  return {
    storageType,
    configFile,
    databaseKey,
    s3Endpoint,
    s3Bucket,
    s3Region,
    s3AccessKeyId,
    s3SecretAccessKey,
    qualityGateMode,
    enablePrComment,
    prCommentMarker,
    maxPrCommentMetrics,
  };
}

function createStorageConfig(
  inputs: QualityGateInputs,
  config: StorageConfig
): StorageProviderConfig {
  if (config.type === "sqlite-s3") {
    return {
      type: "sqlite-s3",
      endpoint: inputs.s3Endpoint,
      bucket: inputs.s3Bucket,
      region: inputs.s3Region,
      accessKeyId: inputs.s3AccessKeyId,
      secretAccessKey: inputs.s3SecretAccessKey,
      databaseKey: inputs.databaseKey,
    };
  }

  if (config.type === "sqlite-local") {
    return {
      type: "sqlite-local",
      path: inputs.databaseKey,
    };
  }

  return {
    type: "sqlite-artifact",
  };
}

function buildMetricSamples(
  collectedMetrics: {
    definition: {
      name: string;
      type: "numeric" | "label";
      unit?: string;
      description?: string;
    };
    value_numeric?: number;
    value_label?: string;
  }[],
  repository: MetricsRepository,
  referenceBranch: string,
  maxBuilds: number,
  maxAgeDays: number
): MetricSample[] {
  const samples: MetricSample[] = [];

  for (const collected of collectedMetrics) {
    const def = collected.definition;

    if (def.type !== "numeric") {
      continue;
    }

    const baselineValues = repository
      .getBaselineMetricValues(def.name, referenceBranch, maxBuilds, maxAgeDays)
      .map((v) => v.value_numeric);

    samples.push({
      name: def.name,
      unit: def.unit,
      type: "numeric",
      baselineValues,
      pullRequestValue: collected.value_numeric,
    });
  }

  return samples;
}

function determineReferenceBranch(config: { qualityGate?: QualityGateConfig }): string {
  const contextBase = process.env.GITHUB_BASE_REF;
  return config.qualityGate?.baseline?.referenceBranch ?? contextBase ?? "main";
}

function calculateBuildsConsidered(samples: MetricSample[]): number {
  return Math.max(...samples.map((s) => s.baselineValues.length), 0);
}

async function createQualityGateComment(
  gateResult: QualityGateResult,
  marker: string,
  maxMetrics: number
): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    core.warning("GITHUB_TOKEN not available, skipping PR comment");
    return null;
  }

  const octokit = github.getOctokit(token);
  const context = github.context;

  if (!context.payload.pull_request) {
    core.warning("Not in a pull request context, skipping comment");
    return null;
  }

  const { owner, repo } = context.repo;
  const pull_number = context.payload.pull_request.number;

  let commentBody = `${marker}\n\n`;

  if (gateResult.summary.totalMetrics === 0 || gateResult.baselineInfo.buildsConsidered === 0) {
    commentBody += `## 🛡️ Quality Gate: **UNKNOWN** ⚠️\n\n`;
    commentBody += `### No Baseline Data Available\n\n`;
    commentBody += `This appears to be the first pull request, or baseline data is not yet available.\n`;
    commentBody += `Metrics were collected successfully, but there's no reference baseline to compare against.\n\n`;

    if (gateResult.metrics.length > 0) {
      commentBody += `**Collected Metrics** (${gateResult.metrics.length}):\n`;
      for (const metric of gateResult.metrics.slice(0, 5)) {
        if (metric.pullRequestValue !== undefined) {
          commentBody += `- ${metric.metric}: ${formatValue(metric.pullRequestValue, metric.unit as UnitType)}\n`;
        }
      }
      if (gateResult.metrics.length > 5) {
        commentBody += `\n_...and ${gateResult.metrics.length - 5} more metrics_\n`;
      }
    }

    commentBody += `\nOnce the main branch has metrics data, future PRs will be evaluated against that baseline.\n`;
  } else {
    const statusBadge =
      gateResult.status === "pass"
        ? "**PASS** ✅"
        : gateResult.status === "fail"
          ? "**FAIL** ❌"
          : "**UNKNOWN** ⚠️";

    commentBody += `## 🛡️ Quality Gate: ${statusBadge}\n\n`;
    commentBody += `**Mode**: ${gateResult.mode} • **Reference**: ${gateResult.baselineInfo.referenceBranch} • **Builds**: ${gateResult.baselineInfo.buildsConsidered}/${gateResult.baselineInfo.maxBuilds}\n\n`;

    if (gateResult.failingMetrics.length > 0) {
      commentBody += `### 🔴 Blocking Violations\n\n`;
      for (const metric of gateResult.failingMetrics) {
        commentBody += `- **${metric.metric}**: ${metric.message}\n`;
      }
      commentBody += `\n`;
    }

    commentBody += `### Threshold Evaluation\n\n`;
    commentBody += `| Metric | Baseline | PR Value | Δ | Status | Threshold |\n`;
    commentBody += `|--------|----------|----------|---|--------|-----------|\n`;

    const metricsToShow = gateResult.metrics.slice(0, maxMetrics);
    for (const metric of metricsToShow) {
      const baselineStr =
        metric.baselineMedian !== undefined
          ? formatValue(metric.baselineMedian, metric.unit as UnitType)
          : "N/A";
      const prStr =
        metric.pullRequestValue !== undefined
          ? formatValue(metric.pullRequestValue, metric.unit as UnitType)
          : "N/A";
      const deltaStr =
        metric.absoluteDelta !== undefined
          ? formatDelta(metric.absoluteDelta, metric.unit as UnitType)
          : "N/A";
      const statusIcon = metric.status === "pass" ? "✅" : metric.status === "fail" ? "❌" : "⚠️";
      const thresholdDesc = metric.threshold
        ? `${metric.threshold.mode}${metric.threshold.target !== undefined ? `: ${metric.threshold.target}` : ""}`
        : "none";

      commentBody += `| ${metric.metric} | ${baselineStr} | ${prStr} | ${deltaStr} | ${statusIcon} ${metric.status.toUpperCase()} | ${thresholdDesc} |\n`;
    }

    if (gateResult.metrics.length > maxMetrics) {
      commentBody += `\n_...and ${gateResult.metrics.length - maxMetrics} more metrics_\n`;
    }

    commentBody += `\n### Summary\n`;
    commentBody += `- **Evaluated**: ${gateResult.summary.evaluatedMetrics} metrics (${gateResult.summary.evaluatedMetrics} with thresholds)\n`;
    commentBody += `- **Passed**: ${gateResult.summary.passed} metrics\n`;
    commentBody += `- **Failed**: ${gateResult.summary.failed} metrics\n`;
    commentBody += `- **Unknown**: ${gateResult.summary.unknown} metrics\n`;
  }

  commentBody += `\n---\n`;
  commentBody += `<details>\n<summary>ℹ️ What is this?</summary>\n\n`;
  commentBody += `This is an automated quality gate check powered by [Unentropy](https://github.com/unentropy/unentropy).\n`;
  commentBody += `The gate compares your PR metrics against the baseline from the \`${gateResult.baselineInfo.referenceBranch}\` branch.\n\n`;
  commentBody += `**Current mode: ${gateResult.mode}**`;
  if (gateResult.mode === "soft") {
    commentBody += ` - This check is informational only and won't block your PR.\n`;
  } else if (gateResult.mode === "hard") {
    commentBody += ` - This check may block your PR if blocking thresholds are violated.\n`;
  }
  commentBody += `</details>\n`;

  try {
    const existingComments = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: pull_number,
      per_page: 100,
    });

    const existingComment = existingComments.data.find((comment) => comment.body?.includes(marker));

    let commentUrl: string;

    if (existingComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      commentUrl = existingComment.html_url;
      core.info("Updated existing PR comment");
    } else {
      const response = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: commentBody,
      });
      commentUrl = response.data.html_url;
      core.info("Created new PR comment");
    }

    return commentUrl;
  } catch (error) {
    core.warning(
      `Failed to post PR comment: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

export async function runQualityGateAction(): Promise<void> {
  const startTime = Date.now();

  try {
    const inputs = parseInputs();
    core.info(`Starting quality gate action with storage: ${inputs.storageType}`);

    const config = await loadConfig(inputs.configFile);
    core.info(`Configuration loaded successfully with ${config.metrics.length} metrics`);

    const gateMode = (inputs.qualityGateMode ?? config.qualityGate?.mode ?? "soft") as
      | "off"
      | "soft"
      | "hard";
    core.info(`Quality gate mode: ${gateMode}`);

    if (gateMode === "off") {
      core.info("Quality gate disabled (mode: off)");
      core.setOutput("quality-gate-status", "unknown");
      core.setOutput("quality-gate-mode", "off");
      return;
    }

    core.info("Downloading baseline database...");
    const storageConfig = createStorageConfig(inputs, config.storage);
    const storage = new Storage(storageConfig);
    await storage.ready();
    core.info("Baseline database downloaded successfully");

    const repository = storage.getRepository();

    core.info("Collecting metrics for current PR...");
    const collectionResult = await collectMetrics(config.metrics);
    core.info(
      `Metrics collection completed: ${collectionResult.successful}/${collectionResult.total} successful`
    );

    const referenceBranch = determineReferenceBranch(config);
    const maxBuilds = config.qualityGate?.baseline?.maxBuilds ?? 20;
    const maxAgeDays = config.qualityGate?.baseline?.maxAgeDays ?? 90;

    core.info(
      `Building metric samples (reference: ${referenceBranch}, maxBuilds: ${maxBuilds})...`
    );
    const samples = buildMetricSamples(
      collectionResult.collectedMetrics,
      repository,
      referenceBranch,
      maxBuilds,
      maxAgeDays
    );

    const buildsConsidered = calculateBuildsConsidered(samples);
    core.info(`Baseline builds considered: ${buildsConsidered}`);

    core.info("Evaluating quality gate...");
    const gateResult = evaluateQualityGate(
      samples,
      { ...config.qualityGate, mode: gateMode },
      {
        referenceBranch,
        buildsConsidered,
        maxBuilds,
        maxAgeDays,
      }
    );

    core.info(`Quality gate evaluation complete: ${gateResult.status}`);
    if (gateResult.failingMetrics.length > 0) {
      core.warning(`${gateResult.failingMetrics.length} metrics failed thresholds`);
      for (const metric of gateResult.failingMetrics) {
        core.warning(`  - ${metric.metric}: ${metric.message}`);
      }
    }

    let commentUrl: string | undefined;
    if (inputs.enablePrComment) {
      core.info("Creating/updating PR comment...");
      const url = await createQualityGateComment(
        gateResult,
        inputs.prCommentMarker || "<!-- unentropy-quality-gate -->",
        inputs.maxPrCommentMetrics || 30
      );
      if (url) {
        commentUrl = url;
        core.info(`PR comment created: ${commentUrl}`);
      }
    }

    core.setOutput("quality-gate-status", gateResult.status);
    core.setOutput("quality-gate-mode", gateResult.mode);
    core.setOutput(
      "quality-gate-failing-metrics",
      gateResult.failingMetrics.map((m) => m.metric).join(",")
    );
    if (commentUrl) {
      core.setOutput("quality-gate-comment-url", commentUrl);
    }
    core.setOutput("metrics-collected", collectionResult.successful);
    core.setOutput("baseline-builds-considered", buildsConsidered);
    core.setOutput("baseline-reference-branch", referenceBranch);

    await storage.close();

    if (gateMode === "hard" && gateResult.status === "fail") {
      const blockingCount = gateResult.failingMetrics.filter((m) => m.isBlocking).length;
      if (blockingCount > 0) {
        const message =
          `Quality gate failed: ${blockingCount} blocking threshold violations\n` +
          gateResult.failingMetrics
            .filter((m) => m.isBlocking)
            .map((m) => `  - ${m.metric}: ${m.message}`)
            .join("\n");
        core.setFailed(message);
        process.exit(1);
      }
    }

    const duration = Date.now() - startTime;
    core.info(`Quality gate action completed successfully in ${duration}ms`);
  } catch (error) {
    core.setFailed(
      `Quality gate action failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

if (import.meta.main) {
  runQualityGateAction().catch((error) => {
    core.setFailed(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
