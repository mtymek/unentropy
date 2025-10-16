export interface BuildContext {
  commit_sha: string;
  branch: string;
  run_id: string;
  run_number: number;
  actor?: string;
  event_name?: string;
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

  return {
    commit_sha: commitSha,
    branch,
    run_id: runId,
    run_number: parsedRunNumber,
    actor: actor || undefined,
    event_name: eventName || undefined,
  };
}
