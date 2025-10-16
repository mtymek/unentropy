import { describe, test, expect } from "bun:test";
import { runCommand } from "../../../src/collector/runner";

describe("runCommand", () => {
  test("executes command and returns stdout", async () => {
    const result = await runCommand('echo "test output"', {});

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("test output");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  test("captures stderr when command writes to stderr", async () => {
    const result = await runCommand('echo "error message" >&2', {});

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("");
    expect(result.stderr.trim()).toBe("error message");
    expect(result.exitCode).toBe(0);
  });

  test("captures both stdout and stderr", async () => {
    const result = await runCommand('echo "output" && echo "error" >&2', {});

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("output");
    expect(result.stderr.trim()).toBe("error");
    expect(result.exitCode).toBe(0);
  });

  test("returns failure when command exits with non-zero code", async () => {
    const result = await runCommand("exit 1", {});

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.timedOut).toBe(false);
  });

  test("handles command timeout", async () => {
    const result = await runCommand("sleep 10", {}, 100);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.durationMs).toBeLessThan(200);
  });

  test("uses default timeout of 60000ms", async () => {
    const start = Date.now();
    const result = await runCommand('echo "quick"', {});
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(1000);
  });

  test("passes environment variables to command", async () => {
    const result = await runCommand("echo $CUSTOM_VAR", {
      CUSTOM_VAR: "custom-value",
    });

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("custom-value");
  });

  test("passes multiple environment variables to command", async () => {
    const result = await runCommand('echo "$VAR1-$VAR2"', {
      VAR1: "first",
      VAR2: "second",
    });

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("first-second");
  });

  test("environment variables override existing ones", async () => {
    process.env.TEST_VAR = "original";

    const result = await runCommand("echo $TEST_VAR", {
      TEST_VAR: "overridden",
    });

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("overridden");

    delete process.env.TEST_VAR;
  });

  test("measures command duration accurately", async () => {
    const result = await runCommand("sleep 0.1", {});

    expect(result.success).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(100);
    expect(result.durationMs).toBeLessThan(200);
  });

  test("handles command with special characters in output", async () => {
    const result = await runCommand('echo "test\nwith\nnewlines"', {});

    expect(result.success).toBe(true);
    expect(result.stdout).toContain("\n");
  });

  test("handles empty command output", async () => {
    const result = await runCommand("true", {});

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("handles command that does not exist", async () => {
    const result = await runCommand("nonexistent-command-xyz", {});

    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
  });

  test("handles very long output", async () => {
    const result = await runCommand("seq 1 1000", {});

    expect(result.success).toBe(true);
    expect(result.stdout.split("\n").length).toBeGreaterThan(1000);
  });
});
