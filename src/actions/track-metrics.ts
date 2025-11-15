import * as core from "@actions/core";
import { loadConfig } from "../config/loader";
import { createStorageProvider } from "../storage/providers/factory";
import { extractBuildContext } from "../collector/context";

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

    // TODO: Initialize storage provider based on storage type
    // TODO: Implement workflow phases (download, collect, upload, report)
    // TODO: Handle S3 credentials and configuration
    // TODO: Generate and upload reports

    const duration = Date.now() - startTime;

    // Set outputs
    const outputs: ActionOutputs = {
      success: true,
      storageType: inputs.storageType,
      databaseLocation: `storage://${inputs.storageType}/${inputs.databaseKey}`,
      metricsCollected: 0, // TODO: Implement actual collection
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
