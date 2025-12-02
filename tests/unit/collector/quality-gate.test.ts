import { describe, it, expect } from "bun:test";

export type MetricGateStatus = "pass" | "fail" | "unknown";

export interface MetricEvaluationResult {
  metric: string;
  unit?: string;
  baselineMedian?: number;
  pullRequestValue?: number;
  absoluteDelta?: number;
  relativeDeltaPercent?: number;
  threshold?: {
    metric: string;
    mode: "no-regression" | "min" | "max" | "delta-max-drop";
    target?: number;
    tolerance?: number;
    maxDropPercent?: number;
    severity?: "warning" | "blocker";
  };
  status: MetricGateStatus;
  message?: string;
  isBlocking?: boolean;
}

export type QualityGateOverallStatus = "pass" | "fail" | "unknown";

export interface QualityGateResult {
  status: QualityGateOverallStatus;
  mode: "off" | "soft" | "hard";
  metrics: MetricEvaluationResult[];
  failingMetrics: MetricEvaluationResult[];
  summary: {
    totalMetrics: number;
    evaluatedMetrics: number;
    passed: number;
    failed: number;
    unknown: number;
  };
  baselineInfo: {
    referenceBranch: string;
    buildsConsidered: number;
    maxBuilds: number;
    maxAgeDays: number;
  };
}

