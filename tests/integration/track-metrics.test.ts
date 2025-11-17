import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { runTrackMetricsAction } from "../../src/actions/track-metrics";

describe("track-metrics action integration", () => {
  const testConfigPath = "/tmp/unentropy-track-test.json";
  const testReportPath = "/tmp/test-report.html";
  const originalEnv = process.env;
  let uniqueSuffix: string;

  beforeEach(async () => {
    // Generate unique database name
    uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);

    // Clean up any existing files
    if (existsSync(testConfigPath)) {
      await unlink(testConfigPath);
    }
    if (existsSync(testReportPath)) {
      await unlink(testReportPath);
    }

    // Create test config file
    const testConfig = {
      storage: {
        type: "sqlite-s3",
      },
      metrics: [
        {
          name: "test-metric",
          type: "numeric",
          command: 'echo "42"',
          description: "Test metric",
        },
      ],
    };
    writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    // Mock GitHub Actions inputs and environment
    process.env = {
      ...originalEnv,
      GITHUB_ACTIONS: "true",
      GITHUB_SHA: "abc123def456abc123def456abc123def456abcd",
      GITHUB_REF_NAME: "main",
      GITHUB_RUN_ID: "123456789",
      GITHUB_RUN_NUMBER: "42",
      GITHUB_REPOSITORY: "test/repo",
      "INPUT_STORAGE-TYPE": "sqlite-s3",
      "INPUT_CONFIG-FILE": testConfigPath,
      "INPUT_DATABASE-KEY": `integration-test-${uniqueSuffix}.db`,
      "INPUT_REPORT-NAME": testReportPath,
      "INPUT_S3-ENDPOINT": "http://localhost:9000",
      "INPUT_S3-BUCKET": "unentropy-test",
      "INPUT_S3-REGION": "us-east-1",
      "INPUT_S3-ACCESS-KEY-ID": "minioadmin",
      "INPUT_S3-SECRET-ACCESS-KEY": "minioadmin",
    };
  });

  afterEach(async () => {
    process.env = originalEnv;
    // Clean up test files
    if (existsSync(testConfigPath)) {
      await unlink(testConfigPath);
    }
    if (existsSync(testReportPath)) {
      await unlink(testReportPath);
    }
  });

  test("runs track-metrics action successfully with sqlite-s3 storage", async () => {
    // Run the action directly
    await runTrackMetricsAction();

    // The action should complete without throwing errors
    expect(true).toBe(true);
  });
});
