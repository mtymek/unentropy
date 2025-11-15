import { describe, it, expect } from "bun:test";
import { validateConfig } from "../../../src/config/schema";

describe("Config Schema Validation", () => {
  describe("Invalid Metric Names", () => {
    it("should reject uppercase letters in metric name", () => {
      const config = {
        metrics: [
          {
            name: "Test-Coverage",
            type: "numeric",
            command: "echo 85",
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject metric names with underscores", () => {
      const config = {
        metrics: [
          {
            name: "test_coverage",
            type: "numeric",
            command: "echo 85",
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject metric names with spaces", () => {
      const config = {
        metrics: [
          {
            name: "test coverage",
            type: "numeric",
            command: "echo 85",
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject metric names exceeding 64 characters", () => {
      const config = {
        metrics: [
          {
            name: "a".repeat(65),
            type: "numeric",
            command: "echo 85",
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should accept valid metric names with hyphens and numbers", () => {
      const config = {
        metrics: [
          {
            name: "test-coverage-2024",
            type: "numeric",
            command: "echo 85",
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe("Duplicate Metric Names", () => {
    it("should reject duplicate metric names", () => {
      const config = {
        metrics: [
          {
            name: "test-coverage",
            type: "numeric",
            command: "echo 85",
          },
          {
            name: "test-coverage",
            type: "numeric",
            command: "echo 90",
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("Duplicate metric name");
    });

    it("should allow different metric names", () => {
      const config = {
        metrics: [
          {
            name: "test-coverage",
            type: "numeric",
            command: "echo 85",
          },
          {
            name: "bundle-size",
            type: "numeric",
            command: "echo 100",
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe("Type Mismatches", () => {
    it("should reject invalid metric type", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "percentage",
            command: "echo 85",
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should accept numeric type", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "numeric",
            command: "echo 85",
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it("should accept label type", () => {
      const config = {
        metrics: [
          {
            name: "status",
            type: "label",
            command: "echo healthy",
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe("Empty/Missing Required Fields", () => {
    it("should reject missing name field", () => {
      const config = {
        metrics: [
          {
            type: "numeric",
            command: "echo 85",
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject missing type field", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            command: "echo 85",
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject missing command field", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "numeric",
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject empty command", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "numeric",
            command: "",
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject empty metrics array", () => {
      const config = {
        metrics: [],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject missing metrics field", () => {
      const config = {};

      expect(() => validateConfig(config)).toThrow();
    });

    it("should allow optional description field", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "numeric",
            command: "echo 85",
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it("should allow optional unit field", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "numeric",
            command: "echo 85",
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe("Clear Error Messages", () => {
    it("should provide clear error for invalid metric name pattern", () => {
      const config = {
        metrics: [
          {
            name: "Test_Coverage",
            type: "numeric",
            command: "echo 85",
          },
        ],
      };

      try {
        validateConfig(config);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain("name");
        expect(message.toLowerCase()).toMatch(/lowercase|pattern|hyphen/);
      }
    });

    it("should provide clear error for duplicate names", () => {
      const config = {
        metrics: [
          {
            name: "test-coverage",
            type: "numeric",
            command: "echo 85",
          },
          {
            name: "test-coverage",
            type: "numeric",
            command: "echo 90",
          },
        ],
      };

      try {
        validateConfig(config);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message.toLowerCase()).toContain("duplicate");
        expect(message).toContain("test-coverage");
      }
    });

    it("should provide clear error for invalid type", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "percentage",
            command: "echo 85",
          },
        ],
      };

      try {
        validateConfig(config);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain("type");
        expect(message.toLowerCase()).toMatch(/numeric|label/);
      }
    });

    it("should provide clear error for empty command", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "numeric",
            command: "",
          },
        ],
      };

      try {
        validateConfig(config);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message.toLowerCase()).toContain("command");
        expect(message.toLowerCase()).toMatch(/empty|required/);
      }
    });
  });

  describe("Field Length Constraints", () => {
    it("should reject description longer than 256 characters", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "numeric",
            command: "echo 85",
            description: "a".repeat(257),
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject command longer than 1024 characters", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "numeric",
            command: "echo " + "a".repeat(1020),
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject unit longer than 10 characters", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "numeric",
            command: "echo 85",
            unit: "a".repeat(11),
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should accept valid field lengths", () => {
      const config = {
        metrics: [
          {
            name: "coverage",
            type: "numeric",
            command: "echo 85",
            description: "a".repeat(256),
            unit: "a".repeat(10),
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });
});
