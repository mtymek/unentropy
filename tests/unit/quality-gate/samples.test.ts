import { describe, it, expect, beforeEach } from "bun:test";
import {
  buildMetricSamples,
  calculateBuildsConsidered,
} from "../../../src/quality-gate/samples.js";
import type { MetricSample } from "../../../src/quality-gate/types.js";
import type { MetricsRepository } from "../../../src/storage/repository.js";

describe("buildMetricSamples", () => {
  let mockRepository: MetricsRepository;

  beforeEach(() => {
    mockRepository = {
      getBaselineMetricValues: (name: string) => {
        if (name === "coverage") {
          return [{ value_numeric: 80 }, { value_numeric: 82 }, { value_numeric: 81 }];
        }
        if (name === "bundle-size") {
          return [{ value_numeric: 500 }, { value_numeric: 510 }];
        }
        return [];
      },
    } as unknown as MetricsRepository;
  });

  it("should build samples for numeric metrics", () => {
    const collectedMetrics = [
      {
        definition: {
          name: "coverage",
          type: "numeric" as const,
          unit: "percent",
          description: "Code coverage",
        },
        value_numeric: 85,
      },
    ];

    const samples = buildMetricSamples(collectedMetrics, mockRepository, "main", 20, 90);

    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual({
      name: "coverage",
      unit: "percent",
      type: "numeric",
      baselineValues: [80, 82, 81],
      pullRequestValue: 85,
    });
  });

  it("should filter out label metrics", () => {
    const collectedMetrics = [
      {
        definition: {
          name: "status",
          type: "label" as const,
          description: "Build status",
        },
        value_label: "pass",
      },
      {
        definition: {
          name: "coverage",
          type: "numeric" as const,
          unit: "percent",
          description: "Code coverage",
        },
        value_numeric: 85,
      },
    ];

    const samples = buildMetricSamples(collectedMetrics, mockRepository, "main", 20, 90);

    expect(samples).toHaveLength(1);
    expect(samples[0]?.name).toBe("coverage");
  });

  it("should handle metrics with no baseline data", () => {
    const collectedMetrics = [
      {
        definition: {
          name: "new-metric",
          type: "numeric" as const,
          unit: "count",
          description: "New metric",
        },
        value_numeric: 100,
      },
    ];

    const samples = buildMetricSamples(collectedMetrics, mockRepository, "main", 20, 90);

    expect(samples).toHaveLength(1);
    expect(samples[0]?.baselineValues).toEqual([]);
    expect(samples[0]?.pullRequestValue).toBe(100);
  });

  it("should handle multiple metrics", () => {
    const collectedMetrics = [
      {
        definition: {
          name: "coverage",
          type: "numeric" as const,
          unit: "percent",
          description: "Code coverage",
        },
        value_numeric: 85,
      },
      {
        definition: {
          name: "bundle-size",
          type: "numeric" as const,
          unit: "bytes",
          description: "Bundle size",
        },
        value_numeric: 520,
      },
    ];

    const samples = buildMetricSamples(collectedMetrics, mockRepository, "main", 20, 90);

    expect(samples).toHaveLength(2);
    expect(samples[0]?.name).toBe("coverage");
    expect(samples[1]?.name).toBe("bundle-size");
    expect(samples[1]?.baselineValues).toEqual([500, 510]);
  });

  it("should pass maxBuilds and maxAgeDays to repository", () => {
    let capturedMaxBuilds: number | undefined;
    let capturedMaxAgeDays: number | undefined;

    const mockRepo = {
      getBaselineMetricValues: (
        _name: string,
        _branch: string,
        maxBuilds: number,
        maxAgeDays: number
      ) => {
        capturedMaxBuilds = maxBuilds;
        capturedMaxAgeDays = maxAgeDays;
        return [];
      },
    } as unknown as MetricsRepository;

    const collectedMetrics = [
      {
        definition: {
          name: "coverage",
          type: "numeric" as const,
          unit: "percent",
          description: "Code coverage",
        },
        value_numeric: 85,
      },
    ];

    buildMetricSamples(collectedMetrics, mockRepo, "main", 10, 30);

    expect(capturedMaxBuilds).toBe(10);
    expect(capturedMaxAgeDays).toBe(30);
  });
});

describe("calculateBuildsConsidered", () => {
  it("should return 0 for empty samples", () => {
    const samples: MetricSample[] = [];
    const count = calculateBuildsConsidered(samples);
    expect(count).toBe(0);
  });

  it("should return the length of baseline values for single sample", () => {
    const samples: MetricSample[] = [
      {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValues: [80, 82, 81],
        pullRequestValue: 85,
      },
    ];
    const count = calculateBuildsConsidered(samples);
    expect(count).toBe(3);
  });

  it("should return the maximum baseline length for multiple samples", () => {
    const samples: MetricSample[] = [
      {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValues: [80, 82, 81],
        pullRequestValue: 85,
      },
      {
        name: "bundle-size",
        type: "numeric",
        unit: "bytes",
        baselineValues: [500, 510, 520, 530, 540],
        pullRequestValue: 550,
      },
    ];
    const count = calculateBuildsConsidered(samples);
    expect(count).toBe(5);
  });

  it("should handle samples with empty baseline values", () => {
    const samples: MetricSample[] = [
      {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValues: [],
        pullRequestValue: 85,
      },
      {
        name: "bundle-size",
        type: "numeric",
        unit: "bytes",
        baselineValues: [500, 510],
        pullRequestValue: 520,
      },
    ];
    const count = calculateBuildsConsidered(samples);
    expect(count).toBe(2);
  });

  it("should return 0 when all samples have empty baselines", () => {
    const samples: MetricSample[] = [
      {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValues: [],
        pullRequestValue: 85,
      },
      {
        name: "bundle-size",
        type: "numeric",
        unit: "bytes",
        baselineValues: [],
        pullRequestValue: 520,
      },
    ];
    const count = calculateBuildsConsidered(samples);
    expect(count).toBe(0);
  });
});
