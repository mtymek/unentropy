import * as core from "@actions/core";
import * as github from "@actions/github";
import { DefaultArtifactClient } from "@actions/artifact";
import { promises as fs } from "fs";
import { dirname, join } from "path";

interface ActionInputs {
  databaseArtifact: string;
  databasePath: string;
  branchFilter: string;
}

interface ActionOutputs {
  databaseFound: boolean;
  databasePath: string;
  sourceRunId?: string;
}

interface WorkflowRun {
  id: number;
  status: string | null;
  conclusion: string | null;
  head_branch: string | null;
  head_sha: string;
}

interface Artifact {
  id: number;
  name: string;
}

function parseInputs(): ActionInputs {
  // Use core.getInput() for consistent input handling
  const databaseArtifact = core.getInput("database-artifact") || "unentropy-metrics";
  const databasePath = core.getInput("database-path") || "./unentropy-metrics.db";
  const branchFilterInput = core.getInput("branch-filter");
  const branchFilter = branchFilterInput || process.env.GITHUB_REF_NAME || "main";

  // Validate inputs
  if (!/^[a-zA-Z0-9_-]+$/.test(databaseArtifact)) {
    throw new Error(
      `Invalid database-artifact: must match pattern ^[a-zA-Z0-9_-]+$. Got: ${databaseArtifact}`
    );
  }

  if (!databasePath.trim()) {
    throw new Error(`Invalid database-path: cannot be empty`);
  }

  if (!branchFilter.trim()) {
    throw new Error(`Invalid branch-filter: cannot be empty`);
  }

  return {
    databaseArtifact,
    databasePath,
    branchFilter,
  };
}

async function findLatestSuccessfulRun(
  octokit: ReturnType<typeof github.getOctokit>,
  repo: string,
  branch: string
): Promise<WorkflowRun | null> {
  try {
    const [owner, repoName] = repo.split("/");

    if (!owner || !repoName) {
      throw new Error(`Invalid repository format: ${repo}`);
    }

    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo: repoName,
      branch,
      status: "completed",
      conclusion: "success",
      per_page: 10,
    });

    const runs = data.workflow_runs || [];

    // Return most recent successful run
    return runs.length > 0 ? (runs[0] ?? null) : null;
  } catch (error) {
    core.warning(`Error finding workflow runs: ${error}`);
    return null;
  }
}

async function findDatabaseArtifact(
  octokit: ReturnType<typeof github.getOctokit>,
  repo: string,
  runId: number,
  artifactName: string
): Promise<Artifact | null> {
  try {
    const [owner, repoName] = repo.split("/");

    if (!owner || !repoName) {
      throw new Error(`Invalid repository format: ${repo}`);
    }

    const { data } = await octokit.rest.actions.listWorkflowRunArtifacts({
      owner,
      repo: repoName,
      run_id: runId,
    });

    const artifacts = data.artifacts || [];

    // Find the artifact with the specified name
    return artifacts.find((artifact: Artifact) => artifact.name === artifactName) || null;
  } catch (error) {
    core.warning(`Error finding artifacts: ${error}`);
    return null;
  }
}

async function downloadArtifact(artifactId: number, downloadPath: string): Promise<boolean> {
  try {
    // Create directory if it doesn't exist
    const dbDir = dirname(downloadPath);
    await fs.mkdir(dbDir, { recursive: true });

    // Initialize artifact client
    const client = new DefaultArtifactClient();

    // Download artifact using @actions/artifact
    const downloadResponse = await client.downloadArtifact(artifactId, {
      path: dbDir,
    });

    if (!downloadResponse.downloadPath) {
      core.warning(`Failed to download artifact: no download path returned`);
      return false;
    }

    if (downloadResponse.digestMismatch) {
      core.warning(`Artifact digest mismatch detected`);
      return false;
    }

    // The artifact is downloaded to a directory, find the database file
    const downloadedDir = downloadResponse.downloadPath;
    const dbFileName = downloadPath.split("/").pop() || "unentropy-metrics.db";

    // Check if database file exists directly
    try {
      await fs.access(downloadPath);
      return true;
    } catch {
      // Look for the database file in downloaded directory
      const downloadedFiles = await fs.readdir(downloadedDir);
      const dbFile = downloadedFiles.find((f) => f === dbFileName);

      if (dbFile) {
        const sourcePath = join(downloadedDir, dbFile);
        await fs.copyFile(sourcePath, downloadPath);
        return true;
      }
    }

    core.warning(`Database file not found after artifact extraction`);
    return false;
  } catch (error) {
    core.warning(`Error downloading artifact: ${error}`);
    return false;
  }
}

