import { describe, test, expect } from "bun:test";
import { buildLineChartData, buildBarChartData } from "../../../src/reporter/charts";
import type { NormalizedDataPoint, TimeSeriesData } from "../../../src/reporter/types";

describe("buildLineChartData", () => {
  const createNormalizedData = (
    dataPoints: { timestamp: string; value: number | null; commitSha: string; runNumber: number }[]
  ): NormalizedDataPoint[] => dataPoints;

  test("extracts values from normalized data", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.2, commitSha: "abc1234567890", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", value: 86.1, commitSha: "def4567890123", runNumber: 2 },
      { timestamp: "2025-10-03T12:00:00Z", value: 87.5, commitSha: "ghi7890123456", runNumber: 3 },
    ]);

    const data = buildLineChartData("test-coverage", "Test Coverage", normalizedData);

    expect(data.values).toEqual([85.2, 86.1, 87.5]);
  });

  test("sets id and name correctly", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc1234567890", runNumber: 1 },
    ]);

    const data = buildLineChartData("my-metric-id", "My Metric Name", normalizedData);

    expect(data.id).toBe("my-metric-id");
    expect(data.name).toBe("My Metric Name");
  });

  test("shortens commit SHA to 7 characters", () => {
    const normalizedData = createNormalizedData([
      {
        timestamp: "2025-10-01T12:00:00Z",
        value: 85.0,
        commitSha: "abc1234567890abcdef",
        runNumber: 1,
      },
      {
        timestamp: "2025-10-02T12:00:00Z",
        value: 86.0,
        commitSha: "def4567890123456789",
        runNumber: 2,
      },
    ]);

    const data = buildLineChartData("test-id", "Test", normalizedData);

    expect(data.metadata[0]?.sha).toBe("abc1234");
    expect(data.metadata[1]?.sha).toBe("def4567");
  });

  test("includes run number in metadata", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc1234567890", runNumber: 42 },
    ]);

    const data = buildLineChartData("test-id", "Test", normalizedData);

    expect(data.metadata[0]?.run).toBe(42);
  });

  test("sets metadata to null for null values", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc1234567890", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", value: null, commitSha: "def4567890123", runNumber: 2 },
      { timestamp: "2025-10-03T12:00:00Z", value: 87.0, commitSha: "ghi7890123456", runNumber: 3 },
    ]);

    const data = buildLineChartData("test-id", "Test", normalizedData);

    expect(data.metadata[0]).toEqual({ sha: "abc1234", run: 1 });
    expect(data.metadata[1]).toBeNull();
    expect(data.metadata[2]).toEqual({ sha: "ghi7890", run: 3 });
  });

  test("preserves null values in values array", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc1234567890", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", value: null, commitSha: "def4567890123", runNumber: 2 },
      { timestamp: "2025-10-03T12:00:00Z", value: 87.0, commitSha: "ghi7890123456", runNumber: 3 },
    ]);

    const data = buildLineChartData("test-id", "Test", normalizedData);

    expect(data.values).toEqual([85.0, null, 87.0]);
  });

  test("handles all null values (empty metric)", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: null, commitSha: "abc1234567890", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", value: null, commitSha: "def4567890123", runNumber: 2 },
    ]);

    const data = buildLineChartData("test-id", "Test", normalizedData);

    expect(data.values).toEqual([null, null]);
    expect(data.metadata).toEqual([null, null]);
  });

  test("handles empty normalized data", () => {
    const data = buildLineChartData("test-id", "Test", []);

    expect(data.values).toEqual([]);
    expect(data.metadata).toEqual([]);
  });

  test("handles single data point", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc1234567890", runNumber: 1 },
    ]);

    const data = buildLineChartData("test-id", "Test", normalizedData);

    expect(data.values).toEqual([85.0]);
    expect(data.metadata).toEqual([{ sha: "abc1234", run: 1 }]);
  });
});

