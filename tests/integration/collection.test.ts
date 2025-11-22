import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { collectMetrics } from "../../src/collector/collector";
import { Storage } from "../../src/storage/storage";
import type { MetricConfig } from "../../src/config/schema";

describe("End-to-end collection workflow", () => {
  const originalEnv = process.env;
  let storage: Storage;
  let testDbPath: string;

  beforeEach(async () => {
    // Generate unique database name for each test to avoid conflicts
    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    testDbPath = `/tmp/unentropy-collection-${uniqueSuffix}.db`;

    // Clean up any existing file with this path
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }

    storage = new Storage({ type: "sqlite-local", path: testDbPath });
    await storage.initialize();
  });

  afterEach(async () => {
    // Always restore environment
    process.env = originalEnv;

    // Always close storage connection
    if (storage) {
      await storage.close();
    }

    // Always clean up database file
    if (testDbPath && existsSync(testDbPath)) {
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

    const buildContext = {
      commit_sha: "abc123def456abc123def456abc123def456abcd",
      branch: "test-branch",
      run_id: "999",
      run_number: 1,
      actor: "test-user",
      event_name: "push",
      timestamp: new Date().toISOString(),
    };

    const repository = storage.getRepository();
    const result = await collectMetrics(metrics);

    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);

    const buildId = await repository.recordBuild(buildContext, result.collectedMetrics);

    const values = storage.getRepository().queries.getMetricValuesByBuildId(buildId);
    expect(values).toHaveLength(2);

    const coverage = values.find((v) => v.metric_name === "test-coverage");
    expect(coverage).toBeDefined();
    expect(coverage?.value_numeric).toBe(85.5);

    const status = values.find((v) => v.metric_name === "build-status");
    expect(status).toBeDefined();
    expect(status?.value_label).toBe("passing");
  }, 10000); // 10 second timeout

  test("creates metric definitions on first collection", async () => {
    const metrics: MetricConfig[] = [{ name: "new-metric", type: "numeric", command: 'echo "42"' }];

    const db = new Storage({ type: "sqlite-local", path: testDbPath });
    await db.initialize();

    const buildContext = {
      commit_sha: "abc123def456abc123def456abc123def456abcd",
      branch: "test-branch",
      run_id: "999",
      run_number: 1,
      timestamp: new Date().toISOString(),
    };

    const repository = db.getRepository();
    const result = await collectMetrics(metrics);
    await repository.recordBuild(buildContext, result.collectedMetrics);

    const metricDef = db.getRepository().queries.getMetricDefinition("new-metric");
    expect(metricDef).toBeDefined();
    expect(metricDef?.name).toBe("new-metric");
    expect(metricDef?.type).toBe("numeric");
  });

  test("reuses existing metric definitions", async () => {
    const metrics: MetricConfig[] = [
      { name: "existing-metric", type: "numeric", command: 'echo "1"' },
    ];

    // Use unique path for this specific test to avoid conflicts
    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    const testPath = `/tmp/unentropy-reuse-${uniqueSuffix}.db`;
    const db = new Storage({ type: "sqlite-local", path: testPath });
    await db.initialize();

    try {
      const repository = db.getRepository();

      const buildContext1 = {
        commit_sha: "commit1commit1commit1commit1commit1commit1",
        branch: "test-branch",
        run_id: "1",
        run_number: 1,
        timestamp: new Date().toISOString(),
      };

      const result1 = await collectMetrics(metrics);
      await repository.recordBuild(buildContext1, result1.collectedMetrics);

      const buildContext2 = {
        commit_sha: "commit2commit2commit2commit2commit2commit2",
        branch: "test-branch",
        run_id: "2",
        run_number: 2,
        timestamp: new Date().toISOString(),
      };

      const metricsRun2: MetricConfig[] = [
        { name: "existing-metric", type: "numeric", command: 'echo "2"' },
      ];

      const result2 = await collectMetrics(metricsRun2);
      await repository.recordBuild(buildContext2, result2.collectedMetrics);

      const allDefs = db.getRepository().getAllMetricDefinitions();
      const existingMetrics = allDefs.filter((d: { name: string }) => d.name === "existing-metric");
      expect(existingMetrics).toHaveLength(1);

      const values = db.getRepository().queries.getAllMetricValues();
      const existingValues = values.filter(
        (v: { metric_name: string }) => v.metric_name === "existing-metric"
      );
      expect(existingValues).toHaveLength(2);
    } finally {
      await db.close();
      if (existsSync(testPath)) {
        await unlink(testPath);
      }
    }
  }, 10000); // 10 second timeout

  test("handles mixed success and failure gracefully", async () => {
    const metrics: MetricConfig[] = [
      { name: "success1", type: "numeric", command: 'echo "10"' },
      { name: "failure", type: "numeric", command: "exit 1" },
      { name: "success2", type: "label", command: 'echo "ok"' },
    ];

    // Use unique path for this specific test to avoid conflicts
    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    const testPath = `/tmp/unentropy-mixed-${uniqueSuffix}.db`;
    const db = new Storage({ type: "sqlite-local", path: testPath });
    await db.initialize();

    try {
      const buildContext = {
        commit_sha: "abc123def456abc123def456abc123def456abcd",
        branch: "test-branch",
        run_id: "999",
        run_number: 1,
        timestamp: new Date().toISOString(),
      };

      const repository = db.getRepository();
      const result = await collectMetrics(metrics);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.failures[0]?.metricName).toBe("failure");

      const buildId = await repository.recordBuild(buildContext, result.collectedMetrics);

      const values = db.getRepository().queries.getMetricValuesByBuildId(buildId);
      expect(values).toHaveLength(2);
    } finally {
      await db.close();
      if (existsSync(testPath)) {
        await unlink(testPath);
      }
    }
  }, 10000); // 10 second timeout

  test("associates metrics with correct build context", async () => {
    const metrics: MetricConfig[] = [{ name: "metric", type: "numeric", command: 'echo "5"' }];

    // Use unique path for this specific test to avoid conflicts
    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    const testPath = `/tmp/unentropy-context-${uniqueSuffix}.db`;
    const db = new Storage({ type: "sqlite-local", path: testPath });
    await db.initialize();

    try {
      const buildContext = {
        commit_sha: "testcommittestcommittestcommittestcommit1",
        branch: "feature-branch",
        run_id: "12345",
        run_number: 42,
        actor: "developer",
        event_name: "pull_request",
        timestamp: new Date().toISOString(),
      };

      const repository = db.getRepository();
      const result = await collectMetrics(metrics);
      const buildId = await repository.recordBuild(buildContext, result.collectedMetrics);

      const values = db.getRepository().queries.getMetricValuesByBuildId(buildId);
      expect(values).toHaveLength(1);
      expect(values[0]?.build_id).toBe(buildId);
    } finally {
      await db.close();
      if (existsSync(testPath)) {
        await unlink(testPath);
      }
    }
  }, 10000); // 10 second timeout
});

test("stores collection duration for successful metrics", async () => {
  const metrics: MetricConfig[] = [
    { name: "timed-metric", type: "numeric", command: 'echo "100"' },
  ];

  // Use unique path for this specific test to avoid conflicts
  const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  const testPath = `/tmp/unentropy-duration-${uniqueSuffix}.db`;
  const db = new Storage({ type: "sqlite-local", path: testPath });
  await db.initialize();

  try {
    const buildContext = {
      commit_sha: "abc123def456abc123def456abc123def456abcd",
      branch: "test-branch",
      run_id: "999",
      run_number: 1,
      timestamp: new Date().toISOString(),
    };

    const repository = db.getRepository();
    const result = await collectMetrics(metrics);
    const buildId = await repository.recordBuild(buildContext, result.collectedMetrics);

    const values = db.getRepository().queries.getMetricValuesByBuildId(buildId);
    expect(values).toHaveLength(1);
    expect(values[0]?.collection_duration_ms).toBeGreaterThan(0);
  } finally {
    await db.close();
    if (existsSync(testPath)) {
      await unlink(testPath);
    }
  }
}, 10000); // 10 second timeout
