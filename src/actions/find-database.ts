import * as core from "@actions/core";
import { promises as fs } from "fs";
import { dirname } from "path";
import { execSync } from "child_process";

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
  status: string;
  conclusion: string | null;
  head_branch: string;
}

interface Artifact {
  id: number;
  name: string;
}

function parseInputs(): ActionInputs {
  const databaseArtifact = core.getInput("database-artifact") || "unentropy-metrics";
  const databasePath = core.getInput("database-path") || "./unentropy-metrics.db";
  const branchFilter = core.getInput("branch-filter") || process.env.GITHUB_REF_NAME || "main";

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
  repo: string,
  branch: string,
  token: string
): Promise<WorkflowRun | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/actions/runs`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
        const rateLimitReset = response.headers.get("x-ratelimit-reset");

        if (rateLimitRemaining === "0") {
          throw new Error(`GitHub API rate limit exceeded. Resets at: ${rateLimitReset}`);
        }
      }

      throw new Error(`Failed to fetch workflow runs: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { workflow_runs?: WorkflowRun[] };
    const runs: WorkflowRun[] = data.workflow_runs || [];

    // Filter for completed successful runs on the specified branch
    const successfulRuns = runs.filter(
      (run: WorkflowRun) =>
        run.status === "completed" && run.conclusion === "success" && run.head_branch === branch
    );

    // Return the most recent successful run
    return successfulRuns.length > 0 ? (successfulRuns[0] ?? null) : null;
  } catch (error) {
    core.warning(`Error finding workflow runs: ${error}`);
    return null;
  }
}

async function findDatabaseArtifact(
  repo: string,
  runId: number,
  artifactName: string,
  token: string
): Promise<Artifact | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs/${runId}/artifacts`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch artifacts: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { artifacts?: Artifact[] };
    const artifacts: Artifact[] = data.artifacts || [];

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

async function setOutputs(outputs: ActionOutputs): Promise<void> {
  core.setOutput("database-found", outputs.databaseFound.toString());
  core.setOutput("database-path", outputs.databasePath);

  if (outputs.sourceRunId) {
    core.setOutput("source-run-id", outputs.sourceRunId.toString());
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

    // Find the latest successful workflow run
    const latestRun = await findLatestSuccessfulRun(repo, inputs.branchFilter, token);

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
    const artifact = await findDatabaseArtifact(repo, latestRun.id, inputs.databaseArtifact, token);

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
