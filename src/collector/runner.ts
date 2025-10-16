import { spawn } from "node:child_process";

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
    const child = spawn(command, {
      shell: true,
      env: { ...process.env, ...env },
      timeout: timeoutMs,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1000);
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      const durationMs = Date.now() - startTime;

      resolve({
        success: code === 0 && !timedOut,
        stdout,
        stderr,
        exitCode: code ?? -1,
        timedOut,
        durationMs,
      });
    });

    child.on("error", (error) => {
      clearTimeout(timeoutHandle);
      const durationMs = Date.now() - startTime;

      resolve({
        success: false,
        stdout,
        stderr: stderr + error.message,
        exitCode: -1,
        timedOut,
        durationMs,
      });
    });
  });
}
