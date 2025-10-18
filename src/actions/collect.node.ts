import * as core from "@actions/core";
import { promises as fs } from "fs";
import { dirname } from "path";
import { DatabaseClient } from "../database/client";
import { loadConfig } from "../config/loader";
import { collectMetrics } from "../collector/collector.node";

interface ActionInputs {
  configPath: string;
  databaseArtifact: string;
  databasePath: string;
  continueOnError: boolean;
}

interface ActionOutputs {
  metricsCollected: number;
  metricsFailed: number;
  databasePath: string;
  buildId?: string;
}

function parseInputs(): ActionInputs {
  const configPath = core.getInput("config-path") || "./unentropy.json";
  const databaseArtifact = core.getInput("database-artifact") || "unentropy-metrics";
  const databasePath = core.getInput("database-path") || ".unentropy/metrics.db";
  const continueOnErrorInput = core.getInput("continue-on-error") || "true";

  // Validate inputs
  if (!configPath.endsWith(".json")) {
    throw new Error(`Invalid config-path: must end with .json. Got: ${configPath}`);
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(databaseArtifact)) {
    throw new Error(
      `Invalid database-artifact: must match pattern ^[a-zA-Z0-9_-]+$. Got: ${databaseArtifact}`
    );
  }

  if (!databasePath.endsWith(".db")) {
    throw new Error(`Invalid database-path: must end with .db. Got: ${databasePath}`);
  }

  const continueOnError = continueOnErrorInput.toLowerCase() === "true";

  return {
    configPath,
    databaseArtifact,
    databasePath,
    continueOnError,
  };
}

async function ensureDatabaseDirectory(databasePath: string): Promise<void> {
  const dbDir = dirname(databasePath);
  await fs.mkdir(dbDir, { recursive: true });
}

async function uploadArtifact(artifactName: string, filePath: string): Promise<void> {
  try {
    core.info(`Uploading artifact: ${artifactName} from ${filePath}`);

    // In real implementation: await artifactClient.uploadArtifact(artifactName, [filePath], rootDir);
    core.info(`Artifact upload simulated for: ${filePath}`);
  } catch (error) {
    throw new Error(
      `Artifact upload failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function run(): Promise<void> {
  try {
    // Parse and validate inputs
    const inputs = parseInputs();
    core.info(`Starting metrics collection with config: ${inputs.configPath}`);

    // Ensure database directory exists
    await ensureDatabaseDirectory(inputs.databasePath);

    // Load configuration
    let config;
    try {
      config = await loadConfig(inputs.configPath);
      core.info(`Configuration loaded successfully with ${config.metrics.length} metrics`);
    } catch (error) {
      throw new Error(
        `Configuration error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Initialize database
    let db;
    try {
      db = new DatabaseClient({ path: inputs.databasePath });
      await db.ready();
      core.info("Database initialized successfully");
    } catch (error) {
      throw new Error(`Database error: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Get build context and calculate next build ID
    const existingBuildContexts = db.getAllBuildContexts();
    const buildId =
      existingBuildContexts.length > 0
        ? (existingBuildContexts[existingBuildContexts.length - 1]?.id ?? 0) + 1
        : 1;

    // Collect metrics
    const results = await collectMetrics(config.metrics, buildId, inputs.databasePath);

    const successful = results.successful;
    const failed = results.failed;

    core.info(`Collection completed: ${successful} successful, ${failed} failed`);

    if (failed > 0 && !inputs.continueOnError) {
      const failedMetrics = results.failures.map((f) => f.metricName);
      throw new Error(`Failed to collect metrics: ${failedMetrics.join(", ")}`);
    }

    // Upload database as artifact
    await uploadArtifact(inputs.databaseArtifact, inputs.databasePath);

    // Get build context for output
    const buildContexts = db.getAllBuildContexts();
    const latestBuild = buildContexts[buildContexts.length - 1];

    // Set outputs
    const outputs: ActionOutputs = {
      metricsCollected: successful,
      metricsFailed: failed,
      databasePath: inputs.databasePath,
      buildId: latestBuild?.id.toString(),
    };

    core.setOutput("metrics-collected", outputs.metricsCollected.toString());
    core.setOutput("metrics-failed", outputs.metricsFailed.toString());
    core.setOutput("database-path", outputs.databasePath);
    if (outputs.buildId) {
      core.setOutput("build-id", outputs.buildId);
    }

    core.info("Action completed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Run the action
if (import.meta.main) {
  run().catch((error) => {
    core.error(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export { run };
