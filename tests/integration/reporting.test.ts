import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { DatabaseClient } from "../../src/database/client";
import { generateReport } from "../../src/reporter/generator";
import fs from "fs";

const TEST_DB_PATH = "/tmp/test-integration-reporting.db";

describe("Full reporting workflow integration", () => {
  let db: DatabaseClient;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    db = new DatabaseClient({ path: TEST_DB_PATH });
    await db.initialize();

    const coverageMetric = db.upsertMetricDefinition({
      name: "test-coverage",
      type: "numeric",
      unit: "%",
      description: "Code coverage percentage",
    });

    const bundleSizeMetric = db.upsertMetricDefinition({
      name: "bundle-size",
      type: "numeric",
      unit: "KB",
      description: "Total bundle size",
    });

    const statusMetric = db.upsertMetricDefinition({
      name: "build-status",
      type: "label",
      description: "Build status result",
    });

    for (let i = 0; i < 15; i++) {
      const buildId = db.insertBuildContext({
        commit_sha: `commit-${i}`,
        branch: "main",
        run_id: `run-${i}`,
        run_number: i + 1,
        timestamp: new Date(Date.UTC(2025, 9, i + 1, 12, 0, 0)).toISOString(),
      });

      db.insertMetricValue({
        metric_id: coverageMetric.id,
        build_id: buildId,
        value_numeric: 80 + Math.random() * 10,
        collected_at: new Date(Date.UTC(2025, 9, i + 1, 12, 0, 0)).toISOString(),
      });

      db.insertMetricValue({
        metric_id: bundleSizeMetric.id,
        build_id: buildId,
        value_numeric: 450 + Math.random() * 50,
        collected_at: new Date(Date.UTC(2025, 9, i + 1, 12, 0, 0)).toISOString(),
      });

      db.insertMetricValue({
        metric_id: statusMetric.id,
        build_id: buildId,
        value_label: i % 10 === 0 ? "failure" : "success",
        collected_at: new Date(Date.UTC(2025, 9, i + 1, 12, 0, 0)).toISOString(),
      });
    }
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  test("generates complete HTML report with multiple metrics", () => {
    const html = generateReport(db, {
      repository: "test-org/test-repo",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("test-org/test-repo");
    expect(html).toContain("test-coverage");
    expect(html).toContain("bundle-size");
    expect(html).toContain("Code coverage percentage");
    expect(html).toContain("Total bundle size");
  });

  test("includes chart configurations for numeric metrics", () => {
    const html = generateReport(db, {
      repository: "test-org/test-repo",
    });

    expect(html).toContain("const chartsData = ");
    expect(html).toMatch(/"id":"test-coverage"/);
    expect(html).toMatch(/"id":"bundle-size"/);
    expect(html).toMatch(/"type":"line"/);
  });

  test("includes charts for label metrics as bar charts", () => {
    const html = generateReport(db, {
      repository: "test-org/test-repo",
    });

    expect(html).toContain("build-status");
    expect(html).toMatch(/"id":"build-status"/);
    expect(html).toMatch(/"type":"bar"/);
  });

  test("does not show sparse data warning for metrics with sufficient data", () => {
    const html = generateReport(db, {
      repository: "test-org/test-repo",
    });

    expect(html).not.toContain("Limited data available");
  });

  test("filters metrics by name when specified", () => {
    const html = generateReport(db, {
      repository: "test-org/test-repo",
      metricNames: ["test-coverage"],
    });

    expect(html).toContain("test-coverage");
    expect(html).not.toContain("bundle-size");
    expect(html).not.toContain("build-status");
  });

  test("includes metadata with correct build count and date range", () => {
    const html = generateReport(db, {
      repository: "test-org/test-repo",
    });

    expect(html).toContain("Total Builds: 15");
    expect(html).toMatch(/Data Range:.*Oct.*2025/);
  });

  test("handles XSS in repository name", () => {
    const html = generateReport(db, {
      repository: "test<script>alert('xss')</script>/repo",
    });

    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  test("generates self-contained HTML with CDN links", () => {
    const html = generateReport(db, {
      repository: "test-org/test-repo",
    });

    expect(html).toContain("https://cdn.tailwindcss.com");
    expect(html).toContain("https://cdn.jsdelivr.net/npm/chart.js");
    expect(html).toContain("chartjs-adapter-date-fns");
  });

  test("includes responsive and dark mode classes", () => {
    const html = generateReport(db, {
      repository: "test-org/test-repo",
    });

    expect(html).toContain("dark:bg-gray");
    expect(html).toContain("sm:grid-cols");
    expect(html).toContain("lg:grid-cols");
  });

  test("includes print styles", () => {
    const html = generateReport(db, {
      repository: "test-org/test-repo",
    });

    expect(html).toContain("@media print");
    expect(html).toContain("page-break-inside: avoid");
  });

  test("handles empty database gracefully", async () => {
    const emptyDbPath = "/tmp/test-empty-reporting.db";
    if (fs.existsSync(emptyDbPath)) {
      fs.unlinkSync(emptyDbPath);
    }

    const emptyDb = new DatabaseClient({ path: emptyDbPath });
    await emptyDb.initialize();

    const html = generateReport(emptyDb, {
      repository: "empty/repo",
    });

    expect(html).toContain("No metrics data");
    expect(html).toContain("Total Builds: 0");

    emptyDb.close();
    fs.unlinkSync(emptyDbPath);
  });

  test("includes accessibility features", () => {
    const html = generateReport(db, {
      repository: "test-org/test-repo",
    });

    expect(html).toContain("aria-label");
    expect(html).toContain('lang="en"');
    expect(html).toContain("<header");
    expect(html).toContain("<main");
    expect(html).toContain("<footer");
  });
});
