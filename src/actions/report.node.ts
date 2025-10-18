import * as core from "@actions/core";
import { DefaultArtifactClient } from "@actions/artifact";
const artifactClient = new DefaultArtifactClient();
import { promises as fs } from "fs";
import { dirname, join } from "path";
import { DatabaseClient } from "../database/client";
import { generateReport } from "../reporter/generator";

interface ActionInputs {
  databasePath: string;
  databaseArtifact: string;
  outputPath: string;
  timeRange: string;
  title: string;
}

interface ActionOutputs {
  reportPath: string;
  metricsCount: number;
  dataPoints: number;
  timeRangeStart?: string;
  timeRangeEnd?: string;
}

interface TimeRangeFilter {
  type: "all" | "days" | "weeks" | "months";
  value?: number;
}

function parseInputs(): ActionInputs {
  const databasePath = core.getInput("database-path") || "./unentropy-metrics.db";
  const databaseArtifact = core.getInput("database-artifact") || "unentropy-metrics";
  const outputPath = core.getInput("output-path") || "./unentropy-report.html";
  const timeRange = core.getInput("time-range") || "all";
  const title = core.getInput("title") || "Metrics Report";

  // Validate inputs
  if (!databasePath.endsWith(".db")) {
    throw new Error(`Invalid database-path: must end with .db. Got: ${databasePath}`);
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(databaseArtifact)) {
    throw new Error(
      `Invalid database-artifact: must match pattern ^[a-zA-Z0-9_-]+$. Got: ${databaseArtifact}`
    );
  }

  if (!outputPath.endsWith(".html")) {
    throw new Error(`Invalid output-path: must end with .html. Got: ${outputPath}`);
  }

  if (!/^(all|last-\d+-days|last-\d+-weeks|last-\d+-months)$/.test(timeRange)) {
    throw new Error(
      `Invalid time-range: must match pattern ^(all|last-\\d+-days|last-\\d+-weeks|last-\\d+-months)$. Got: ${timeRange}`
    );
  }

  if (title.length > 100) {
    throw new Error(
      `Invalid title: must be 100 characters or less. Got: ${title.length} characters`
    );
  }

  return {
    databasePath,
    databaseArtifact,
    outputPath,
    timeRange,
    title,
  };
}

