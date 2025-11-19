export interface BuildContext {
  commit_sha: string;
  branch: string;
  run_id: string;
  run_number: number;
  actor?: string;
  event_name?: string;
  // Additional fields for PR diff functionality
  pull_request_number?: number;
  pull_request_base?: string;
  pull_request_head?: string;
}

export function extractBuildContext(): BuildContext {
  const commitSha = process.env.GITHUB_SHA;
  const ref = process.env.GITHUB_REF;
  const runId = process.env.GITHUB_RUN_ID;
  const runNumber = process.env.GITHUB_RUN_NUMBER;
  const actor = process.env.GITHUB_ACTOR;
  const eventName = process.env.GITHUB_EVENT_NAME;

  if (!commitSha) {
    throw new Error("Required environment variable GITHUB_SHA is missing");
  }

  if (!ref) {
    throw new Error("Required environment variable GITHUB_REF is missing");
  }

  if (!runId) {
    throw new Error("Required environment variable GITHUB_RUN_ID is missing");
  }

  if (!runNumber) {
    throw new Error("Required environment variable GITHUB_RUN_NUMBER is missing");
  }

  const parsedRunNumber = parseInt(runNumber, 10);
  if (isNaN(parsedRunNumber)) {
    throw new Error("GITHUB_RUN_NUMBER must be a valid integer, got: " + runNumber);
  }

  let branch = ref;
  if (ref.startsWith("refs/heads/")) {
    branch = ref.substring("refs/heads/".length);
  } else if (ref.startsWith("refs/tags/")) {
    branch = ref.substring("refs/tags/".length);
  }

  // Extract PR-specific fields for diff functionality
  let pullRequestNumber: number | undefined;
  let pullRequestBase: string | undefined;
  let pullRequestHead: string | undefined;

  if (eventName === "pull_request") {
    // For pull request events, GitHub Actions provides these environment variables:
    // GITHUB_REF: refs/pull/123/merge
    // GITHUB_HEAD_REF: branch name of the PR head
    // GITHUB_BASE_REF: branch name of the PR base
    if (ref) {
      const prNumberMatch = ref.match(/^refs\/pull\/(\d+)\/merge$/);
      if (prNumberMatch && prNumberMatch[1]) {
        pullRequestNumber = parseInt(prNumberMatch[1], 10);
      }
    }
    pullRequestBase = process.env.GITHUB_BASE_REF;
    pullRequestHead = process.env.GITHUB_HEAD_REF;
  }

  return {
    commit_sha: commitSha,
    branch,
    run_id: runId,
    run_number: parsedRunNumber,
    actor: actor || undefined,
    event_name: eventName || undefined,
    pull_request_number: pullRequestNumber,
    pull_request_base: pullRequestBase,
    pull_request_head: pullRequestHead,
  };
}