describe("buildBarChartData", () => {
  const createLabelTimeSeries = (
    dataPoints: {
      timestamp: string;
      valueLabel: string | null;
      commitSha: string;
      runNumber: number;
    }[]
  ): TimeSeriesData => ({
    metricName: "build-status",
    metricType: "label",
    unit: null,
    description: "Build status",
    dataPoints: dataPoints.map((dp) => ({
      timestamp: dp.timestamp,
      valueNumeric: null,
      valueLabel: dp.valueLabel,
      commitSha: dp.commitSha,
      branch: "main",
      runNumber: dp.runNumber,
    })),
  });

  test("sets id and name correctly", () => {
    const timeSeries = createLabelTimeSeries([
      {
        timestamp: "2025-10-01T12:00:00Z",
        valueLabel: "success",
        commitSha: "abc123",
        runNumber: 1,
      },
    ]);

    const data = buildBarChartData("my-bar-id", "My Bar Name", timeSeries);

    expect(data.id).toBe("my-bar-id");
    expect(data.name).toBe("My Bar Name");
  });

  test("aggregates label occurrences", () => {
    const timeSeries = createLabelTimeSeries([
      {
        timestamp: "2025-10-01T12:00:00Z",
        valueLabel: "success",
        commitSha: "abc123",
        runNumber: 1,
      },
      {
        timestamp: "2025-10-02T12:00:00Z",
        valueLabel: "success",
        commitSha: "def456",
        runNumber: 2,
      },
      {
        timestamp: "2025-10-03T12:00:00Z",
        valueLabel: "failure",
        commitSha: "ghi789",
        runNumber: 3,
      },
    ]);

    const data = buildBarChartData("test-id", "Test", timeSeries);

    const successIndex = data.labels.indexOf("success");
    const failureIndex = data.labels.indexOf("failure");

    expect(data.counts[successIndex]).toBe(2);
    expect(data.counts[failureIndex]).toBe(1);
  });

  test("sorts labels alphabetically", () => {
    const timeSeries = createLabelTimeSeries([
      { timestamp: "2025-10-01T12:00:00Z", valueLabel: "zebra", commitSha: "abc123", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", valueLabel: "apple", commitSha: "def456", runNumber: 2 },
      { timestamp: "2025-10-03T12:00:00Z", valueLabel: "mango", commitSha: "ghi789", runNumber: 3 },
    ]);

    const data = buildBarChartData("test-id", "Test", timeSeries);

    expect(data.labels).toEqual(["apple", "mango", "zebra"]);
  });

  test("counts are aligned with sorted labels", () => {
    const timeSeries = createLabelTimeSeries([
      { timestamp: "2025-10-01T12:00:00Z", valueLabel: "zebra", commitSha: "abc123", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", valueLabel: "zebra", commitSha: "def456", runNumber: 2 },
      { timestamp: "2025-10-03T12:00:00Z", valueLabel: "apple", commitSha: "ghi789", runNumber: 3 },
    ]);

    const data = buildBarChartData("test-id", "Test", timeSeries);

    expect(data.labels).toEqual(["apple", "zebra"]);
    expect(data.counts).toEqual([1, 2]);
  });

  test("ignores null labels", () => {
    const timeSeries = createLabelTimeSeries([
      {
        timestamp: "2025-10-01T12:00:00Z",
        valueLabel: "success",
        commitSha: "abc123",
        runNumber: 1,
      },
      { timestamp: "2025-10-02T12:00:00Z", valueLabel: null, commitSha: "def456", runNumber: 2 },
      {
        timestamp: "2025-10-03T12:00:00Z",
        valueLabel: "success",
        commitSha: "ghi789",
        runNumber: 3,
      },
    ]);

    const data = buildBarChartData("test-id", "Test", timeSeries);

    expect(data.labels).toEqual(["success"]);
    expect(data.counts).toEqual([2]);
  });

  test("handles empty data points", () => {
    const timeSeries: TimeSeriesData = {
      metricName: "build-status",
      metricType: "label",
      unit: null,
      description: "Build status",
      dataPoints: [],
    };

    const data = buildBarChartData("test-id", "Test", timeSeries);

    expect(data.labels).toEqual([]);
    expect(data.counts).toEqual([]);
  });

  test("handles single label", () => {
    const timeSeries = createLabelTimeSeries([
      {
        timestamp: "2025-10-01T12:00:00Z",
        valueLabel: "only-one",
        commitSha: "abc123",
        runNumber: 1,
      },
    ]);

    const data = buildBarChartData("test-id", "Test", timeSeries);

    expect(data.labels).toEqual(["only-one"]);
    expect(data.counts).toEqual([1]);
  });
});