function parseTimeRange(timeRange: string): TimeRangeFilter {
  if (timeRange === "all") {
    return { type: "all" };
  }

  const match = timeRange.match(/^last-(\d+)-(days|weeks|months)$/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid time-range format: ${timeRange}`);
  }

  const value = parseInt(match[1], 10);
  if (isNaN(value) || value <= 0) {
    throw new Error(`Invalid time-range value: ${match[1]}`);
  }

  return {
    type: match[2] as "days" | "weeks" | "months",
    value,
  };
}

async function downloadArtifact(artifactName: string, targetPath: string): Promise<void> {
  try {
    core.info(`Attempting to download artifact: ${artifactName}`);

    const getArtifactResponse = await artifactClient.getArtifact(artifactName);
    core.info(`Found artifact ID: ${getArtifactResponse.artifact.id}`);

    const downloadDir = dirname(targetPath);
    await fs.mkdir(downloadDir, { recursive: true });

    const downloadResponse = await artifactClient.downloadArtifact(
      getArtifactResponse.artifact.id,
      {
        path: downloadDir,
      }
    );

    if (!downloadResponse.downloadPath) {
      throw new Error("Download path not returned from artifact download");
    }

    const sourceFileName = targetPath.split("/").pop() ?? "metrics.db";
    const downloadedDbPath = join(downloadResponse.downloadPath, sourceFileName);

    await fs.rename(downloadedDbPath, targetPath);

    core.info(`Artifact downloaded successfully to: ${targetPath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle specific GitHub Actions environment errors gracefully
    if (
      errorMessage.includes("ACTIONS_RUNTIME_TOKEN") ||
      errorMessage.includes("ACTIONS_RUNTIME_URL") ||
      errorMessage.includes("not found")
    ) {
      core.warning(`Artifact download skipped: ${errorMessage}`);
      core.info(
        "This is expected when running outside of GitHub Actions environment or when artifact doesn't exist"
      );

      // Create empty database as fallback
      const { DatabaseClient } = await import("../database/client");
      const tempDb = new DatabaseClient({ path: targetPath });
      await tempDb.ready();
      tempDb.close();

      core.info(`Created empty fallback database at: ${targetPath}`);
      return;
    }

    throw new Error(`Artifact download failed: ${errorMessage}`);
  }
}

async function ensureOutputDirectory(outputPath: string): Promise<void> {
  const outputDir = dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
}

function filterMetricsByTimeRange(
  metricNames: string[],
  timeRangeFilter: TimeRangeFilter,
  db: DatabaseClient
): string[] {
  if (timeRangeFilter.type === "all") {
    return metricNames;
  }

  // Calculate cutoff date
  const now = new Date();
  let cutoffDate: Date;

  switch (timeRangeFilter.type) {
    case "days":
      cutoffDate = new Date(now.getTime() - (timeRangeFilter.value ?? 1) * 24 * 60 * 60 * 1000);
      break;
    case "weeks":
      cutoffDate = new Date(now.getTime() - (timeRangeFilter.value ?? 1) * 7 * 24 * 60 * 60 * 1000);
      break;
    case "months":
      cutoffDate = new Date(
        now.getTime() - (timeRangeFilter.value ?? 1) * 30 * 24 * 60 * 60 * 1000
      );
      break;
    default:
      return metricNames;
  }

  // Filter metrics that have data in the time range
  const filteredMetrics: string[] = [];
  for (const metricName of metricNames) {
    try {
      const timeSeries = db.getMetricTimeSeries(metricName);
      const hasRecentData = timeSeries.some(
        (point) => new Date(point.build_timestamp) >= cutoffDate
      );

      if (hasRecentData) {
        filteredMetrics.push(metricName);
      }
    } catch (error) {
      // Skip metrics that can't be loaded
      core.warning(
        `Failed to load time series for metric '${metricName}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return filteredMetrics;
}

function getTimeRangeBounds(
  timeRangeFilter: TimeRangeFilter,
  db: DatabaseClient
): { start?: string; end?: string } {
  if (timeRangeFilter.type === "all") {
    const allBuilds = db.getAllBuildContexts();
    if (allBuilds.length === 0) {
      return {};
    }

    const timestamps = allBuilds.map((b) => b.timestamp).sort();
    return {
      start: timestamps[0] ?? undefined,
      end: timestamps[timestamps.length - 1] ?? undefined,
    };
  }

  // For filtered time ranges, calculate the bounds
  const now = new Date();
  let cutoffDate: Date;

  switch (timeRangeFilter.type) {
    case "days":
      cutoffDate = new Date(now.getTime() - (timeRangeFilter.value ?? 1) * 24 * 60 * 60 * 1000);
      break;
    case "weeks":
      cutoffDate = new Date(now.getTime() - (timeRangeFilter.value ?? 1) * 7 * 24 * 60 * 60 * 1000);
      break;
    case "months":
      cutoffDate = new Date(
        now.getTime() - (timeRangeFilter.value ?? 1) * 30 * 24 * 60 * 60 * 1000
      );
      break;
    default:
      return {};
  }

  return {
    start: cutoffDate.toISOString(),
    end: now.toISOString(),
  };
}

async function run(): Promise<void> {
  try {
    // Parse and validate inputs
    const inputs = parseInputs();
    core.info(`Starting report generation with title: ${inputs.title}`);

    // Ensure output directory exists
    await ensureOutputDirectory(inputs.outputPath);

    // Check if local database exists, otherwise try to download artifact
    let dbPath = inputs.databasePath;
    const localDbExists = await fs
      .access(inputs.databasePath)
      .then(() => true)
      .catch(() => false);

    if (!localDbExists) {
      core.info(
        `Local database not found at ${inputs.databasePath}, attempting to download artifact`
      );
      const tempDbPath = `${inputs.outputPath}.db`;
      await downloadArtifact(inputs.databaseArtifact, tempDbPath);
      dbPath = tempDbPath;
    } else {
      core.info(`Using local database at: ${inputs.databasePath}`);
    }

    // Initialize database
    let db;
    try {
      db = new DatabaseClient({ path: dbPath });
      await db.ready();
      core.info("Database initialized successfully");
    } catch (error) {
      throw new Error(`Database error: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Parse time range filter
    const timeRangeFilter = parseTimeRange(inputs.timeRange);
    core.info(`Using time range filter: ${JSON.stringify(timeRangeFilter)}`);

    // Get all available metrics
    const allMetrics = db.getAllMetricDefinitions();
    if (allMetrics.length === 0) {
      core.warning("No metrics found in database");

      // Generate empty report
      const emptyReport = generateReport(db, {
        repository: process.env.GITHUB_REPOSITORY || "unknown/repository",
        metricNames: [],
      });

      await fs.writeFile(inputs.outputPath, emptyReport, "utf-8");

      // Set outputs for empty report
      core.setOutput("report-path", inputs.outputPath);
      core.setOutput("metrics-count", "0");
      core.setOutput("data-points", "0");

      core.info("Empty report generated successfully");
      return;
    }

    // Filter metrics by time range
    const filteredMetricNames = filterMetricsByTimeRange(
      allMetrics.map((m) => m.name),
      timeRangeFilter,
      db
    );

    if (filteredMetricNames.length === 0) {
      core.warning(`No metrics found in time range: ${inputs.timeRange}`);

      // Generate report with all metrics but note the time range
      const report = generateReport(db, {
        repository: process.env.GITHUB_REPOSITORY || "unknown/repository",
        metricNames: allMetrics.map((m) => m.name),
      });

      await fs.writeFile(inputs.outputPath, report, "utf-8");

      // Set outputs
      const timeRangeBounds = getTimeRangeBounds(timeRangeFilter, db);
      const allValues = db.getAllMetricValues();

      core.setOutput("report-path", inputs.outputPath);
      core.setOutput("metrics-count", allMetrics.length.toString());
      core.setOutput("data-points", allValues.length.toString());
      if (timeRangeBounds.start) {
        core.setOutput("time-range-start", timeRangeBounds.start);
      }
      if (timeRangeBounds.end) {
        core.setOutput("time-range-end", timeRangeBounds.end);
      }

      core.info("Report generated successfully (no data in specified time range)");
      return;
    }

    // Generate report
    let report;
    try {
      report = generateReport(db, {
        repository: process.env.GITHUB_REPOSITORY || "unknown/repository",
        metricNames: filteredMetricNames,
      });
      core.info(`Report generated successfully with ${filteredMetricNames.length} metrics`);
    } catch (error) {
      throw new Error(
        `Report generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      db.close();
    }

    // Write report to file
    try {
      await fs.writeFile(inputs.outputPath, report, "utf-8");
      core.info(`Report written to: ${inputs.outputPath}`);
    } catch (error) {
      throw new Error(
        `Output file error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Calculate outputs
    const timeRangeBounds = getTimeRangeBounds(timeRangeFilter, db);
    const filteredValues = filteredMetricNames.flatMap((metricName) => {
      try {
        return db.getMetricTimeSeries(metricName);
      } catch {
        return [];
      }
    });

    const outputs: ActionOutputs = {
      reportPath: inputs.outputPath,
      metricsCount: filteredMetricNames.length,
      dataPoints: filteredValues.length,
      timeRangeStart: timeRangeBounds.start,
      timeRangeEnd: timeRangeBounds.end,
    };

    // Set outputs
    core.setOutput("report-path", outputs.reportPath);
    core.setOutput("metrics-count", outputs.metricsCount.toString());
    core.setOutput("data-points", outputs.dataPoints.toString());
    if (outputs.timeRangeStart) {
      core.setOutput("time-range-start", outputs.timeRangeStart);
    }
    if (outputs.timeRangeEnd) {
      core.setOutput("time-range-end", outputs.timeRangeEnd);
    }

    core.info("Action completed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Run the action
if (import.meta.main) {
  run().catch((error) => {
    core.error(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export { run };
