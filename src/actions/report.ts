import * as core from "@actions/core";
import { promises as fs } from "fs";
import { resolve } from "path";
import { Storage } from "../storage/storage";
import { generateReport } from "../reporter/generator";
import { loadConfig } from "../config/loader";

interface ActionInputs {
  databasePath: string;
  outputDir: string;
  timeRange: string;
  title: string;
  configPath: string;
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
  const outputDir = core.getInput("output-dir") || "./unentropy-report";
  const timeRange = core.getInput("time-range") || "all";
  const title = core.getInput("title") || "Metrics Report";
  const configPath = core.getInput("config-path") || "./unentropy.json";

  // Validate inputs
  if (!databasePath.endsWith(".db") && !databasePath.endsWith(".sqlite")) {
    throw new Error(`Invalid database-path: must end with .db or .sqlite. Got: ${databasePath}`);
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
    outputDir,
    timeRange,
    title,
    configPath,
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

async function ensureOutputDirectory(outputDir: string): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
}

function filterMetricsByTimeRange(
  metricNames: string[],
  timeRangeFilter: TimeRangeFilter,
  db: Storage
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
      const timeSeries = db.getRepository().queries.getMetricTimeSeries(metricName);
      const hasRecentData = timeSeries.some(
        (point: { build_timestamp: string }) => new Date(point.build_timestamp) >= cutoffDate
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
  db: Storage
): { start?: string; end?: string } {
  if (timeRangeFilter.type === "all") {
    const allBuilds = db.getRepository().queries.getAllBuildContexts();
    if (allBuilds.length === 0) {
      return {};
    }

    const timestamps = allBuilds.map((b: { timestamp: string }) => b.timestamp).sort();
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

export async function run(): Promise<void> {
  // Parse and validate inputs
  const inputs = parseInputs();
  core.info(`Starting report generation with title: ${inputs.title}`);

  // Load configuration
  let config;
  try {
    const resolvedConfigPath = resolve(inputs.configPath);
    config = await loadConfig(resolvedConfigPath);
    core.info(`Configuration loaded from: ${resolvedConfigPath}`);
    core.info(`Found ${config.metrics.length} configured metrics`);
  } catch (error) {
    core.warning(
      `Failed to load config from ${inputs.configPath}: ${error instanceof Error ? error.message : String(error)}`
    );
    core.warning("Report will include all metrics found in database");
    config = undefined;
  }

  // Ensure output directory exists
  await ensureOutputDirectory(inputs.outputDir);

  // Database is already downloaded by the action workflow
  const tempDbPath = inputs.databasePath;

  // Initialize database
  let db;
  try {
    db = new Storage({
      type: "sqlite-local",
      path: tempDbPath,
      readonly: true,
    });
    await db.ready();
    core.info("Database initialized successfully");
  } catch (error) {
    throw new Error(`Database error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Parse time range filter
  const timeRangeFilter = parseTimeRange(inputs.timeRange);
  core.info(`Using time range filter: ${JSON.stringify(timeRangeFilter)}`);

  // Get all available metrics
  const allMetrics = db.getRepository().getAllMetricDefinitions();
  if (allMetrics.length === 0) {
    core.warning("No metrics found in database");

    // Generate empty report
    const emptyReport = generateReport(db, {
      repository: process.env.GITHUB_REPOSITORY || "unknown/repository",
      metricNames: [],
      config,
    });

    const emptyReportPath = `${inputs.outputDir}/index.html`;
    await fs.writeFile(emptyReportPath, emptyReport, "utf-8");

    // Set outputs for empty report
    core.setOutput("report-path", emptyReportPath);
    core.setOutput("metrics-count", "0");
    core.setOutput("data-points", "0");

    core.info("Empty report generated successfully");
    return;
  }

  // Filter metrics by time range
  const filteredMetricNames = filterMetricsByTimeRange(
    allMetrics.map((m: { name: string }) => m.name),
    timeRangeFilter,
    db
  );

  if (filteredMetricNames.length === 0) {
    core.warning(`No metrics found in time range: ${inputs.timeRange}`);

    // Generate report with all metrics but note the time range
    const report = generateReport(db, {
      repository: process.env.GITHUB_REPOSITORY || "unknown/repository",
      metricNames: allMetrics.map((m: { name: string }) => m.name),
      config,
    });

    const reportPath = `${inputs.outputDir}/index.html`;
    await fs.writeFile(reportPath, report, "utf-8");

    // Set outputs
    const timeRangeBounds = getTimeRangeBounds(timeRangeFilter, db);
    const allValues = db.getRepository().queries.getAllMetricValues();

    core.setOutput("report-path", reportPath);
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
      config,
    });
    core.info(`Report generated successfully with ${filteredMetricNames.length} metrics`);
  } catch (error) {
    throw new Error(
      `Report generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Write report to file
  const reportPath = `${inputs.outputDir}/index.html`;
  try {
    await fs.writeFile(reportPath, report, "utf-8");
    core.info(`Report written to: ${reportPath}`);
  } catch (error) {
    throw new Error(`Output file error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Calculate outputs
  const timeRangeBounds = getTimeRangeBounds(timeRangeFilter, db);
  const filteredValues = filteredMetricNames.flatMap((metricName) => {
    try {
      return db.getRepository().queries.getMetricTimeSeries(metricName);
    } catch {
      return [];
    }
  });

  const outputs: ActionOutputs = {
    reportPath: `${inputs.outputDir}/index.html`,
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

  // Write outputs to file for composite action output capture
  const outputFile = process.env.GITHUB_ACTIONS === "true" ? process.argv[2] : null;
  if (outputFile) {
    const outputLines = [
      `report-path=${outputs.reportPath}`,
      `metrics-count=${outputs.metricsCount}`,
      `data-points=${outputs.dataPoints}`,
    ];

    if (outputs.timeRangeStart) {
      outputLines.push(`time-range-start=${outputs.timeRangeStart}`);
    }
    if (outputs.timeRangeEnd) {
      outputLines.push(`time-range-end=${outputs.timeRangeEnd}`);
    }

    await fs.writeFile(outputFile, outputLines.join("\n"));
  }

  // Close database connection after all operations are complete
  await db.close();

  core.info("Action completed successfully");
}

run().catch((error) => {
  core.setFailed(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
});
