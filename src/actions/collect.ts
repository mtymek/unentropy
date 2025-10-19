import * as core from "@actions/core";
import { promises as fs } from "fs";
import { dirname } from "path";
import { loadConfig } from "../config/loader";
import { DatabaseClient } from "../database/client";
import { extractBuildContext } from "../collector/context";

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

  if (!databasePath.endsWith(".db") && !databasePath.endsWith(".sqlite")) {
    throw new Error(`Invalid database-path: must end with .db or .sqlite. Got: ${databasePath}`);
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
    } catch (configError) {
      throw new Error(
        `Configuration loading failed: ${configError instanceof Error ? configError.message : String(configError)}`
      );
    }

    // Initialize database and get build context
    let db;
    let buildId;
    try {
      db = new DatabaseClient({ path: inputs.databasePath });
      await db.ready();
      core.info("Database initialized successfully");

      // Create build context
      const buildContext = extractBuildContext();
      buildId = db.insertBuildContext({
        commit_sha: buildContext.commit_sha,
        branch: buildContext.branch,
        run_id: buildContext.run_id,
        run_number: buildContext.run_number,
        actor: buildContext.actor,
        event_name: buildContext.event_name,
        timestamp: new Date().toISOString(),
      });
      core.info(`Build context created with ID: ${buildId}`);
    } catch (error) {
      throw new Error(`Database error: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Collect metrics using dynamic import based on runtime
    let collectionResult;
    try {
      const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
      const collectorModule = isGitHubActions
        ? await import("../collector/collector.node")
        : await import("../collector/collector");

      collectionResult = await collectorModule.collectMetrics(
        config.metrics,
        buildId,
        inputs.databasePath
      );
      core.info(
        `Metrics collection completed: ${collectionResult.successful} collected, ${collectionResult.failed} failed`
      );
    } catch (error) {
      throw new Error(
        `Metrics collection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (db) {
        db.close();
      }
    }

    // Set outputs
    const outputs: ActionOutputs = {
      metricsCollected: collectionResult.successful,
      metricsFailed: collectionResult.failed,
      databasePath: inputs.databasePath,
      buildId: buildId.toString(),
    };

    core.setOutput("metrics-collected", outputs.metricsCollected.toString());
    core.setOutput("metrics-failed", outputs.metricsFailed.toString());
    core.setOutput("database-path", outputs.databasePath);
    if (outputs.buildId !== undefined) {
      core.setOutput("build-id", outputs.buildId.toString());
    }

    // Write outputs to file for composite action output capture
    const outputFile = process.env.GITHUB_ACTIONS === "true" ? process.argv[2] : null;
    if (outputFile) {
      const outputLines = [
        `metrics-collected=${outputs.metricsCollected}`,
        `metrics-failed=${outputs.metricsFailed}`,
        `database-path=${outputs.databasePath}`,
      ];

      if (outputs.buildId !== undefined) {
        outputLines.push(`build-id=${outputs.buildId}`);
      }

      await fs.writeFile(outputFile, outputLines.join("\n"));
    }

    // Handle continue-on-error logic
    if (collectionResult.failed > 0 && !inputs.continueOnError) {
      if (collectionResult.successful === 0) {
        core.setFailed("All metrics failed to collect");
        process.exit(2);
      } else {
        core.setFailed(
          `Some metrics failed to collect: ${collectionResult.failed} failed, ${collectionResult.successful} succeeded`
        );
        process.exit(2);
      }
    }

    core.info("Action completed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Run the action
async function main() {
  const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

  if (isGitHubActions || import.meta.main || require.main === module) {
    run().catch((error) => {
      core.error(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
  }
}

main();

export { run };
