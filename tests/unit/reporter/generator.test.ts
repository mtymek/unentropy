import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { DatabaseClient } from "../../../src/database/client";
import {
  getMetricTimeSeries,
  calculateSummaryStats,
  generateReport,
} from "../../../src/reporter/generator";
import fs from "fs";

const TEST_DB_PATH = "/tmp/test-generator.db";

describe("getMetricTimeSeries", () => {
  let db: DatabaseClient;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    db = new DatabaseClient({ path: TEST_DB_PATH });
    await db.initialize();

    const buildId1 = db.insertBuildContext({
      commit_sha: "abc123",
      branch: "main",
      run_id: "1",
      run_number: 1,
      timestamp: "2025-10-01T12:00:00Z",
    });

    const buildId2 = db.insertBuildContext({
      commit_sha: "def456",
      branch: "main",
      run_id: "2",
      run_number: 2,
      timestamp: "2025-10-02T12:00:00Z",
    });

    const buildId3 = db.insertBuildContext({
      commit_sha: "ghi789",
      branch: "main",
      run_id: "3",
      run_number: 3,
      timestamp: "2025-10-03T12:00:00Z",
    });

    const coverageMetric = db.upsertMetricDefinition({
      name: "test-coverage",
      type: "numeric",
      unit: "%",
      description: "Test coverage percentage",
    });

    const statusMetric = db.upsertMetricDefinition({
      name: "build-status",
      type: "label",
      description: "Build status",
    });

    db.insertMetricValue({
      metric_id: coverageMetric.id,
      build_id: buildId1,
      value_numeric: 85.2,
      collected_at: "2025-10-01T12:00:00Z",
    });

    db.insertMetricValue({
      metric_id: coverageMetric.id,
      build_id: buildId2,
      value_numeric: 86.1,
      collected_at: "2025-10-02T12:00:00Z",
    });

    db.insertMetricValue({
      metric_id: coverageMetric.id,
      build_id: buildId3,
      value_numeric: 87.5,
      collected_at: "2025-10-03T12:00:00Z",
    });

    db.insertMetricValue({
      metric_id: statusMetric.id,
      build_id: buildId1,
      value_label: "success",
      collected_at: "2025-10-01T12:00:00Z",
    });

    db.insertMetricValue({
      metric_id: statusMetric.id,
      build_id: buildId2,
      value_label: "success",
      collected_at: "2025-10-02T12:00:00Z",
    });

    db.insertMetricValue({
      metric_id: statusMetric.id,
      build_id: buildId3,
      value_label: "failure",
      collected_at: "2025-10-03T12:00:00Z",
    });
  });

  describe("generateReport - sparse data handling", () => {
    test("marks metrics with fewer than 10 data points as sparse", async () => {
      const dbPath = "/tmp/test-sparse-data.db";
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }

      const db = new DatabaseClient({ path: dbPath });
      await db.initialize();

      db.insertBuildContext({
        commit_sha: "abc123",
        branch: "main",
        run_id: "1",
        run_number: 1,
        timestamp: "2025-10-01T12:00:00Z",
      });

      const sparseMetric = db.upsertMetricDefinition({
        name: "sparse-metric",
        type: "numeric",
        description: "Metric with few data points",
      });

      for (let i = 0; i < 5; i++) {
        const bid = db.insertBuildContext({
          commit_sha: `sha${i}`,
          branch: "main",
          run_id: `run${i}`,
          run_number: i + 1,
          timestamp: `2025-10-0${i + 1}T12:00:00Z`,
        });

        db.insertMetricValue({
          metric_id: sparseMetric.id,
          build_id: bid,
          value_numeric: 50 + i,
          collected_at: `2025-10-0${i + 1}T12:00:00Z`,
        });
      }

      const html = generateReport(db, { repository: "test/repo" });

      expect(html).toContain("Limited data available");
      expect(html).toContain("5 builds");

      db.close();
      fs.unlinkSync(dbPath);
    });

    test("does not mark metrics with 10 or more data points as sparse", async () => {
      const dbPath = "/tmp/test-non-sparse-data.db";
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }

      const db = new DatabaseClient({ path: dbPath });
      await db.initialize();

      const nonSparseMetric = db.upsertMetricDefinition({
        name: "non-sparse-metric",
        type: "numeric",
        description: "Metric with sufficient data points",
      });

      for (let i = 0; i < 12; i++) {
        const bid = db.insertBuildContext({
          commit_sha: `sha${i}`,
          branch: "main",
          run_id: `run${i}`,
          run_number: i + 1,
          timestamp: `2025-10-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
        });

        db.insertMetricValue({
          metric_id: nonSparseMetric.id,
          build_id: bid,
          value_numeric: 50 + i,
          collected_at: `2025-10-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
        });
      }

      const html = generateReport(db, { repository: "test/repo" });

      expect(html).not.toContain("Limited data available");

      db.close();
      fs.unlinkSync(dbPath);
    });
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  test("retrieves time-series data for numeric metric", () => {
    const data = getMetricTimeSeries(db, "test-coverage");

    expect(data).toBeDefined();
    expect(data.metricName).toBe("test-coverage");
    expect(data.metricType).toBe("numeric");
    expect(data.unit).toBe("%");
    expect(data.description).toBe("Test coverage percentage");
    expect(data.dataPoints).toHaveLength(3);
    expect(data.dataPoints[0]?.valueNumeric).toBe(85.2);
    expect(data.dataPoints[1]?.valueNumeric).toBe(86.1);
    expect(data.dataPoints[2]?.valueNumeric).toBe(87.5);
    expect(data.dataPoints[0]?.commitSha).toBe("abc123");
    expect(data.dataPoints[0]?.timestamp).toBe("2025-10-01T12:00:00Z");
  });

  test("retrieves time-series data for label metric", () => {
    const data = getMetricTimeSeries(db, "build-status");

    expect(data).toBeDefined();
    expect(data.metricName).toBe("build-status");
    expect(data.metricType).toBe("label");
    expect(data.dataPoints).toHaveLength(3);
    expect(data.dataPoints[0]?.valueLabel).toBe("success");
    expect(data.dataPoints[1]?.valueLabel).toBe("success");
    expect(data.dataPoints[2]?.valueLabel).toBe("failure");
  });

  test("returns data sorted by timestamp ascending", () => {
    const data = getMetricTimeSeries(db, "test-coverage");

    expect(data.dataPoints[0]?.timestamp).toBe("2025-10-01T12:00:00Z");
    expect(data.dataPoints[1]?.timestamp).toBe("2025-10-02T12:00:00Z");
    expect(data.dataPoints[2]?.timestamp).toBe("2025-10-03T12:00:00Z");
  });

  test("throws error for non-existent metric", () => {
    expect(() => getMetricTimeSeries(db, "non-existent")).toThrow(
      "Metric 'non-existent' not found"
    );
  });

  test("returns empty data points for metric with no values", () => {
    db.upsertMetricDefinition({
      name: "empty-metric",
      type: "numeric",
      description: "No data",
    });

    const data = getMetricTimeSeries(db, "empty-metric");

    expect(data.metricName).toBe("empty-metric");
    expect(data.dataPoints).toHaveLength(0);
  });
});

