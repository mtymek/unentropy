import { spawn, type ChildProcess } from "child_process";

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

  return new Promise((resolve) => {
    // Use Node.js spawn with shell command execution
    const proc = spawn("sh", ["-c", command], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    }) as ChildProcess;

    let stdout = "";
    let stderr = "";

    // Set up timeout
    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({
        success: false,
        stdout,
        stderr: stderr || "Command timed out",
        exitCode: -1,
        timedOut: true,
        durationMs: Date.now() - startTime,
      });
    }, timeoutMs);

    // Collect stdout and stderr
    if (proc.stdout) {
      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
    }

    if (proc.stderr) {
      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });
    }

    // Handle process completion
    proc.on("close", (exitCode: number | null) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - startTime;
      const timedOut = exitCode === null && (stderr.includes("Command timed out") || stdout === "");

      resolve({
        success: exitCode === 0 && !timedOut,
        stdout,
        stderr,
        exitCode: exitCode ?? -1,
        timedOut,
        durationMs,
      });
    });

    proc.on("error", (error: Error) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - startTime;

      resolve({
        success: false,
        stdout,
        stderr: error.message,
        exitCode: -1,
        timedOut: false,
        durationMs,
      });
    });
  });
}
