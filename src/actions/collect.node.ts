import * as core from "@actions/core";
import { promises as fs } from "fs";
import { dirname } from "path";
import { DatabaseClient } from "../database/client";
import { loadConfig } from "../config/loader";
import { collectMetrics } from "../collector/collector.node";
import { extractBuildContext } from "../collector/context";
import { DatabaseQueries } from "../database/queries";

interface ActionInputs {
  configPath: string;
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
  const databasePath = core.getInput("database-path") || "./unentropy-metrics.db";
  const continueOnErrorInput = core.getInput("continue-on-error") || "true";

  // Validate inputs
  if (!configPath.endsWith(".json")) {
    throw new Error(`Invalid config-path: must end with .json. Got: ${configPath}`);
  }

  if (!databasePath.endsWith(".db")) {
    throw new Error(`Invalid database-path: must end with .db. Got: ${databasePath}`);
  }

  const continueOnError = continueOnErrorInput.toLowerCase() === "true";

  return {
    configPath,
    databasePath,
    continueOnError,
  };
}

async function ensureDatabaseDirectory(databasePath: string): Promise<void> {
  const dbDir = dirname(databasePath);
  await fs.mkdir(dbDir, { recursive: true });
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

    const buildContext = extractBuildContext();
    const queries = new DatabaseQueries(db);
    const buildId = queries.insertBuildContext({
      ...buildContext,
      timestamp: new Date().toISOString(),
    });
    core.info(`Build context created with ID: ${buildId}`);

    const results = await collectMetrics(config.metrics, buildId, inputs.databasePath);

    const successful = results.successful;
    const failed = results.failed;

    core.info(`Collection completed: ${successful} successful, ${failed} failed`);

    if (failed > 0 && !inputs.continueOnError) {
      const failedMetrics = results.failures.map((f) => f.metricName);
      throw new Error(`Failed to collect metrics: ${failedMetrics.join(", ")}`);
    }

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