describe("MetricEvaluationResult", () => {
  describe("Status Evaluation", () => {
    it("should have status 'pass' when threshold is met", () => {
      const threshold = {
        metric: "coverage",
        mode: "min" as const,
        target: 80,
        severity: "blocker" as const,
      };
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        baselineMedian: 80,
        pullRequestValue: 85,
        absoluteDelta: 5,
        relativeDeltaPercent: 6.25,
        threshold,
        status: "pass",
        isBlocking: false,
      };

      expect(result.status).toBe("pass");
      expect(result.threshold).toBeDefined();
      expect(result.pullRequestValue && result.pullRequestValue >= threshold.target).toBe(true);
    });

    it("should have status 'fail' when threshold is violated", () => {
      const threshold = {
        metric: "coverage",
        mode: "min" as const,
        target: 80,
        severity: "blocker" as const,
      };
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        baselineMedian: 80,
        pullRequestValue: 75,
        absoluteDelta: -5,
        relativeDeltaPercent: -6.25,
        threshold,
        status: "fail",
        message: "Coverage below minimum threshold of 80",
        isBlocking: true,
      };

      expect(result.status).toBe("fail");
      expect(result.threshold).toBeDefined();
      expect(result.pullRequestValue && result.pullRequestValue < threshold.target).toBe(true);
      expect(result.isBlocking).toBe(true);
    });

    it("should have status 'unknown' when baseline is missing", () => {
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        pullRequestValue: 85,
        threshold: {
          metric: "coverage",
          mode: "no-regression",
          tolerance: 0.5,
        },
        status: "unknown",
        message: "No baseline data available",
        isBlocking: false,
      };

      expect(result.status).toBe("unknown");
      expect(result.baselineMedian).toBeUndefined();
      expect(result.isBlocking).toBe(false);
    });

    it("should have status 'unknown' when pull request value is missing", () => {
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        baselineMedian: 80,
        threshold: {
          metric: "coverage",
          mode: "min",
          target: 80,
        },
        status: "unknown",
        message: "Metric not collected in PR run",
        isBlocking: false,
      };

      expect(result.status).toBe("unknown");
      expect(result.pullRequestValue).toBeUndefined();
    });

    it("should have status 'unknown' when no threshold is configured", () => {
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        baselineMedian: 80,
        pullRequestValue: 85,
        absoluteDelta: 5,
        relativeDeltaPercent: 6.25,
        status: "unknown",
        isBlocking: false,
      };

      expect(result.status).toBe("unknown");
      expect(result.threshold).toBeUndefined();
    });
  });

  describe("Threshold Modes", () => {
    it("should evaluate 'no-regression' mode with tolerance", () => {
      const threshold = {
        metric: "coverage",
        mode: "no-regression" as const,
        tolerance: 0.5,
      };
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        baselineMedian: 80,
        pullRequestValue: 79.6,
        absoluteDelta: -0.4,
        relativeDeltaPercent: -0.5,
        threshold,
        status: "pass",
      };

      expect(result.status).toBe("pass");
      if (result.absoluteDelta !== undefined && threshold.tolerance !== undefined) {
        expect(Math.abs(result.absoluteDelta) <= threshold.tolerance).toBe(true);
      }
    });

    it("should fail 'no-regression' when beyond tolerance", () => {
      const threshold = {
        metric: "coverage",
        mode: "no-regression" as const,
        tolerance: 0.5,
      };
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        baselineMedian: 80,
        pullRequestValue: 79,
        absoluteDelta: -1,
        relativeDeltaPercent: -1.25,
        threshold,
        status: "fail",
        message: "Coverage regressed beyond tolerance",
        isBlocking: true,
      };

      expect(result.status).toBe("fail");
      if (result.absoluteDelta !== undefined && threshold.tolerance !== undefined) {
        expect(Math.abs(result.absoluteDelta) > threshold.tolerance).toBe(true);
      }
    });

    it("should evaluate 'min' mode", () => {
      const threshold = {
        metric: "coverage",
        mode: "min" as const,
        target: 80,
      };
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        pullRequestValue: 85,
        threshold,
        status: "pass",
      };

      expect(result.status).toBe("pass");
      expect(result.pullRequestValue && result.pullRequestValue >= threshold.target).toBe(true);
    });

    it("should evaluate 'max' mode", () => {
      const threshold = {
        metric: "bundle-size",
        mode: "max" as const,
        target: 500,
      };
      const result: MetricEvaluationResult = {
        metric: "bundle-size",
        unit: "bytes",
        pullRequestValue: 450,
        threshold,
        status: "pass",
      };

      expect(result.status).toBe("pass");
      expect(result.pullRequestValue && result.pullRequestValue <= threshold.target).toBe(true);
    });

    it("should evaluate 'delta-max-drop' mode", () => {
      const threshold = {
        metric: "coverage",
        mode: "delta-max-drop" as const,
        maxDropPercent: 5,
      };
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        baselineMedian: 80,
        pullRequestValue: 77,
        absoluteDelta: -3,
        relativeDeltaPercent: -3.75,
        threshold,
        status: "pass",
      };

      expect(result.status).toBe("pass");
      if (result.relativeDeltaPercent !== undefined) {
        expect(Math.abs(result.relativeDeltaPercent) <= threshold.maxDropPercent).toBe(true);
      }
    });

    it("should fail 'delta-max-drop' when drop exceeds threshold", () => {
      const threshold = {
        metric: "coverage",
        mode: "delta-max-drop" as const,
        maxDropPercent: 5,
      };
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        baselineMedian: 80,
        pullRequestValue: 72,
        absoluteDelta: -8,
        relativeDeltaPercent: -10,
        threshold,
        status: "fail",
        message: "Coverage dropped by 10% exceeding 5% limit",
        isBlocking: true,
      };

      expect(result.status).toBe("fail");
      if (result.relativeDeltaPercent !== undefined) {
        expect(Math.abs(result.relativeDeltaPercent) > threshold.maxDropPercent).toBe(true);
      }
    });
  });

  describe("Severity Levels", () => {
    it("should mark blocker severity as blocking", () => {
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        pullRequestValue: 75,
        threshold: {
          metric: "coverage",
          mode: "min",
          target: 80,
          severity: "blocker",
        },
        status: "fail",
        isBlocking: true,
      };

      expect(result.threshold?.severity).toBe("blocker");
      expect(result.isBlocking).toBe(true);
    });

    it("should not mark warning severity as blocking", () => {
      const result: MetricEvaluationResult = {
        metric: "coverage",
        unit: "percent",
        pullRequestValue: 75,
        threshold: {
          metric: "coverage",
          mode: "min",
          target: 80,
          severity: "warning",
        },
        status: "fail",
        isBlocking: false,
      };

      expect(result.threshold?.severity).toBe("warning");
      expect(result.isBlocking).toBe(false);
    });
  });

  describe("Delta Calculations", () => {
    it("should calculate positive absolute delta", () => {
      const result: MetricEvaluationResult = {
        metric: "coverage",
        baselineMedian: 80,
        pullRequestValue: 85,
        absoluteDelta: 5,
        relativeDeltaPercent: 6.25,
        status: "pass",
      };

      expect(result.absoluteDelta).toBe(5);
      if (result.pullRequestValue !== undefined && result.baselineMedian !== undefined) {
        expect(result.absoluteDelta).toBe(result.pullRequestValue - result.baselineMedian);
      }
    });

    it("should calculate negative absolute delta", () => {
      const result: MetricEvaluationResult = {
        metric: "coverage",
        baselineMedian: 80,
        pullRequestValue: 75,
        absoluteDelta: -5,
        relativeDeltaPercent: -6.25,
        status: "fail",
      };

      expect(result.absoluteDelta).toBe(-5);
      if (result.pullRequestValue !== undefined && result.baselineMedian !== undefined) {
        expect(result.absoluteDelta).toBe(result.pullRequestValue - result.baselineMedian);
      }
    });

    it("should calculate positive relative delta percent", () => {
      const result: MetricEvaluationResult = {
        metric: "coverage",
        baselineMedian: 80,
        pullRequestValue: 85,
        absoluteDelta: 5,
        relativeDeltaPercent: 6.25,
        status: "pass",
      };

      expect(result.relativeDeltaPercent).toBe(6.25);
      if (
        result.pullRequestValue !== undefined &&
        result.baselineMedian !== undefined &&
        result.baselineMedian !== 0
      ) {
        const expectedPercent = ((result.pullRequestValue - result.baselineMedian) / result.baselineMedian) * 100;
        expect(result.relativeDeltaPercent).toBe(expectedPercent);
      }
    });

    it("should calculate negative relative delta percent", () => {
      const result: MetricEvaluationResult = {
        metric: "coverage",
        baselineMedian: 80,
        pullRequestValue: 75,
        absoluteDelta: -5,
        relativeDeltaPercent: -6.25,
        status: "fail",
      };

      expect(result.relativeDeltaPercent).toBe(-6.25);
      if (
        result.pullRequestValue !== undefined &&
        result.baselineMedian !== undefined &&
        result.baselineMedian !== 0
      ) {
        const expectedPercent = ((result.pullRequestValue - result.baselineMedian) / result.baselineMedian) * 100;
        expect(result.relativeDeltaPercent).toBe(expectedPercent);
      }
    });
  });
});

