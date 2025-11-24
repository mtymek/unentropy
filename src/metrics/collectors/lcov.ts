import { readFile } from "fs/promises";
import { parse, generateSummary } from "@markusberg/lcov-parse";

export interface LcovOptions {
  fallback?: number;
}

/**
 * Parse LCOV coverage report and return line coverage percentage
 * Returns coverage percentage as a number (0-100)
 */
export async function parseLcovCoverage(
  sourcePath: string,
  options: LcovOptions = {}
): Promise<number> {
  // Validate input path
  if (!sourcePath || typeof sourcePath !== "string") {
    throw new Error("Source path must be a non-empty string");
  }

  // Read the LCOV file content
  const lcovContent = await readFile(sourcePath, "utf-8");

  // Parse the LCOV content
  const report = parse(lcovContent);

  // Generate summary to get coverage percentages
  const summary = generateSummary(report);

  // Check if we have valid coverage data (total lines > 0)
  const totalLines = summary.total?.lines?.total || 0;
  if (totalLines === 0) {
    // No coverage data found, return fallback
    return options.fallback || 0;
  }
  // Return line coverage percentage
  return summary.total?.lines.pct || options.fallback || 0;
}
