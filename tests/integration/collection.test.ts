import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { collectMetrics } from "../../src/collector/collector";
import { DatabaseClient } from "../../src/database/client";
import type { MetricConfig } from "../../src/config/schema";

describe("End-to-end collection workflow (Bun runtime)", () => {
  const testDbPath = "/tmp/unentropy-integration-test.db";
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.GITHUB_SHA = "abc123def456abc123def456abc123def456abcd";
    process.env.GITHUB_REF = "refs/heads/test-branch";
    process.env.GITHUB_RUN_ID = "999";
    process.env.GITHUB_RUN_NUMBER = "1";
    process.env.GITHUB_ACTOR = "test-user";
    process.env.GITHUB_EVENT_NAME = "push";

    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
  });

  test("collects metrics and stores them in database", async () => {
    const metrics: MetricConfig[] = [
      {
        name: "test-coverage",
        type: "numeric",
        command: 'echo "85.5"',
        description: "Test coverage percentage",
        unit: "%",
      },
      {
        name: "build-status",
        type: "label",
        command: 'echo "passing"',
        description: "Build status",
      },
    ];

    const db = new DatabaseClient({ path: testDbPath });
    await db.initialize();

    const buildId = db.insertBuildContext({
      commit_sha: "abc123def456abc123def456abc123def456abcd",
      branch: "test-branch",
      run_id: "999",
      run_number: 1,
      actor: "test-user",
      event_name: "push",
      timestamp: new Date().toISOString(),
    });

    const result = await collectMetrics(metrics, buildId, testDbPath);

    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);

    const values = db.getMetricValues(buildId);
    expect(values).toHaveLength(2);

    const coverage = values.find((v) => v.metric_name === "test-coverage");
    expect(coverage).toBeDefined();
    expect(coverage?.value_numeric).toBe(85.5);

    const status = values.find((v) => v.metric_name === "build-status");
    expect(status).toBeDefined();
    expect(status?.value_label).toBe("passing");

    db.close();
  });

  test("creates metric definitions on first collection", async () => {
    const metrics: MetricConfig[] = [{ name: "new-metric", type: "numeric", command: 'echo "42"' }];

    const db = new DatabaseClient({ path: testDbPath });
    await db.initialize();

    const buildId = db.insertBuildContext({
      commit_sha: "abc123def456abc123def456abc123def456abcd",
      branch: "test-branch",
      run_id: "999",
      run_number: 1,
      timestamp: new Date().toISOString(),
    });

    await collectMetrics(metrics, buildId, testDbPath);

    const metricDef = db.getMetricDefinition("new-metric");
    expect(metricDef).toBeDefined();
    expect(metricDef?.name).toBe("new-metric");
    expect(metricDef?.type).toBe("numeric");

    db.close();
  });

  test("reuses existing metric definitions", async () => {
    const metrics: MetricConfig[] = [
      { name: "existing-metric", type: "numeric", command: 'echo "1"' },
    ];

    const db = new DatabaseClient({ path: testDbPath });
    await db.initialize();

    const buildId1 = db.insertBuildContext({
      commit_sha: "commit1commit1commit1commit1commit1commit1",
      branch: "test-branch",
      run_id: "1",
      run_number: 1,
      timestamp: new Date().toISOString(),
    });

    await collectMetrics(metrics, buildId1, testDbPath);

    const buildId2 = db.insertBuildContext({
      commit_sha: "commit2commit2commit2commit2commit2commit2",
      branch: "test-branch",
      run_id: "2",
      run_number: 2,
      timestamp: new Date().toISOString(),
    });

    const metricsRun2: MetricConfig[] = [
      { name: "existing-metric", type: "numeric", command: 'echo "2"' },
    ];

    await collectMetrics(metricsRun2, buildId2, testDbPath);

    const allDefs = db.getAllMetricDefinitions();
    const existingMetrics = allDefs.filter((d) => d.name === "existing-metric");
    expect(existingMetrics).toHaveLength(1);

    const values = db.getAllMetricValues();
    const existingValues = values.filter((v) => v.metric_name === "existing-metric");
    expect(existingValues).toHaveLength(2);

    db.close();
  });

  test("handles mixed success and failure gracefully", async () => {
    const metrics: MetricConfig[] = [
      { name: "success1", type: "numeric", command: 'echo "10"' },
      { name: "failure", type: "numeric", command: "exit 1" },
      { name: "success2", type: "label", command: 'echo "ok"' },
    ];

    const db = new DatabaseClient({ path: testDbPath });
    await db.initialize();

    const buildId = db.insertBuildContext({
      commit_sha: "abc123def456abc123def456abc123def456abcd",
      branch: "test-branch",
      run_id: "999",
      run_number: 1,
      timestamp: new Date().toISOString(),
    });

    const result = await collectMetrics(metrics, buildId, testDbPath);

    expect(result.successful).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.failures[0]?.metricName).toBe("failure");

    const values = db.getMetricValues(buildId);
    expect(values).toHaveLength(2);

    db.close();
  });

  test("associates metrics with correct build context", async () => {
    const metrics: MetricConfig[] = [{ name: "metric", type: "numeric", command: 'echo "5"' }];

    const db = new DatabaseClient({ path: testDbPath });
    await db.initialize();

    const buildId = db.insertBuildContext({
      commit_sha: "testcommittestcommittestcommittestcommit1",
      branch: "feature-branch",
      run_id: "12345",
      run_number: 42,
      actor: "developer",
      event_name: "pull_request",
      timestamp: new Date().toISOString(),
    });

    await collectMetrics(metrics, buildId, testDbPath);

    const values = db.getMetricValues(buildId);
    expect(values).toHaveLength(1);
    expect(values[0]?.build_id).toBe(buildId);

    db.close();
  });

  test("stores collection duration for successful metrics", async () => {
    const metrics: MetricConfig[] = [
      { name: "timed-metric", type: "numeric", command: 'echo "100"' },
    ];

    const db = new DatabaseClient({ path: testDbPath });
    await db.initialize();

    const buildId = db.insertBuildContext({
      commit_sha: "abc123def456abc123def456abc123def456abcd",
      branch: "test-branch",
      run_id: "999",
      run_number: 1,
      timestamp: new Date().toISOString(),
    });

    await collectMetrics(metrics, buildId, testDbPath);

    const values = db.getMetricValues(buildId);
    expect(values).toHaveLength(1);
    expect(values[0]?.collection_duration_ms).toBeGreaterThan(0);

    db.close();
  });
});
