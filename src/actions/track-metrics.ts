import * as core from "@actions/core";
import { loadConfig } from "../config/loader";
import { Storage } from "../storage/storage";
import { collectMetrics } from "../collector/collector";
import { StorageConfig } from "../config/schema";
import type { StorageProviderConfig } from "../storage/providers/interface";

interface ActionInputs {
  storageType: string;
  configFile: string;
  databaseKey: string;
  reportName: string;
  s3Endpoint?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3SessionToken?: string;
  timeout?: number;
  retryAttempts?: number;
  verbose?: boolean;
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
}

function parseInputs(): ActionInputs {
  const storageType = core.getInput("storage-type") || "sqlite-local";
  const configFile = core.getInput("config-file") || "unentropy.json";
  const databaseKey = core.getInput("database-key") || "unentropy-metrics.db";
  const reportName = core.getInput("report-name") || "unentropy-report.html";

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

  const timeout = timeoutInput ? parseInt(timeoutInput, 10) : undefined;
  const retryAttempts = retryAttemptsInput ? parseInt(retryAttemptsInput, 10) : undefined;
  const verbose = verboseInput ? verboseInput.toLowerCase() === "true" : false;

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
    reportName,
    s3Endpoint,
    s3Bucket,
    s3Region,
    s3AccessKeyId,
    s3SecretAccessKey,
    s3SessionToken,
    timeout,
    retryAttempts,
    verbose,
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

export async function runTrackMetricsAction(): Promise<void> {
  const startTime = Date.now();

  try {
    // Parse and validate inputs
    const inputs = parseInputs();
    core.info(`Starting unified track-metrics action with storage: ${inputs.storageType}`);

    if (inputs.verbose) {
      core.info(`Configuration file: ${inputs.configFile}`);
      core.info(`Database key: ${inputs.databaseKey}`);
      core.info(`Report name: ${inputs.reportName}`);
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
    const buildId = storage.insertBuildContext({
      commit_sha: process.env.GITHUB_SHA || "unknown",
      branch: process.env.GITHUB_REF_NAME || "unknown",
      run_id: process.env.GITHUB_RUN_ID || "unknown",
      run_number: parseInt(process.env.GITHUB_RUN_NUMBER || "0"),
      timestamp: new Date().toISOString(),
    });

    const collectionResult = await collectMetrics(config.metrics, buildId, storage);

    core.info(
      `Metrics collection completed: ${collectionResult.successful}/${collectionResult.total} successful`
    );

    if (collectionResult.failed > 0) {
      core.warning(`${collectionResult.failed} metrics failed to collect`);
      for (const failure of collectionResult.failures) {
        core.warning(`  ${failure.metricName}: ${failure.reason}`);
      }
    }

    // Phase 3: Persist storage (upload for S3)
    if (inputs.storageType === "sqlite-s3") {
      core.info("Uploading database to S3...");
      await storage.persist();
      core.info("Database uploaded successfully");
    }

    // Phase 4: Generate report
    core.info("Generating HTML report...");
    try {
      const { generateReport } = await import("../reporter/generator");
      const reportHtml = generateReport(storage, {
        config,
        repository: process.env.GITHUB_REPOSITORY || "unknown/repository",
      });
      await Bun.write(inputs.reportName, reportHtml);
      core.info(`Report generated: ${inputs.reportName}`);
    } catch (error) {
      core.warning(
        `Report generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      // Continue anyway - report generation failure shouldn't fail the whole action
    }

    const duration = Date.now() - startTime;

    // Set outputs
    const outputs: ActionOutputs = {
      success: true,
      storageType: inputs.storageType,
      databaseLocation: `storage://${inputs.storageType}/${inputs.databaseKey}`,
      metricsCollected: collectionResult.successful,
      duration,
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

    core.info("Track-metrics action completed successfully");

    // Cleanup
    await storage.close();
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    core.setFailed(`Track-metrics action failed: ${errorMessage}`);

    // Set error outputs
    core.setOutput("success", "false");
    core.setOutput("duration", duration.toString());
    core.setOutput("error-code", "ACTION_FAILED");
    core.setOutput("error-message", errorMessage);

    process.exit(1);
  }
}

// Run the action if this file is executed directly
if (import.meta.main) {
  runTrackMetricsAction().catch((error) => {
    core.setFailed(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
