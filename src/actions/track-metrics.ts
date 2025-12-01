import * as core from "@actions/core";
import * as github from "@actions/github";
import { loadConfig } from "../config/loader";
import { Storage } from "../storage/storage";
import { collectMetrics } from "../collector/collector";
import { extractBuildContext } from "../collector/context";
import { StorageConfig, UnentropyConfig } from "../config/schema";
import type { StorageProviderConfig } from "../storage/providers/interface";
import { formatValue, formatDelta } from "../metrics/unit-formatter";
import type { UnitType } from "../metrics/types";

interface ActionInputs {
  storageType: string;
  configFile: string;
  databaseKey: string;
  reportDir: string;
  s3Endpoint?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3SessionToken?: string;
  timeout?: number;
  retryAttempts?: number;
  verbose?: boolean;
  enablePrComment?: boolean;
  prCommentMarker?: string;
}

interface ActionOutputs {
  success: boolean;
  storageType: string;
  databaseLocation: string;
  databaseSize?: number;
  metricsCollected?: number;
  duration: number;
  errorCode?: string;
  errorMessage?: string;
  prCommentUrl?: string;
}

function parseInputs(): ActionInputs {
  const storageType = core.getInput("storage-type") || "sqlite-local";
  const configFile = core.getInput("config-file") || "unentropy.json";
  const databaseKey = core.getInput("database-key") || "unentropy-metrics.db";
  const reportDir = core.getInput("report-dir") || "unentropy-report";

  // S3 configuration (optional for non-S3 storage types)
  const s3Endpoint = core.getInput("s3-endpoint");
  const s3Bucket = core.getInput("s3-bucket");
  const s3Region = core.getInput("s3-region");
  const s3AccessKeyId = core.getInput("s3-access-key-id");
  const s3SecretAccessKey = core.getInput("s3-secret-access-key");
  const s3SessionToken = core.getInput("s3-session-token");

  // Optional parameters
  const timeoutInput = core.getInput("timeout");
  const retryAttemptsInput = core.getInput("retry-attempts");
  const verboseInput = core.getInput("verbose");
  const enablePrCommentInput = core.getInput("enable-pr-comment");
  const prCommentMarkerInput = core.getInput("pr-comment-marker");

  const timeout = timeoutInput ? parseInt(timeoutInput, 10) : undefined;
  const retryAttempts = retryAttemptsInput ? parseInt(retryAttemptsInput, 10) : undefined;
  const verbose = verboseInput ? verboseInput.toLowerCase() === "true" : false;
  const enablePrComment = enablePrCommentInput
    ? enablePrCommentInput.toLowerCase() === "true"
    : false;
  const prCommentMarker = prCommentMarkerInput || "<!-- unentropy-metrics-quality-gate -->";

  // Validate storage type
  const validStorageTypes = ["sqlite-local", "sqlite-artifact", "sqlite-s3"];
  if (!validStorageTypes.includes(storageType)) {
    throw new Error(
      `Invalid storage-type: must be one of ${validStorageTypes.join(", ")}. Got: ${storageType}`
    );
  }

  // Validate S3 requirements for S3 storage
  if (storageType === "sqlite-s3") {
    if (!s3AccessKeyId || !s3SecretAccessKey) {
      throw new Error("S3 storage requires s3-access-key-id and s3-secret-access-key inputs");
    }
  }

  return {
    storageType,
    configFile,
    databaseKey,
    reportDir,
    s3Endpoint,
    s3Bucket,
    s3Region,
    s3AccessKeyId,
    s3SecretAccessKey,
    s3SessionToken,
    timeout,
    retryAttempts,
    verbose,
    enablePrComment,
    prCommentMarker,
  };
}

function createStorageConfig(inputs: ActionInputs, config: StorageConfig): StorageProviderConfig {
  // For sqlite-s3, merge S3 configuration from inputs
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

  // For sqlite-local, use database key as path
  if (config.type === "sqlite-local") {
    return {
      type: "sqlite-local",
      path: inputs.databaseKey,
    };
  }

  // For sqlite-artifact (not yet implemented)
  return {
    type: "sqlite-artifact",
  };
}

function isPullRequestContext(): boolean {
  return process.env.GITHUB_EVENT_NAME === "pull_request";
}

interface MetricDiff {
  metricName: string;
  unit: string | null;
  baselineValue?: number;
  pullRequestValue?: number;
  absoluteDelta?: number;
  relativeDeltaPercent?: number;
  status: "improved" | "degraded" | "unchanged" | "no-baseline";
}

