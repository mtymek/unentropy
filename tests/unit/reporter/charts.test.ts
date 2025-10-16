import { describe, test, expect } from "bun:test";
import { buildChartConfig, type ChartConfig } from "../../../src/reporter/charts";
import type { TimeSeriesData } from "../../../src/reporter/generator";

describe("buildChartConfig - numeric metrics", () => {
  const numericData: TimeSeriesData = {
    metricName: "test-coverage",
    metricType: "numeric",
    unit: "%",
    description: "Test coverage percentage",
    dataPoints: [
      {
        timestamp: "2025-10-01T12:00:00Z",
        valueNumeric: 85.2,
        valueLabel: null,
        commitSha: "abc123",
        branch: "main",
        runNumber: 1,
      },
      {
        timestamp: "2025-10-02T12:00:00Z",
        valueNumeric: 86.1,
        valueLabel: null,
        commitSha: "def456",
        branch: "main",
        runNumber: 2,
      },
      {
        timestamp: "2025-10-03T12:00:00Z",
        valueNumeric: 87.5,
        valueLabel: null,
        commitSha: "ghi789",
        branch: "main",
        runNumber: 3,
      },
    ],
  };

  test("creates line chart config for numeric metrics", () => {
    const config = buildChartConfig(numericData);

    expect(config.type).toBe("line");
    expect(config.data.labels).toHaveLength(3);
    expect(config.data.datasets).toHaveLength(1);
    expect(config.data.datasets[0]!.label).toBe("test-coverage");
  });

  test("includes all data points in correct order", () => {
    const config = buildChartConfig(numericData);

    expect(config.data.labels).toEqual([
      "2025-10-01T12:00:00Z",
      "2025-10-02T12:00:00Z",
      "2025-10-03T12:00:00Z",
    ]);
    expect(config.data.datasets[0]!.data).toEqual([85.2, 86.1, 87.5]);
  });

  test("includes metadata in data points", () => {
    const config = buildChartConfig(numericData);

    expect(config.data.datasets[0]!.metadata).toEqual([
      { commitSha: "abc123", runNumber: 1 },
      { commitSha: "def456", runNumber: 2 },
      { commitSha: "ghi789", runNumber: 3 },
    ]);
  });

  test("sets responsive options", () => {
    const config = buildChartConfig(numericData);

    expect(config.options.responsive).toBe(true);
    expect(config.options.maintainAspectRatio).toBe(false);
  });

  test("configures interaction mode", () => {
    const config = buildChartConfig(numericData);

    expect(config.options.interaction.mode).toBe("index");
    expect(config.options.interaction.intersect).toBe(false);
  });

  test("hides legend", () => {
    const config = buildChartConfig(numericData);

    expect(config.options.plugins.legend.display).toBe(false);
  });

  test("configures time scale for x-axis", () => {
    const config = buildChartConfig(numericData);

    expect(config.options.scales.x!.type).toBe("time");
    expect(config.options.scales.x!.time!.unit).toBe("day");
    expect(config.options.scales.x!.title.display).toBe(true);
    expect(config.options.scales.x!.title.text).toBe("Build Date");
  });

  test("configures y-axis with metric name", () => {
    const config = buildChartConfig(numericData);

    expect(config.options.scales.y.beginAtZero).toBe(true);
    expect(config.options.scales.y.title.display).toBe(true);
    expect(config.options.scales.y.title.text).toBe("test-coverage");
  });

  test("uses blue color theme", () => {
    const config = buildChartConfig(numericData);

    expect(config.data.datasets[0]!.borderColor).toBe("rgb(59, 130, 246)");
    expect(config.data.datasets[0]!.backgroundColor).toBe("rgba(59, 130, 246, 0.1)");
  });

  test("sets line styling properties", () => {
    const config = buildChartConfig(numericData);

    expect(config.data.datasets[0]!.tension).toBe(0.4);
    expect(config.data.datasets[0]!.fill).toBe(true);
    expect(config.data.datasets[0]!.pointRadius).toBe(4);
    expect(config.data.datasets[0]!.pointHoverRadius).toBe(6);
  });
});

describe("buildChartConfig - label metrics", () => {
  const labelData: TimeSeriesData = {
    metricName: "build-status",
    metricType: "label",
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
      {
        timestamp: "2025-10-02T12:00:00Z",
        valueNumeric: null,
        valueLabel: "success",
        commitSha: "def456",
        branch: "main",
        runNumber: 2,
      },
      {
        timestamp: "2025-10-03T12:00:00Z",
        valueNumeric: null,
        valueLabel: "failure",
        commitSha: "ghi789",
        branch: "main",
        runNumber: 3,
      },
    ],
  };

  test("creates bar chart config for label metrics", () => {
    const config = buildChartConfig(labelData);

    expect(config.type).toBe("bar");
    expect(config.data.datasets).toHaveLength(1);
    expect(config.data.datasets[0]!.label).toBe("Occurrences");
  });

  test("aggregates label occurrences", () => {
    const config = buildChartConfig(labelData);

    expect(config.data.labels).toContain("success");
    expect(config.data.labels).toContain("failure");

    const successIndex = config.data.labels.indexOf("success");
    const failureIndex = config.data.labels.indexOf("failure");

    expect(config.data.datasets[0]!.data[successIndex]).toBe(2);
    expect(config.data.datasets[0]!.data[failureIndex]).toBe(1);
  });

  test("uses blue color theme for bars", () => {
    const config = buildChartConfig(labelData);

    expect(config.data.datasets[0]!.backgroundColor).toBe("rgba(59, 130, 246, 0.8)");
    expect(config.data.datasets[0]!.borderColor).toBe("rgb(59, 130, 246)");
    expect(config.data.datasets[0]!.borderWidth).toBe(1);
  });

  test("configures y-axis with integer steps", () => {
    const config = buildChartConfig(labelData);

    expect(config.options.scales.y.beginAtZero).toBe(true);
    expect(config.options.scales.y.ticks!.stepSize).toBe(1);
    expect(config.options.scales.y.title.text).toBe("Count");
  });

  test("hides legend for label charts", () => {
    const config = buildChartConfig(labelData);

    expect(config.options.plugins.legend.display).toBe(false);
  });

  test("sorts labels alphabetically", () => {
    const config = buildChartConfig(labelData);

    const labels = config.data.labels as string[];
    const sortedLabels = [...labels].sort();
    expect(labels).toEqual(sortedLabels);
  });
});
