import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { parseLcovCoverage } from "../../../../src/metrics/collectors/lcov.js";
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync } from "fs";
import { join } from "path";

describe("parseLcovCoverage", () => {
  const testDir = join(process.cwd(), "test-temp");
  const lcovFilePath = join(testDir, "test.lcov");

  beforeEach(() => {
    try {
      mkdirSync(testDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  });

  afterEach(() => {
    try {
      unlinkSync(lcovFilePath);
      rmdirSync(testDir);
    } catch {
      // Files might not exist or directory not empty
    }
  });

  it("should parse valid LCOV file and return line coverage percentage", async () => {
    const lcovContent = `TN:
SF:src/example.js
FN:10,exampleFunction
FNDA:1,exampleFunction
FNF:1
FNH:1
DA:1,1
DA:2,1
DA:3,0
LF:3
LH:2
end_of_record`;

    writeFileSync(lcovFilePath, lcovContent);

    const coverage = await parseLcovCoverage(lcovFilePath);
    expect(coverage).toBeCloseTo(66.67, 1); // 2 out of 3 lines covered = 66.67%
  });

  it("should return fallback value when no coverage data found", async () => {
    const invalidLcovContent = "invalid lcov content";
    writeFileSync(lcovFilePath, invalidLcovContent);

    const coverage = await parseLcovCoverage(lcovFilePath, { fallback: 42 });
    expect(coverage).toBe(42);
  });

  it("should return 0 when no fallback provided and no coverage data found", async () => {
    const invalidLcovContent = "invalid lcov content";
    writeFileSync(lcovFilePath, invalidLcovContent);

    const coverage = await parseLcovCoverage(lcovFilePath);
    expect(coverage).toBe(0);
  });

  it("should throw error for empty source path", async () => {
    await expect(parseLcovCoverage("")).rejects.toThrow("Source path must be a non-empty string");
  });

  it("should throw error for null source path", async () => {
    await expect(parseLcovCoverage(null as unknown as string)).rejects.toThrow(
      "Source path must be a non-empty string"
    );
  });

  it("should handle empty LCOV file with fallback", async () => {
    writeFileSync(lcovFilePath, "");

    const coverage = await parseLcovCoverage(lcovFilePath, { fallback: 0 });
    expect(coverage).toBe(0);
  });

  it("should handle LCOV file with no coverage data", async () => {
    const lcovContent = `TN:
SF:src/example.js
end_of_record`;

    writeFileSync(lcovFilePath, lcovContent);

    const coverage = await parseLcovCoverage(lcovFilePath, { fallback: 0 });
    expect(coverage).toBe(0);
  });
});