async function createOrUpdatePullRequestComment(
  config: UnentropyConfig,
  collectedMetrics: {
    definition: { name: string; type: string };
    value_numeric?: number;
    value_label?: string;
  }[],
  failures: { metricName: string; reason: string }[],
  marker: string,
  storage: Storage
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

  // Create comment body
  const successCount = collectedMetrics.length;
  const failureCount = failures.length;
  const totalMetrics = config.metrics.length;

  // Calculate metric diffs based on config and collected metrics
  let metricDiffsSection = "";
  try {
    const repository = storage.getRepository();

    // Create a map of collected metrics by name for quick lookup
    const collectedMetricsMap = new Map(collectedMetrics.map((m) => [m.definition.name, m]));

    const diffs: MetricDiff[] = [];

    // Iterate through config metrics to determine which ones to analyze
    for (const metricConfig of config.metrics) {
      if (metricConfig.type === "numeric" && metricConfig.name) {
        const collectedMetric = collectedMetricsMap.get(metricConfig.name);
        const pullRequestValue = collectedMetric?.value_numeric;

        if (pullRequestValue !== null && pullRequestValue !== undefined) {
          // Get baseline values from main branch
          const baselineValues = repository.getBaselineMetricValues(metricConfig.name, "main");

          if (baselineValues.length > 0) {
            // Use the latest baseline value (first in array, as they're ordered by build_id DESC)
            const latestBaselineValue = baselineValues[0];
            const latestBaseline = latestBaselineValue?.value_numeric;

            if (latestBaseline !== undefined) {
              const absoluteDelta = pullRequestValue - latestBaseline;
              const relativeDeltaPercent =
                latestBaseline !== 0 ? (absoluteDelta / latestBaseline) * 100 : 0;

              let status: "improved" | "degraded" | "unchanged";
              if (Math.abs(relativeDeltaPercent) < 0.1) {
                status = "unchanged";
              } else if (relativeDeltaPercent > 0) {
                // For most metrics, higher is better, but this is a simplistic approach
                // In a full implementation, this would depend on the metric type
                status = "degraded";
              } else {
                status = "improved";
              }

              diffs.push({
                metricName: metricConfig.name,
                unit: metricConfig.unit || null,
                baselineValue: latestBaseline,
                pullRequestValue,
                absoluteDelta,
                relativeDeltaPercent,
                status,
              });
            } else {
              diffs.push({
                metricName: metricConfig.name,
                unit: metricConfig.unit || null,
                pullRequestValue,
                status: "no-baseline",
              });
            }
          } else {
            diffs.push({
              metricName: metricConfig.name,
              unit: metricConfig.unit || null,
              pullRequestValue,
              status: "no-baseline",
            });
          }
        }
      }
    }

    if (diffs.length > 0) {
      const diffRows = diffs
        .map((diff) => {
          // Convert unit string to UnitType (handle both semantic and legacy units)
          const unitType = diff.unit as UnitType | null;

          const baselineStr =
            diff.baselineValue !== undefined ? formatValue(diff.baselineValue, unitType) : "N/A";
          const prStr =
            diff.pullRequestValue !== undefined
              ? formatValue(diff.pullRequestValue, unitType)
              : "N/A";
          const deltaStr =
            diff.absoluteDelta !== undefined ? formatDelta(diff.absoluteDelta, unitType) : "N/A";

          return `| ${diff.metricName} | ${baselineStr} | ${prStr} | ${deltaStr} |`;
        })
        .join("\n");

      metricDiffsSection = `
### Metric Changes vs Baseline

| Metric | Baseline | PR | Δ |
|--------|----------|----|---|
${diffRows}

`;
    }
  } catch (error) {
    core.warning(
      `Failed to calculate metric diffs: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const commentBody = `${marker}

## 📊 Unentropy Metrics Report

${metricDiffsSection}
${
  failureCount > 0
    ? `
### Failed Metrics
${failures.map((f) => `- **${f.metricName}**: ${f.reason}`).join("\n")}
`
    : ""
}

### Summary
- **Total Metrics**: ${totalMetrics}
- **Successful**: ${successCount}
- **Failed**: ${failureCount}

---
Generated by **[Unentropy](https://github.com/unentropy/unentropy)**
`;

  // Try to find existing comment
  const existingComments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pull_number,
    per_page: 100,
  });

  const existingComment = existingComments.data.find((comment) => comment.body?.includes(marker));

  let commentUrl: string;

  if (existingComment) {
    // Update existing comment
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body: commentBody,
    });
    commentUrl = existingComment.html_url;
    core.info("Updated existing PR comment");
  } else {
    // Create new comment
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
}

export async function runTrackMetricsAction(): Promise<void> {
  const startTime = Date.now();

  // Parse and validate inputs
  const inputs = parseInputs();
  core.info(`Starting unified track-metrics action with storage: ${inputs.storageType}`);

  if (inputs.verbose) {
    core.info(`Configuration file: ${inputs.configFile}`);
    core.info(`Database key: ${inputs.databaseKey}`);
    core.info(`Report directory: ${inputs.reportDir}`);
  }

  // Load configuration
  const config = await loadConfig(inputs.configFile);
  core.info(`Configuration loaded successfully with ${config.metrics.length} metrics`);

  // Phase 1: Initialize storage
  core.info("Initializing storage provider...");
  const storageConfig = createStorageConfig(inputs, config.storage);
  const storage = new Storage(storageConfig);
  await storage.ready();
  core.info("Storage provider initialized successfully");

  // Phase 2: Collect metrics
  core.info("Collecting metrics...");
  const context = extractBuildContext();
  const repository = storage.getRepository();

  // Collect metrics (doesn't write to DB yet)
  const collectionResult = await collectMetrics(config.metrics);

  // Record build with all collected metrics in one operation
  await repository.recordBuild(context, collectionResult.collectedMetrics);

  core.info(
    `Metrics collection completed: ${collectionResult.successful}/${collectionResult.total} successful`
  );

  if (collectionResult.failed > 0) {
    core.warning(`${collectionResult.failed} metrics failed to collect`);
    for (const failure of collectionResult.failures) {
      core.warning(`  ${failure.metricName}: ${failure.reason}`);
    }
  }

  // Phase 2.5: Create PR comment if enabled and in PR context
  let prCommentUrl: string | undefined;
  if (inputs.enablePrComment && isPullRequestContext()) {
    core.info("Creating/updating pull request comment...");
    const commentUrl = await createOrUpdatePullRequestComment(
      config,
      collectionResult.collectedMetrics,
      collectionResult.failures,
      inputs.prCommentMarker || "<!-- unentropy-metrics-quality-gate -->",
      storage
    );
    if (commentUrl) {
      prCommentUrl = commentUrl;
      core.info(`PR comment created: ${prCommentUrl}`);
    }
  }

  // Phase 3: Generate report (before closing database)
  core.info("Generating HTML report...");
  try {
    const { generateReport } = await import("../reporter/generator");
    const reportHtml = generateReport(storage, {
      config,
      repository: process.env.GITHUB_REPOSITORY || "unknown/repository",
    });

    // Create report directory and write index.html
    await Bun.write(`${inputs.reportDir}/index.html`, reportHtml);
    core.info(`Report generated: ${inputs.reportDir}/index.html`);
  } catch (error) {
    core.warning(
      `Report generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    // Continue anyway - report generation failure shouldn't fail the whole action
  }

  // Phase 4: Persist storage (upload for S3) - only on main branch, not PRs
  // This closes the database for S3 providers, so must happen after report generation
  if (!isPullRequestContext()) {
    core.info("Uploading database to S3...");
    await storage.persist();
  } else {
    core.info("Skipping database upload in pull request context");
  }

  const duration = Date.now() - startTime;

  // Set outputs
  const outputs: ActionOutputs = {
    success: true,
    storageType: inputs.storageType,
    databaseLocation: `storage://${inputs.storageType}/${inputs.databaseKey}`,
    metricsCollected: collectionResult.successful,
    duration,
    prCommentUrl,
  };

  core.setOutput("success", outputs.success.toString());
  core.setOutput("storage-type", outputs.storageType);
  core.setOutput("database-location", outputs.databaseLocation);
  if (outputs.databaseSize !== undefined) {
    core.setOutput("database-size", outputs.databaseSize.toString());
  }
  if (outputs.metricsCollected !== undefined) {
    core.setOutput("metrics-collected", outputs.metricsCollected.toString());
  }
  core.setOutput("duration", outputs.duration.toString());
  if (outputs.prCommentUrl) {
    core.setOutput("pr-comment-url", outputs.prCommentUrl);
  }

  core.info("Track-metrics action completed successfully");

  // Cleanup
  await storage.close();
}

// Run the action if this file is executed directly
if (import.meta.main) {
  runTrackMetricsAction().catch((error) => {
    core.setFailed(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
