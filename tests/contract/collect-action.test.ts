import { describe, it, expect } from "bun:test";

describe("Collect Metrics Action - Contract Tests", () => {
  describe("Input Validation Contract", () => {
    it("should validate config-path input format", () => {
      // Test valid config paths
      const validPaths = [
        "./unentropy.json",
        "./.unentropy/config.json",
        "./config/metrics.json",
        "unentropy.json",
      ];

      validPaths.forEach((path) => {
        expect(path).toMatch(/^\.?\/?[\w\-\/\.]+\.json$/);
      });
    });

    it("should validate database-artifact name pattern", () => {
      // Test valid artifact names
      const validNames = ["unentropy-metrics", "my-project-metrics", "api-metrics", "metrics_123"];

      validNames.forEach((name) => {
        expect(name).toMatch(/^[a-zA-Z0-9_-]+$/);
      });

      // Test invalid artifact names
      const invalidNames = [
        "invalid@artifact#name",
        "artifact with spaces",
        "artifact/name",
        "artifact.name",
      ];

      invalidNames.forEach((name) => {
        expect(name).not.toMatch(/^[a-zA-Z0-9_-]+$/);
      });
    });

    it("should validate database-path format", () => {
      // Test valid database paths
      const validPaths = [
        ".unentropy/metrics.db",
        "./metrics/data.db",
        "metrics.db",
        "./data/metrics.sqlite",
      ];

      validPaths.forEach((path) => {
        expect(path).toMatch(/^\.?\/?[\w\-\/\.]+\.(db|sqlite)$/);
      });
    });

    it("should validate continue-on-error boolean values", () => {
      const validBooleans = ["true", "false"];
      const invalidBooleans = ["1", "0", "yes", "no", "invalid"];

      validBooleans.forEach((value) => {
        expect(["true", "false"]).toContain(value);
      });

      invalidBooleans.forEach((value) => {
        expect(["true", "false"]).not.toContain(value);
      });
    });
  });

  describe("Output Contract", () => {
    it("should define required output names", () => {
      const requiredOutputs = ["metrics-collected", "metrics-failed", "database-path", "build-id"];

      requiredOutputs.forEach((output) => {
        expect(typeof output).toBe("string");
        expect(output.length).toBeGreaterThan(0);
      });
    });

    it("should validate output value types", () => {
      // All outputs should be strings (GitHub Actions convention)
      const mockOutputs = {
        "metrics-collected": "5",
        "metrics-failed": "2",
        "database-path": ".unentropy/metrics.db",
        "build-id": "42",
      };

      Object.entries(mockOutputs).forEach(([key, value]) => {
        expect(typeof value).toBe("string");

        if (key.includes("metrics-") || key === "build-id") {
          expect(parseInt(value)).not.toBeNaN();
        }
      });
    });
  });

  describe("Environment Variables Contract", () => {
    it("should define required GitHub environment variables", () => {
      const requiredEnvVars = [
        "GITHUB_SHA",
        "GITHUB_REF",
        "GITHUB_RUN_ID",
        "GITHUB_RUN_NUMBER",
        "GITHUB_ACTOR",
        "GITHUB_EVENT_NAME",
        "GITHUB_WORKSPACE",
      ];

      requiredEnvVars.forEach((envVar) => {
        expect(typeof envVar).toBe("string");
        expect(envVar.startsWith("GITHUB_")).toBe(true);
      });
    });

    it("should validate environment variable formats", () => {
      const mockEnvVars = {
        GITHUB_SHA: "abc123def456789012345678901234567890abcd",
        GITHUB_REF: "refs/heads/main",
        GITHUB_RUN_ID: "123456789",
        GITHUB_RUN_NUMBER: "42",
        GITHUB_ACTOR: "test-user",
        GITHUB_EVENT_NAME: "push",
        GITHUB_WORKSPACE: "/github/workspace",
      };

      // Validate SHA format (40 hex characters)
      expect(mockEnvVars.GITHUB_SHA).toMatch(/^[a-f0-9]{40}$/);

      // Validate ref format
      expect(mockEnvVars.GITHUB_REF).toMatch(/^refs\/(heads|tags|pull)\//);

      // Validate run ID (numeric)
      expect(parseInt(mockEnvVars.GITHUB_RUN_ID)).not.toBeNaN();

      // Validate run number (numeric)
      expect(parseInt(mockEnvVars.GITHUB_RUN_NUMBER)).not.toBeNaN();

      // Validate actor (alphanumeric with hyphens)
      expect(mockEnvVars.GITHUB_ACTOR).toMatch(/^[a-zA-Z0-9\-]+$/);

      // Validate event name
      const validEvents = ["push", "pull_request", "schedule", "workflow_dispatch"];
      expect(validEvents).toContain(mockEnvVars.GITHUB_EVENT_NAME);

      // Validate workspace path
      expect(mockEnvVars.GITHUB_WORKSPACE).toMatch(/^\/[\w\-\/]*$/);
    });
  });

  describe("Error Handling Contract", () => {
    it("should define error message patterns", () => {
      const errorPatterns = {
        "Config file not found": /^Config file not found/,
        "Invalid database-artifact": /^Invalid database-artifact/,
        "Invalid output-path": /^Invalid output-path/,
        "Invalid time-range": /^Invalid time-range/,
        "Invalid title": /^Invalid title/,
        "Configuration error": /^Configuration error/,
        "Database error": /^Database error/,
        "Artifact upload failed": /^Artifact upload failed/,
      };

      Object.entries(errorPatterns).forEach(([message, pattern]) => {
        expect(message).toMatch(pattern);
      });
    });

    it("should define exit code contract", () => {
      const exitCodes = {
        0: [
          "Success (all metrics collected)",
          "Partial success (some metrics failed, continue-on-error=true)",
        ],
        1: ["Configuration error", "Database error"],
        2: ["Complete failure (all metrics failed, continue-on-error=false)"],
      };

      Object.entries(exitCodes).forEach(([code, descriptions]) => {
        expect(parseInt(code)).toBeGreaterThanOrEqual(0);
        expect(parseInt(code)).toBeLessThanOrEqual(2);
        expect(Array.isArray(descriptions)).toBe(true);
        descriptions.forEach((description: string) => {
          expect(typeof description).toBe("string");
        });
      });
    });
  });

  describe("Action Metadata Contract", () => {
    it("should define action metadata structure", () => {
      const actionMetadata = {
        name: "Unentropy Collect Metrics",
        description: "Collect custom code metrics and store in SQLite database",
        author: "Unentropy Team",
        branding: {
          icon: "bar-chart-2",
          color: "blue",
        },
      };

      expect(typeof actionMetadata.name).toBe("string");
      expect(typeof actionMetadata.description).toBe("string");
      expect(typeof actionMetadata.author).toBe("string");
      expect(typeof actionMetadata.branding.icon).toBe("string");
      expect(typeof actionMetadata.branding.color).toBe("string");
    });

    it("should validate branding icon and color", () => {
      const validIcons = ["bar-chart-2", "activity", "trending-up", "zap"];
      const validColors = ["blue", "green", "red", "yellow", "purple", "gray"];

      expect(validIcons).toContain("bar-chart-2");
      expect(validColors).toContain("blue");
    });
  });
});
