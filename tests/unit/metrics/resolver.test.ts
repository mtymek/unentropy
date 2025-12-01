import { describe, it, expect } from "bun:test";
import { resolveMetricReference, validateBuiltInReference } from "../../../src/metrics/resolver.js";
import type { MetricConfig } from "../../../src/config/schema.js";

describe("resolver", () => {
  describe("resolveMetricReference", () => {
    it("should return config unchanged when no $ref is present", () => {
      const config: MetricConfig = {
        name: "custom-metric",
        type: "numeric",
        command: "echo '42'",
        description: "Custom metric",
        unit: "integer",
      };

      const result = resolveMetricReference(config);

      expect(result).toEqual(config);
      expect(result).toBe(config); // Same reference
    });

    it("should resolve coverage built-in metric", () => {
      const config: MetricConfig = {
        $ref: "coverage",
        command: "bun test --coverage | jq '.coverage'",
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("coverage");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("percent");
      expect(result.command).toBe("bun test --coverage | jq '.coverage'");
      expect(result.description).toBe("Overall test coverage percentage across the codebase");
      expect(result.$ref).toBeUndefined();
    });

    it("should resolve function-coverage built-in metric", () => {
      const config: MetricConfig = {
        $ref: "function-coverage",
        command: "npm test --coverage | jq '.functions'",
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("function-coverage");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("percent");
      expect(result.command).toBe("npm test --coverage | jq '.functions'");
      expect(result.description).toBe("Percentage of functions covered by tests");
      expect(result.$ref).toBeUndefined();
    });

    it("should resolve loc built-in metric", () => {
      const config: MetricConfig = {
        $ref: "loc",
        command: "find lib/ -name '*.js' | wc -l",
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("loc");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("integer");
      expect(result.command).toBe("find lib/ -name '*.js' | wc -l");
      expect(result.description).toBe("Total lines of code in the codebase");
      expect(result.$ref).toBeUndefined();
    });

    it("should resolve bundle-size built-in metric", () => {
      const config: MetricConfig = {
        $ref: "bundle-size",
        command: "du -sk dist/ | cut -f1",
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("bundle-size");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("bytes");
      expect(result.command).toBe("du -sk dist/ | cut -f1");
      expect(result.description).toBe("Total size of production build artifacts");
      expect(result.$ref).toBeUndefined();
    });

    it("should resolve build-time built-in metric", () => {
      const config: MetricConfig = {
        $ref: "build-time",
        command: "time npm run build",
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("build-time");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("duration");
      expect(result.command).toBe("time npm run build");
      expect(result.description).toBe("Time taken to complete the build");
      expect(result.$ref).toBeUndefined();
    });

    it("should resolve test-time built-in metric", () => {
      const config: MetricConfig = {
        $ref: "test-time",
        command: "time npm test",
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("test-time");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("duration");
      expect(result.command).toBe("time npm test");
      expect(result.description).toBe("Time taken to run all tests");
      expect(result.$ref).toBeUndefined();
    });

    it("should resolve dependencies-count built-in metric", () => {
      const config: MetricConfig = {
        $ref: "dependencies-count",
        command: "cat package.json | jq '.dependencies | length'",
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("dependencies-count");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("integer");
      expect(result.command).toBe("cat package.json | jq '.dependencies | length'");
      expect(result.description).toBe("Total number of dependencies");
      expect(result.$ref).toBeUndefined();
    });

    it("should apply name override", () => {
      const config: MetricConfig = {
        $ref: "coverage",
        name: "my-custom-coverage",
        command: "npm run test:coverage",
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("my-custom-coverage");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("percent");
      expect(result.command).toBe("npm run test:coverage");
      expect(result.$ref).toBeUndefined();
    });

    it("should apply command override", () => {
      const config: MetricConfig = {
        $ref: "loc",
        command: "find src/ -name '*.ts' | wc -l",
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("loc");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("integer");
      expect(result.command).toBe("find src/ -name '*.ts' | wc -l");
      expect(result.$ref).toBeUndefined();
    });

    it("should apply unit override", () => {
      const config: MetricConfig = {
        $ref: "bundle-size",
        command: "du -sb dist/ | cut -f1",
        unit: "bytes",
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("bundle-size");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("bytes");
      expect(result.command).toBe("du -sb dist/ | cut -f1");
      expect(result.$ref).toBeUndefined();
    });

    it("should apply description override", () => {
      const config: MetricConfig = {
        $ref: "build-time",
        command: "time make build",
        description: "Custom build time measurement",
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("build-time");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("duration");
      expect(result.command).toBe("time make build");
      expect(result.description).toBe("Custom build time measurement");
      expect(result.$ref).toBeUndefined();
    });

    it("should apply timeout override", () => {
      const config: MetricConfig = {
        $ref: "test-time",
        command: "time pytest",
        timeout: 120000,
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("test-time");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("duration");
      expect(result.command).toBe("time pytest");
      expect(result.timeout).toBe(120000);
      expect(result.$ref).toBeUndefined();
    });

    it("should apply multiple overrides", () => {
      const config: MetricConfig = {
        $ref: "coverage",
        name: "frontend-coverage",
        command: "npm run test:coverage:frontend",
        unit: "percent",
        description: "Frontend test coverage",
        timeout: 60000,
      };

      const result = resolveMetricReference(config);

      expect(result.name).toBe("frontend-coverage");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("percent");
      expect(result.command).toBe("npm run test:coverage:frontend");
      expect(result.description).toBe("Frontend test coverage");
      expect(result.timeout).toBe(60000);
      expect(result.$ref).toBeUndefined();
    });

    it("should throw error for non-existent built-in metric", () => {
      const config: MetricConfig = {
        $ref: "non-existent-metric",
        command: "echo 'test'",
      };

      expect(() => resolveMetricReference(config)).toThrow(
        "Built-in metric 'non-existent-metric' not found. Available metrics: coverage, function-coverage, loc, bundle-size, build-time, test-time, dependencies-count"
      );
    });

    it("should throw error for empty $ref", () => {
      const config: MetricConfig = {
        $ref: "",
        command: "echo 'test'",
      };

      expect(() => resolveMetricReference(config)).toThrow(
        "Built-in metric '' not found. Available metrics: coverage, function-coverage, loc, bundle-size, build-time, test-time, dependencies-count"
      );
    });

    it("should preserve type when not overridden", () => {
      const config: MetricConfig = {
        $ref: "coverage",
        command: "npm test",
      };

      const result = resolveMetricReference(config);

      expect(result.type).toBe("numeric");
    });

    it("should allow type override", () => {
      const config: MetricConfig = {
        $ref: "coverage",
        command: "npm test",
        type: "label",
      };

      const result = resolveMetricReference(config);

      expect(result.type).toBe("label");
    });

    it("should return new object (not modify input)", () => {
      const config: MetricConfig = {
        $ref: "coverage",
        command: "npm test",
      };

      const result = resolveMetricReference(config);

      expect(result).not.toBe(config);
      expect(config.$ref).toBe("coverage"); // Original unchanged
      expect(result.$ref).toBeUndefined(); // Result has no $ref
    });
  });

  describe("validateBuiltInReference", () => {
    it("should not throw for valid built-in metric IDs", () => {
      expect(() => validateBuiltInReference("coverage")).not.toThrow();
      expect(() => validateBuiltInReference("function-coverage")).not.toThrow();
      expect(() => validateBuiltInReference("loc")).not.toThrow();
      expect(() => validateBuiltInReference("bundle-size")).not.toThrow();
      expect(() => validateBuiltInReference("build-time")).not.toThrow();
      expect(() => validateBuiltInReference("test-time")).not.toThrow();
      expect(() => validateBuiltInReference("dependencies-count")).not.toThrow();
    });

    it("should throw error for non-existent built-in metric ID", () => {
      expect(() => validateBuiltInReference("non-existent")).toThrow(
        "Built-in metric 'non-existent' not found. Available metrics: coverage, function-coverage, loc, bundle-size, build-time, test-time, dependencies-count"
      );
    });

    it("should throw error for empty string", () => {
      expect(() => validateBuiltInReference("")).toThrow(
        "Built-in metric reference cannot be empty"
      );
    });

    it("should throw error for whitespace-only string", () => {
      expect(() => validateBuiltInReference("   ")).toThrow(
        "Built-in metric reference cannot be empty"
      );
    });

    it("should handle case-sensitive metric IDs", () => {
      expect(() => validateBuiltInReference("Coverage")).toThrow(
        "Built-in metric 'Coverage' not found. Available metrics: coverage, function-coverage, loc, bundle-size, build-time, test-time, dependencies-count"
      );
    });

    it("should provide helpful error message with all available metrics", () => {
      expect(() => validateBuiltInReference("invalid")).toThrow(
        /Available metrics: coverage, function-coverage, loc, bundle-size, build-time, test-time, dependencies-count/
      );
    });
  });
});
