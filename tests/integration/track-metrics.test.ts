import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { runTrackMetricsAction } from "../../src/actions/track-metrics";

describe("track-metrics action integration", () => {
  const testConfigPath = "/tmp/unentropy-track-test.json";
  const testReportDir = "/tmp/test-report";
  const originalEnv = process.env;
  let uniqueSuffix: string;

  beforeEach(async () => {
    // Generate unique database name
    uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);

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
      "INPUT_REPORT-DIR": testReportDir,
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
    if (existsSync(testReportDir)) {
      await unlink(`${testReportDir}/index.html`);
    }
  });

  test("runs track-metrics action successfully with sqlite-s3 storage", async () => {
    // Run the action directly
    await runTrackMetricsAction();

    // Verify the HTML report was generated
    expect(existsSync(`${testReportDir}/index.html`)).toBe(true);

    // Read and verify the HTML report content
    const html = await Bun.file(`${testReportDir}/index.html`).text();

    // Basic HTML structure assertions
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Unentropy Metrics Report");
    expect(html).toContain("test/repo"); // repository name

    // Verify metric data is present
    expect(html).toContain("test-metric"); // metric name
    expect(html).toContain("Test metric"); // metric description

    // Verify statistics are displayed (for numeric metrics)
    expect(html).toContain("Latest");
    expect(html).toContain("Min");
    expect(html).toContain("Max");
    expect(html).toContain("Trend");

    // Verify the metric data is included in the chart configuration
    expect(html).toContain("chartsData");

    // Verify Chart.js scripts are included
    expect(html).toContain("chart.js");
    expect(html).toContain("chart-test-metric"); // canvas id for the chart

    // Verify Tailwind CSS is loaded
    expect(html).toContain("tailwindcss.com");

    // Verify metric card structure
    expect(html).toContain("metric-card");
    expect(html).toContain("bg-white dark:bg-gray-800");
  });
});
