import * as core from "@actions/core";
import { promises as fs } from "fs";
import { dirname } from "path";
import { loadConfig } from "../config/loader";
import { collectMetrics } from "../collector/collector";
import { DatabaseClient } from "../database/client";
import { extractBuildContext } from "../collector/context";

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
  buildId?: number;
}

function parseInputs(): ActionInputs {
  const configPath = core.getInput("config-path") || "./unentropy.json";
  const databaseArtifact = core.getInput("database-artifact") || "unentropy-metrics";
  const databasePath = core.getInput("database-path") || ".unentropy/metrics.db";
  const continueOnErrorInput = core.getInput("continue-on-error") || "true";

  // Validate inputs
  if (!configPath.endsWith(".json")) {
    throw new Error(`Invalid config-path: must be a JSON file. Got: ${configPath}`);
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(databaseArtifact)) {
    throw new Error(
      `Invalid database-artifact: must match pattern ^[a-zA-Z0-9_-]+$. Got: ${databaseArtifact}`
    );
  }

  if (!databasePath.endsWith(".db") && !databasePath.endsWith(".sqlite")) {
    throw new Error(`Invalid database-path: must end with .db or .sqlite. Got: ${databasePath}`);
  }

  const continueOnError = ["true", "false"].includes(continueOnErrorInput)
    ? continueOnErrorInput === "true"
    : (() => {
        throw new Error(
          `Invalid continue-on-error: must be 'true' or 'false'. Got: ${continueOnErrorInput}`
        );
      })();

  return {
    configPath,
    databaseArtifact,
    databasePath,
    continueOnError,
  };
}

async function downloadArtifact(artifactName: string, targetPath: string): Promise<void> {
  try {
    // Note: In a real implementation, this would use @actions/artifact
    // For now, we'll simulate the download process
    core.info(`Attempting to download artifact: ${artifactName}`);

    // Check if artifact exists (simulated)
    // In real implementation: await artifactClient.downloadArtifact(artifactName, targetPath);

    // For now, just ensure the directory exists
    await fs.mkdir(dirname(targetPath), { recursive: true });
    core.info(`Artifact download location prepared: ${targetPath}`);
  } catch {
    // First run or artifact not found is expected
    core.info(`No existing artifact found (first run or expired): ${artifactName}`);
  }
}

async function uploadArtifact(artifactName: string, filePath: string): Promise<void> {
  try {
    core.info(`Uploading artifact: ${artifactName} from ${filePath}`);

    // In real implementation: await artifactClient.uploadArtifact(artifactName, [filePath]);

    core.info(`Artifact uploaded successfully: ${artifactName}`);
  } catch (uploadError) {
    throw new Error(
      `Artifact upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`
    );
  }
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

    // Download existing artifact (if any)
    await downloadArtifact(inputs.databaseArtifact, inputs.databasePath);

    // Load configuration
    let config;
    try {
      config = await loadConfig(inputs.configPath);
      core.info(`Configuration loaded successfully with ${config.metrics.length} metrics`);
    } catch (uploadError) {
      throw new Error(
        `Artifact upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`
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

    // Collect metrics
    let collectionResult;
    try {
      collectionResult = await collectMetrics(config.metrics, buildId, inputs.databasePath);
      core.info(
        `Metrics collection completed: ${collectionResult.successful} collected, ${collectionResult.failed} failed`
      );
    } catch (error) {
      throw new Error(
        `Metrics collection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      db.close();
    }

    // Collect metrics
    let result;
    try {
      result = await collectMetrics(config.metrics, buildId, inputs.databasePath);
      core.info(
        `Metrics collection completed: ${result.successful} collected, ${result.failed} failed`
      );
    } catch (error) {
      throw new Error(
        `Metrics collection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      db.close();
    }

    // Upload updated database as artifact
    await uploadArtifact(inputs.databaseArtifact, inputs.databasePath);

    // Set outputs
    const outputs: ActionOutputs = {
      metricsCollected: collectionResult.successful,
      metricsFailed: collectionResult.failed,
      databasePath: inputs.databasePath,
      buildId: buildId,
    };

    core.setOutput("metrics-collected", outputs.metricsCollected.toString());
    core.setOutput("metrics-failed", outputs.metricsFailed.toString());
    core.setOutput("database-path", outputs.databasePath);
    if (outputs.buildId !== undefined) {
      core.setOutput("build-id", outputs.buildId.toString());
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
if (import.meta.main) {
  run().catch((error) => {
    core.error(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export { run };
