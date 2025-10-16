#!/usr/bin/env bun

import { DatabaseClient } from "../src/database/client";
import { generateReport } from "../src/reporter/generator";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

interface FixtureConfig {
  name: string;
  dbPath: string;
  outputPath: string;
  buildCount: number;
  metricGenerators: {
    name: string;
    type: "numeric" | "label";
    description: string;
    unit?: string;
    valueGenerator: (buildIndex: number) => number | string;
  }[];
}

const FIXTURES: Record<string, FixtureConfig> = {
  minimal: {
    name: "minimal",
    dbPath: "tests/fixtures/visual-review/minimal/minimal.db",
    outputPath: "tests/fixtures/visual-review/minimal/report.html",
    buildCount: 5,
    metricGenerators: [
      {
        name: "test-coverage",
        type: "numeric",
        description: "Code coverage percentage",
        unit: "%",
        valueGenerator: (i) => 82.1 + i * 0.85,
      },
    ],
  },

  "full-featured": {
    name: "full-featured",
    dbPath: "tests/fixtures/visual-review/full-featured/full-featured.db",
    outputPath: "tests/fixtures/visual-review/full-featured/report.html",
    buildCount: 25,
    metricGenerators: [
      {
        name: "test-coverage",
        type: "numeric",
        description: "Percentage of code covered by tests",
        unit: "%",
        valueGenerator: (i) => 75 + Math.sin(i * 0.3) * 10 + i * 0.4,
      },
      {
        name: "bundle-size",
        type: "numeric",
        description: "JavaScript bundle size in KB",
        unit: "KB",
        valueGenerator: (i) => 250 - Math.cos(i * 0.2) * 20 - i * 0.5,
      },
      {
        name: "build-status",
        type: "label",
        description: "CI build result",
        valueGenerator: (i) => (i % 7 === 0 ? "failure" : i % 10 === 0 ? "warning" : "success"),
      },
      {
        name: "primary-language",
        type: "label",
        description: "Most used programming language",
        valueGenerator: (i) =>
          ["TypeScript", "JavaScript", "TypeScript", "TypeScript", "Python"][i % 5] || "TypeScript",
      },
    ],
  },

  "sparse-data": {
    name: "sparse-data",
    dbPath: "tests/fixtures/visual-review/sparse-data/sparse-data.db",
    outputPath: "tests/fixtures/visual-review/sparse-data/report.html",
    buildCount: 3,
    metricGenerators: [
      {
        name: "test-coverage",
        type: "numeric",
        description: "Code coverage percentage",
        unit: "%",
        valueGenerator: (i) => [78.5, 82.1, 85.3][i] || 80,
      },
      {
        name: "build-status",
        type: "label",
        description: "CI build result",
        valueGenerator: (i) => ["success", "failure", "success"][i] || "success",
      },
    ],
  },

  "edge-cases": {
    name: "edge-cases",
    dbPath: "tests/fixtures/visual-review/edge-cases/edge-cases.db",
    outputPath: "tests/fixtures/visual-review/edge-cases/report.html",
    buildCount: 10,
    metricGenerators: [
      {
        name: "test-coverage",
        type: "numeric",
        description:
          "This is a very long description that tests how the template handles descriptions with many characters and ensures that the layout doesn't break when displaying lengthy explanatory text about what a particular metric represents",
        unit: "%",
        valueGenerator: () => 0,
      },
      {
        name: "bundle-size-kb",
        type: "numeric",
        description: "Bundle size with special chars: @/\\*",
        unit: "KB",
        valueGenerator: () => 9999999.99,
      },
      {
        name: "flatline-metric",
        type: "numeric",
        description: "A metric that never changes",
        unit: "count",
        valueGenerator: () => 100,
      },
      {
        name: "negative-metric",
        type: "numeric",
        description: "Metric with negative values",
        unit: "delta",
        valueGenerator: (i) => -50 + i * 1.5,
      },
      {
        name: "special-chars-label",
        type: "label",
        description: "Label with special characters: <script>alert('xss')</script>",
        valueGenerator: (i) =>
          ["<script>alert('xss')</script>", "normal-value", '"quoted"', "apostrophe's", "&amp;"][
            i % 5
          ] || "normal",
      },
    ],
  },
};

async function generateFixture(config: FixtureConfig): Promise<void> {
  console.log(`\n📦 Generating fixture: ${config.name}`);
  console.log(`  Database: ${config.dbPath}`);
  console.log(`  Output: ${config.outputPath}`);

  const fs = await import("fs/promises");
  try {
    await fs.unlink(config.dbPath);
  } catch {}

  const db = new DatabaseClient({ path: config.dbPath });
  await db.ready();

  const baseTimestamp = new Date("2025-01-01T00:00:00Z").getTime();
  const dayInMs = 24 * 60 * 60 * 1000;

  const buildInterval = config.buildCount > 10 ? 1 : 1;

  for (let i = 0; i < config.buildCount; i++) {
    const buildTimestamp = new Date(baseTimestamp + i * buildInterval * dayInMs).toISOString();
    const commitSha = `abc${i.toString().padStart(4, "0")}def0123456789012345678901234`;

    const buildId = db.insertBuildContext({
      commit_sha: commitSha,
      branch: "main",
      run_id: `run-${i + 1000}`,
      run_number: i + 1,
      actor: "test-bot",
      event_name: "push",
      timestamp: buildTimestamp,
    });

    for (const metricGen of config.metricGenerators) {
      const metricDef = db.upsertMetricDefinition({
        name: metricGen.name,
        type: metricGen.type,
        description: metricGen.description,
        unit: metricGen.unit || null,
      });

      const value = metricGen.valueGenerator(i);
      const collectedAt = new Date(
        new Date(buildTimestamp).getTime() + Math.random() * 60000
      ).toISOString();

      db.insertMetricValue({
        metric_id: metricDef.id,
        build_id: buildId,
        value_numeric: metricGen.type === "numeric" ? Number(value) : null,
        value_label: metricGen.type === "label" ? String(value) : null,
        collected_at: collectedAt,
        collection_duration_ms: Math.floor(Math.random() * 5000) + 100,
      });
    }
  }

  console.log(
    `  ✅ Generated ${config.buildCount} builds with ${config.metricGenerators.length} metrics each`
  );

  const html = generateReport(db, {
    repository: `unentropy/fixture-${config.name}`,
  });

  mkdirSync(dirname(config.outputPath), { recursive: true });
  writeFileSync(config.outputPath, html, "utf-8");
  console.log(`  ✅ HTML report generated: ${config.outputPath}`);

  db.close();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fixtureArg = args.find((arg) => arg.startsWith("--fixture="))?.split("=")[1];

  if (fixtureArg && fixtureArg !== "all") {
    const config = FIXTURES[fixtureArg];
    if (!config) {
      console.error(`❌ Unknown fixture: ${fixtureArg}`);
      console.error(`Available fixtures: ${Object.keys(FIXTURES).join(", ")}`);
      process.exit(1);
    }
    await generateFixture(config);
  } else {
    console.log("🚀 Generating all visual test fixtures...\n");
    for (const config of Object.values(FIXTURES)) {
      await generateFixture(config);
    }
    console.log("\n✨ All fixtures generated successfully!");
    console.log("\n📖 To review reports, open:");
    console.log("   tests/fixtures/visual-review/*/report.html");
  }
}

main().catch((error) => {
  console.error("❌ Error generating fixtures:", error);
  process.exit(1);
});