describe("calculateSummaryStats", () => {
  test("calculates summary statistics for numeric metric", () => {
    const data = {
      metricName: "test-coverage",
      metricType: "numeric" as const,
      unit: "%",
      description: "Test coverage",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: 85.0,
          valueLabel: null,
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
        {
          timestamp: "2025-10-02T12:00:00Z",
          valueNumeric: 90.0,
          valueLabel: null,
          commitSha: "def456",
          branch: "main",
          runNumber: 2,
        },
        {
          timestamp: "2025-10-03T12:00:00Z",
          valueNumeric: 88.0,
          valueLabel: null,
          commitSha: "ghi789",
          branch: "main",
          runNumber: 3,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.latest).toBe(88.0);
    expect(stats.min).toBe(85.0);
    expect(stats.max).toBe(90.0);
    expect(stats.average).toBeCloseTo(87.67, 2);
    expect(stats.trendDirection).toBe("up");
    expect(stats.trendPercent).toBeCloseTo(3.53, 2);
  });

  test("returns null values for label metric", () => {
    const data = {
      metricName: "build-status",
      metricType: "label" as const,
      unit: null,
      description: "Build status",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: null,
          valueLabel: "success",
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.latest).toBeNull();
    expect(stats.min).toBeNull();
    expect(stats.max).toBeNull();
    expect(stats.average).toBeNull();
    expect(stats.trendDirection).toBeNull();
    expect(stats.trendPercent).toBeNull();
  });

  test("returns null values for empty data points", () => {
    const data = {
      metricName: "test-coverage",
      metricType: "numeric" as const,
      unit: "%",
      description: "Test coverage",
      dataPoints: [],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.latest).toBeNull();
    expect(stats.min).toBeNull();
    expect(stats.max).toBeNull();
    expect(stats.average).toBeNull();
    expect(stats.trendDirection).toBeNull();
    expect(stats.trendPercent).toBeNull();
  });

  test("detects downward trend", () => {
    const data = {
      metricName: "bundle-size",
      metricType: "numeric" as const,
      unit: "KB",
      description: "Bundle size",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: 100.0,
          valueLabel: null,
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
        {
          timestamp: "2025-10-02T12:00:00Z",
          valueNumeric: 95.0,
          valueLabel: null,
          commitSha: "def456",
          branch: "main",
          runNumber: 2,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.trendDirection).toBe("down");
    expect(stats.trendPercent).toBeCloseTo(-5.0, 2);
  });

  test("detects stable trend", () => {
    const data = {
      metricName: "metric",
      metricType: "numeric" as const,
      unit: null,
      description: "Metric",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: 100.0,
          valueLabel: null,
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
        {
          timestamp: "2025-10-02T12:00:00Z",
          valueNumeric: 100.0,
          valueLabel: null,
          commitSha: "def456",
          branch: "main",
          runNumber: 2,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.trendDirection).toBe("stable");
    expect(stats.trendPercent).toBe(0);
  });

  test("handles single data point", () => {
    const data = {
      metricName: "metric",
      metricType: "numeric" as const,
      unit: null,
      description: "Metric",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: 42.0,
          valueLabel: null,
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.latest).toBe(42.0);
    expect(stats.min).toBe(42.0);
    expect(stats.max).toBe(42.0);
    expect(stats.average).toBe(42.0);
    expect(stats.trendDirection).toBeNull();
    expect(stats.trendPercent).toBeNull();
  });

  test("filters out null numeric values", () => {
    const data = {
      metricName: "metric",
      metricType: "numeric" as const,
      unit: null,
      description: "Metric",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: null,
          valueLabel: null,
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
        {
          timestamp: "2025-10-02T12:00:00Z",
          valueNumeric: 50.0,
          valueLabel: null,
          commitSha: "def456",
          branch: "main",
          runNumber: 2,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.latest).toBe(50.0);
    expect(stats.min).toBe(50.0);
    expect(stats.max).toBe(50.0);
    expect(stats.average).toBe(50.0);
  });
});
