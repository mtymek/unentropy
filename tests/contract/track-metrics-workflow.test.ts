import { test, expect, describe, beforeEach, mock } from "bun:test";

describe("Track-Metrics Workflow Contract Tests", () => {
  let mockCore: any;

  beforeEach(() => {
    // Mock @actions/core
    mockCore = {
      getInput: mock((name: string) => {
        const defaults: Record<string, string> = {
          "storage-type": "sqlite-local",
          "config-file": "unentropy.json",
          "database-key": "unentropy-metrics.db",
          "report-name": "unentropy-report.html",
        };
        return defaults[name] || "";
      }),
      setOutput: mock(() => {}),
      setFailed: mock(() => {}),
      info: mock(() => {}),
      error: mock(() => {}),
      warning: mock(() => {}),
      debug: mock(() => {}),
    };

    mock.module("@actions/core", () => mockCore);
  });

  test("workflow contract: sqlite-local storage with minimal inputs", async () => {
    // Mock the config loader to return our test config
    mock.module("../../src/config/loader", () => ({
      loadConfig: () =>
        Promise.resolve({
          storage: { type: "sqlite-local" },
          metrics: [], // No metrics to avoid collection issues
        }),
    }));

    const { runTrackMetricsAction } = await import("../../src/actions/track-metrics");

    await runTrackMetricsAction();

    // Verify expected outputs
    expect(mockCore.setOutput).toHaveBeenCalledWith("success", "true");
    expect(mockCore.setOutput).toHaveBeenCalledWith("storage-type", "sqlite-local");
    expect(mockCore.setOutput).toHaveBeenCalledWith(
      "database-location",
      expect.stringContaining("sqlite-local")
    );
    expect(mockCore.setOutput).toHaveBeenCalledWith("duration", expect.any(String));
    expect(mockCore.setOutput).toHaveBeenCalledWith("metrics-collected", "0"); // No metrics processed
  });
});