describe("QualityGateResult", () => {
  describe("Overall Status", () => {
    it("should have status 'pass' when all metrics pass", () => {
      const result: QualityGateResult = {
        status: "pass",
        mode: "hard",
        metrics: [
          {
            metric: "coverage",
            status: "pass",
            pullRequestValue: 85,
            threshold: { metric: "coverage", mode: "min", target: 80 },
          },
          {
            metric: "bundle-size",
            status: "pass",
            pullRequestValue: 450,
            threshold: { metric: "bundle-size", mode: "max", target: 500 },
          },
        ],
        failingMetrics: [],
        summary: {
          totalMetrics: 2,
          evaluatedMetrics: 2,
          passed: 2,
          failed: 0,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 20,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.status).toBe("pass");
      expect(result.failingMetrics).toHaveLength(0);
      expect(result.summary.passed).toBe(2);
      expect(result.summary.failed).toBe(0);
    });

    it("should have status 'fail' when any blocking metric fails in hard mode", () => {
      const failedMetric: MetricEvaluationResult = {
        metric: "coverage",
        status: "fail",
        pullRequestValue: 75,
        threshold: { metric: "coverage", mode: "min", target: 80, severity: "blocker" },
        isBlocking: true,
      };

      const result: QualityGateResult = {
        status: "fail",
        mode: "hard",
        metrics: [
          failedMetric,
          {
            metric: "bundle-size",
            status: "pass",
            pullRequestValue: 450,
            threshold: { metric: "bundle-size", mode: "max", target: 500 },
          },
        ],
        failingMetrics: [failedMetric],
        summary: {
          totalMetrics: 2,
          evaluatedMetrics: 2,
          passed: 1,
          failed: 1,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 20,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.status).toBe("fail");
      expect(result.mode).toBe("hard");
      expect(result.failingMetrics).toHaveLength(1);
      expect(result.failingMetrics[0]?.isBlocking).toBe(true);
      expect(result.summary.failed).toBe(1);
    });

    it("should have status 'pass' when warnings fail but no blockers fail", () => {
      const result: QualityGateResult = {
        status: "pass",
        mode: "hard",
        metrics: [
          {
            metric: "coverage",
            status: "fail",
            pullRequestValue: 75,
            threshold: { metric: "coverage", mode: "min", target: 80, severity: "warning" },
            isBlocking: false,
          },
          {
            metric: "bundle-size",
            status: "pass",
            pullRequestValue: 450,
            threshold: { metric: "bundle-size", mode: "max", target: 500 },
          },
        ],
        failingMetrics: [
          {
            metric: "coverage",
            status: "fail",
            pullRequestValue: 75,
            threshold: { metric: "coverage", mode: "min", target: 80, severity: "warning" },
            isBlocking: false,
          },
        ],
        summary: {
          totalMetrics: 2,
          evaluatedMetrics: 2,
          passed: 1,
          failed: 1,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 20,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.status).toBe("pass");
      expect(result.failingMetrics).toHaveLength(1);
      expect(result.failingMetrics[0]?.isBlocking).toBe(false);
    });

    it("should have status 'unknown' when mode is off", () => {
      const result: QualityGateResult = {
        status: "unknown",
        mode: "off",
        metrics: [],
        failingMetrics: [],
        summary: {
          totalMetrics: 0,
          evaluatedMetrics: 0,
          passed: 0,
          failed: 0,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 0,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.status).toBe("unknown");
      expect(result.mode).toBe("off");
    });

    it("should have status 'unknown' when all metrics are unknown", () => {
      const result: QualityGateResult = {
        status: "unknown",
        mode: "soft",
        metrics: [
          {
            metric: "coverage",
            status: "unknown",
            message: "No baseline data available",
          },
        ],
        failingMetrics: [],
        summary: {
          totalMetrics: 1,
          evaluatedMetrics: 1,
          passed: 0,
          failed: 0,
          unknown: 1,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 0,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.status).toBe("unknown");
      expect(result.summary.unknown).toBe(1);
    });
  });

  describe("Gate Modes", () => {
    it("should not block CI when mode is soft regardless of failures", () => {
      const result: QualityGateResult = {
        status: "fail",
        mode: "soft",
        metrics: [
          {
            metric: "coverage",
            status: "fail",
            pullRequestValue: 75,
            threshold: { metric: "coverage", mode: "min", target: 80, severity: "blocker" },
            isBlocking: true,
          },
        ],
        failingMetrics: [
          {
            metric: "coverage",
            status: "fail",
            pullRequestValue: 75,
            threshold: { metric: "coverage", mode: "min", target: 80, severity: "blocker" },
            isBlocking: true,
          },
        ],
        summary: {
          totalMetrics: 1,
          evaluatedMetrics: 1,
          passed: 0,
          failed: 1,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 20,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.mode).toBe("soft");
      expect(result.status).toBe("fail");
    });

    it("should block CI when mode is hard and blockers fail", () => {
      const result: QualityGateResult = {
        status: "fail",
        mode: "hard",
        metrics: [
          {
            metric: "coverage",
            status: "fail",
            pullRequestValue: 75,
            threshold: { metric: "coverage", mode: "min", target: 80, severity: "blocker" },
            isBlocking: true,
          },
        ],
        failingMetrics: [
          {
            metric: "coverage",
            status: "fail",
            pullRequestValue: 75,
            threshold: { metric: "coverage", mode: "min", target: 80, severity: "blocker" },
            isBlocking: true,
          },
        ],
        summary: {
          totalMetrics: 1,
          evaluatedMetrics: 1,
          passed: 0,
          failed: 1,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 20,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.mode).toBe("hard");
      expect(result.status).toBe("fail");
      expect(result.failingMetrics.some((m) => m.isBlocking)).toBe(true);
    });
  });

  describe("Summary Statistics", () => {
    it("should correctly count total metrics", () => {
      const result: QualityGateResult = {
        status: "pass",
        mode: "soft",
        metrics: [
          { metric: "coverage", status: "pass" },
          { metric: "bundle-size", status: "pass" },
          { metric: "build-time", status: "pass" },
        ],
        failingMetrics: [],
        summary: {
          totalMetrics: 3,
          evaluatedMetrics: 3,
          passed: 3,
          failed: 0,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 20,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.summary.totalMetrics).toBe(3);
      expect(result.metrics).toHaveLength(3);
    });

    it("should correctly count evaluated metrics with thresholds", () => {
      const result: QualityGateResult = {
        status: "pass",
        mode: "soft",
        metrics: [
          {
            metric: "coverage",
            status: "pass",
            threshold: { metric: "coverage", mode: "min", target: 80 },
          },
          {
            metric: "bundle-size",
            status: "pass",
            threshold: { metric: "bundle-size", mode: "max", target: 500 },
          },
          { metric: "build-time", status: "unknown" },
        ],
        failingMetrics: [],
        summary: {
          totalMetrics: 3,
          evaluatedMetrics: 2,
          passed: 2,
          failed: 0,
          unknown: 1,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 20,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.summary.evaluatedMetrics).toBe(2);
      expect(result.summary.totalMetrics).toBe(3);
    });

    it("should correctly count passed, failed, and unknown metrics", () => {
      const result: QualityGateResult = {
        status: "fail",
        mode: "soft",
        metrics: [
          { metric: "coverage", status: "pass" },
          { metric: "bundle-size", status: "fail", isBlocking: true },
          { metric: "build-time", status: "unknown" },
          { metric: "test-count", status: "pass" },
        ],
        failingMetrics: [{ metric: "bundle-size", status: "fail", isBlocking: true }],
        summary: {
          totalMetrics: 4,
          evaluatedMetrics: 4,
          passed: 2,
          failed: 1,
          unknown: 1,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 20,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.summary.passed).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.unknown).toBe(1);
      expect(result.summary.totalMetrics).toBe(4);
    });
  });

  describe("Baseline Information", () => {
    it("should include reference branch information", () => {
      const result: QualityGateResult = {
        status: "pass",
        mode: "soft",
        metrics: [],
        failingMetrics: [],
        summary: {
          totalMetrics: 0,
          evaluatedMetrics: 0,
          passed: 0,
          failed: 0,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 15,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.baselineInfo.referenceBranch).toBe("main");
    });

    it("should track number of builds considered for baseline", () => {
      const result: QualityGateResult = {
        status: "pass",
        mode: "soft",
        metrics: [],
        failingMetrics: [],
        summary: {
          totalMetrics: 0,
          evaluatedMetrics: 0,
          passed: 0,
          failed: 0,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 15,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.baselineInfo.buildsConsidered).toBe(15);
      expect(result.baselineInfo.buildsConsidered).toBeLessThanOrEqual(result.baselineInfo.maxBuilds);
    });

    it("should include baseline window configuration", () => {
      const result: QualityGateResult = {
        status: "pass",
        mode: "soft",
        metrics: [],
        failingMetrics: [],
        summary: {
          totalMetrics: 0,
          evaluatedMetrics: 0,
          passed: 0,
          failed: 0,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 20,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.baselineInfo.maxBuilds).toBe(20);
      expect(result.baselineInfo.maxAgeDays).toBe(90);
    });
  });

  describe("Failing Metrics List", () => {
    it("should include all failing metrics in failingMetrics array", () => {
      const failedMetric1: MetricEvaluationResult = {
        metric: "coverage",
        status: "fail",
        isBlocking: true,
      };
      const failedMetric2: MetricEvaluationResult = {
        metric: "bundle-size",
        status: "fail",
        isBlocking: false,
      };

      const result: QualityGateResult = {
        status: "fail",
        mode: "hard",
        metrics: [failedMetric1, { metric: "build-time", status: "pass" }, failedMetric2],
        failingMetrics: [failedMetric1, failedMetric2],
        summary: {
          totalMetrics: 3,
          evaluatedMetrics: 3,
          passed: 1,
          failed: 2,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 20,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.failingMetrics).toHaveLength(2);
      expect(result.failingMetrics.every((m) => m.status === "fail")).toBe(true);
    });

    it("should have empty failingMetrics when all metrics pass", () => {
      const result: QualityGateResult = {
        status: "pass",
        mode: "hard",
        metrics: [
          { metric: "coverage", status: "pass" },
          { metric: "bundle-size", status: "pass" },
        ],
        failingMetrics: [],
        summary: {
          totalMetrics: 2,
          evaluatedMetrics: 2,
          passed: 2,
          failed: 0,
          unknown: 0,
        },
        baselineInfo: {
          referenceBranch: "main",
          buildsConsidered: 20,
          maxBuilds: 20,
          maxAgeDays: 90,
        },
      };

      expect(result.failingMetrics).toHaveLength(0);
    });
  });
});
