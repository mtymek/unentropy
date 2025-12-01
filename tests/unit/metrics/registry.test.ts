import { describe, it, expect } from "bun:test";
import {
  getBuiltInMetric,
  listBuiltInMetricIds,
  BUILT_IN_METRICS,
} from "../../../src/metrics/registry.js";

describe("registry", () => {
  describe("getBuiltInMetric", () => {
    it("should return coverage metric when requested", () => {
      const result = getBuiltInMetric("coverage");

      expect(result).toBeDefined();
      expect(result?.id).toBe("coverage");
      expect(result?.name).toBe("coverage");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("percent");
      expect(result?.command).toContain("bun test --coverage");
    });

    it("should return function-coverage metric when requested", () => {
      const result = getBuiltInMetric("function-coverage");

      expect(result).toBeDefined();
      expect(result?.id).toBe("function-coverage");
      expect(result?.name).toBe("function-coverage");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("percent");
      expect(result?.command).toContain("bun test --coverage");
    });

    it("should return loc metric when requested", () => {
      const result = getBuiltInMetric("loc");

      expect(result).toBeDefined();
      expect(result?.id).toBe("loc");
      expect(result?.name).toBe("loc");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("integer");
      expect(result?.command).toContain("find src/");
    });

    it("should return bundle-size metric when requested", () => {
      const result = getBuiltInMetric("bundle-size");

      expect(result).toBeDefined();
      expect(result?.id).toBe("bundle-size");
      expect(result?.name).toBe("bundle-size");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("bytes");
      expect(result?.command).toContain("find dist/");
    });

    it("should return build-time metric when requested", () => {
      const result = getBuiltInMetric("build-time");

      expect(result).toBeDefined();
      expect(result?.id).toBe("build-time");
      expect(result?.name).toBe("build-time");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("duration");
      expect(result?.command).toContain("bun run build");
    });

    it("should return test-time metric when requested", () => {
      const result = getBuiltInMetric("test-time");

      expect(result).toBeDefined();
      expect(result?.id).toBe("test-time");
      expect(result?.name).toBe("test-time");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("duration");
      expect(result?.command).toContain("bun test");
    });

    it("should return dependencies-count metric when requested", () => {
      const result = getBuiltInMetric("dependencies-count");

      expect(result).toBeDefined();
      expect(result?.id).toBe("dependencies-count");
      expect(result?.name).toBe("dependencies-count");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("integer");
      expect(result?.command).toContain("bun pm ls");
    });

    it("should return undefined for non-existent metric ID", () => {
      const result = getBuiltInMetric("non-existent");
      expect(result).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      const result = getBuiltInMetric("");
      expect(result).toBeUndefined();
    });

    it("should return the same object reference from registry", () => {
      const result1 = getBuiltInMetric("coverage");
      const result2 = BUILT_IN_METRICS.coverage;

      expect(result1).toBe(result2);
    });

    it("should return all required properties for each metric", () => {
      const metricIds = [
        "coverage",
        "function-coverage",
        "loc",
        "bundle-size",
        "build-time",
        "test-time",
        "dependencies-count",
      ];

      metricIds.forEach((id) => {
        const metric = getBuiltInMetric(id);
        expect(metric).toBeDefined();
        expect(metric).toHaveProperty("id");
        expect(metric).toHaveProperty("name");
        expect(metric).toHaveProperty("description");
        expect(metric).toHaveProperty("type");
        expect(metric).toHaveProperty("command");
        expect(metric?.id).toBe(id);
        expect(metric?.name).toBe(id);
        expect(metric?.type).toMatch(/^(numeric|label)$/);
        expect(typeof metric?.command).toBe("string");
        expect(metric?.command.length).toBeGreaterThan(0);
      });
    });
  });

  describe("listBuiltInMetricIds", () => {
    it("should return all built-in metric IDs", () => {
      const result = listBuiltInMetricIds();

      expect(result).toContain("coverage");
      expect(result).toContain("function-coverage");
      expect(result).toContain("loc");
      expect(result).toContain("bundle-size");
      expect(result).toContain("build-time");
      expect(result).toContain("test-time");
      expect(result).toContain("dependencies-count");
    });

    it("should return exactly 7 metric IDs", () => {
      const result = listBuiltInMetricIds();
      expect(result).toHaveLength(7);
    });

    it("should return the same IDs as keys in BUILT_IN_METRICS", () => {
      const result = listBuiltInMetricIds();
      const registryKeys = Object.keys(BUILT_IN_METRICS);

      expect(result.sort()).toEqual(registryKeys.sort());
    });

    it("should return a new array (not reference to internal keys)", () => {
      const result1 = listBuiltInMetricIds();
      const result2 = listBuiltInMetricIds();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it("should return strings only", () => {
      const result = listBuiltInMetricIds();

      result.forEach((id) => {
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
      });
    });

    it("should return IDs in consistent order", () => {
      const result1 = listBuiltInMetricIds();
      const result2 = listBuiltInMetricIds();

      expect(result1).toEqual(result2);
    });
  });
});