async function setOutputs(outputs: ActionOutputs): Promise<void> {
  // Set outputs using core.setOutput (for logging)
  core.setOutput("database-found", outputs.databaseFound.toString());
  core.setOutput("database-path", outputs.databasePath);

  if (outputs.sourceRunId) {
    core.setOutput("source-run-id", outputs.sourceRunId.toString());
  }

  // Write outputs to file for composite action output capture
  const outputFile = process.argv[2];
  if (outputFile) {
    const fs = await import("fs");
    const outputLines = [
      `database-found=${outputs.databaseFound}`,
      `database-path=${outputs.databasePath}`,
    ];

    if (outputs.sourceRunId) {
      outputLines.push(`source-run-id=${outputs.sourceRunId}`);
    }

    await fs.promises.writeFile(outputFile, outputLines.join("\n"));
  }
}

async function run(): Promise<void> {
  try {
    const inputs = parseInputs();

    // Get required environment variables
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPOSITORY;

    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }

    if (!repo) {
      throw new Error("GITHUB_REPOSITORY environment variable is required");
    }

    // Validate repository format
    if (!/^[^\/]+\/[^\/]+$/.test(repo)) {
      throw new Error(`Invalid GITHUB_REPOSITORY format: expected 'owner/repo', got: ${repo}`);
    }

    core.info(`Searching for database artifact: ${inputs.databaseArtifact}`);
    core.info(`Target branch: ${inputs.branchFilter}`);
    core.info(`Database path: ${inputs.databasePath}`);

    // Initialize GitHub client
    const octokit = github.getOctokit(token);

    // Find the latest successful workflow run
    const latestRun = await findLatestSuccessfulRun(octokit, repo, inputs.branchFilter);

    if (!latestRun) {
      core.info("No previous successful workflow run found (first run scenario)");
      await setOutputs({
        databaseFound: false,
        databasePath: inputs.databasePath,
      });
      return;
    }

    core.info(`Found latest successful run: ${latestRun.id}`);

    // Find the database artifact in that run
    const artifact = await findDatabaseArtifact(
      octokit,
      repo,
      latestRun.id,
      inputs.databaseArtifact
    );

    if (!artifact) {
      core.info(`No '${inputs.databaseArtifact}' artifact found in run ${latestRun.id}`);
      await setOutputs({
        databaseFound: false,
        databasePath: inputs.databasePath,
      });
      return;
    }

    core.info(`Found database artifact: ${artifact.id}`);

    // Download and extract the artifact
    const downloadSuccess = await downloadArtifact(artifact.id, inputs.databasePath);

    if (!downloadSuccess) {
      core.error("Failed to download and extract database artifact");
      await setOutputs({
        databaseFound: false,
        databasePath: inputs.databasePath,
      });
      return;
    }

    core.info(`Successfully downloaded database to: ${inputs.databasePath}`);

    // Set success outputs
    await setOutputs({
      databaseFound: true,
      databasePath: inputs.databasePath,
      sourceRunId: latestRun.id.toString(),
    });
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    process.exit(1);
  }
}

// Export for use in Node.js entrypoint
export { run };

// Run the action
if (require.main === module) {
  run().catch((error) => {
    core.setFailed(`Unhandled error: ${error}`);
    process.exit(1);
  });
}
