import * as core from "@actions/core";
import * as github from "@actions/github";
import { promises as fs } from "fs";
import { dirname } from "path";
import { execSync } from "child_process";
import { Storage } from "../storage/storage";

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
      status: "success",
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

async function downloadArtifact(
  repo: string,
  artifactId: number,
  downloadPath: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/artifacts/${artifactId}/zip`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download artifact: ${response.status} ${response.statusText}`);
    }

    // Get the zip content
    const zipBuffer = await response.arrayBuffer();

    // Write zip to temporary file
    const tempZipPath = `${downloadPath}.tmp.zip`;
    await fs.writeFile(tempZipPath, new Uint8Array(zipBuffer));

    // Extract the zip (basic extraction - assumes single file)
    const dbDir = dirname(downloadPath);

    // Create directory if it doesn't exist
    await fs.mkdir(dbDir, { recursive: true });

    try {
      execSync(`cd "${dbDir}" && unzip -o "${tempZipPath}"`, { stdio: "pipe" });

      // Check if the database file exists after extraction
      await fs.access(downloadPath);

      // Clean up temporary zip file
      await fs.unlink(tempZipPath);

      return true;
    } catch (extractError) {
      core.warning(`Failed to extract zip: ${extractError}`);
      // Clean up temporary zip file
      try {
        await fs.unlink(tempZipPath);
      } catch {
        // Ignore cleanup errors
      }
      return false;
    }
  } catch (error) {
    core.warning(`Error downloading artifact: ${error}`);
    return false;
  }
}

async function logDatabaseStats(databasePath: string): Promise<void> {
  try {
    const dbClient = new Storage({
      provider: {
        type: "sqlite-local",
        path: databasePath,
        readonly: true,
      },
    });
    await dbClient.ready();

    const buildContexts = dbClient.getAllBuildContexts();
    const metricDefinitions = dbClient.getAllMetricDefinitions();
    const metricValues = dbClient.getAllMetricValues();

    core.info(`Database statistics:`);
    core.info(`- Build contexts: ${buildContexts.length}`);
    core.info(`- Metric definitions: ${metricDefinitions.length}`);
    core.info(`- Total metric values: ${metricValues.length}`);

    if (buildContexts.length > 0) {
      const oldestBuild = buildContexts[0];
      const newestBuild = buildContexts[buildContexts.length - 1];
      if (oldestBuild && newestBuild) {
        core.info(`- Date range: ${oldestBuild.timestamp} to ${newestBuild.timestamp}`);
      }
    }

    if (metricDefinitions.length > 0) {
      const metricNames = metricDefinitions.map((md) => md.name).join(", ");
      core.info(`- Metrics: ${metricNames}`);
    }

    await dbClient.close();
  } catch (error) {
    core.warning(`Failed to analyze database contents: ${error}`);
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
  const outputFile = process.env.GITHUB_ACTIONS === "true" ? process.argv[2] : null;
  if (outputFile) {
    const outputLines = [
      `database-found=${outputs.databaseFound}`,
      `database-path=${outputs.databasePath}`,
    ];

    if (outputs.sourceRunId) {
      outputLines.push(`source-run-id=${outputs.sourceRunId}`);
    }

    await fs.writeFile(outputFile, outputLines.join("\n"));
  }
}

export async function run(): Promise<void> {
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
    const downloadSuccess = await downloadArtifact(repo, artifact.id, inputs.databasePath, token);

    if (!downloadSuccess) {
      core.error("Failed to download and extract database artifact");
      await setOutputs({
        databaseFound: false,
        databasePath: inputs.databasePath,
      });
      return;
    }

    core.info(`Successfully downloaded database to: ${inputs.databasePath}`);

    // Log database statistics for debugging
    await logDatabaseStats(inputs.databasePath);

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

run().catch((error) => {
  core.setFailed(`Unhandled error: ${error}`);
});
