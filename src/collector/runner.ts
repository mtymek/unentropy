import { spawn } from "bun";

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
}

export async function runCommand(
  command: string,
  env: Record<string, string>,
  timeoutMs = 60000
): Promise<CommandResult> {
  const startTime = Date.now();

  try {
    // Use Bun.spawn with shell command execution
    const proc = spawn(["sh", "-c", command], {
      env: { ...process.env, ...env },
      stdout: "pipe",
      stderr: "pipe",
    });

    // Set up timeout using Bun's built-in timeout mechanism
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Command timed out")), timeoutMs);
    });

    // Read stdout and stderr
    const outputPromise = (async () => {
      let stdout = "";
      let stderr = "";

      if (proc.stdout) {
        const reader = proc.stdout.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          stdout += decoder.decode(value);
        }
      }

      if (proc.stderr) {
        const reader = proc.stderr.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          stderr += decoder.decode(value);
        }
      }

      return { stdout, stderr, exitCode: await proc.exited };
    })();

    // Race between command completion and timeout
    const { stdout, stderr, exitCode } = await Promise.race([outputPromise, timeoutPromise]);

    const durationMs = Date.now() - startTime;
    const timedOut = exitCode === null && (stderr.includes("Command timed out") || stdout === "");

    return {
      success: exitCode === 0 && !timedOut,
      stdout,
      stderr,
      exitCode: exitCode ?? -1,
      timedOut,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const timedOut = error instanceof Error && error.message === "Command timed out";

    return {
      success: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: -1,
      timedOut,
      durationMs,
    };
  }
}
