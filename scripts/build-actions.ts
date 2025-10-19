#!/usr/bin/env bun

import { build, type BunPlugin } from "bun";
import { resolve, dirname } from "path";
import { mkdir } from "fs/promises";

const excludeBunSqlitePlugin: BunPlugin = {
  name: "exclude-bun-sqlite",
  setup(builder) {
    builder.onLoad({ filter: /bun-sqlite\.ts$/ }, () => {
      return {
        contents: `
export class BunSqliteAdapter {
  constructor() {
    throw new Error("BunSqliteAdapter is not available in Node.js runtime");
  }
}
        `,
        loader: "ts",
      };
    });
  },
};

const buildAction = async (entrypoint: string, outdir: string, outfile: string): Promise<void> => {
  const outPath = resolve(outdir, outfile);
  console.log(`Building ${entrypoint} -> ${outPath}`);

  await mkdir(dirname(outPath), { recursive: true });

  await build({
    entrypoints: [entrypoint],
    outdir,
    target: "node",
    naming: outfile,
    plugins: [excludeBunSqlitePlugin],
    external: ["better-sqlite3", "@actions/artifact"],
  });

  console.log(`✓ Built ${outfile}`);
};

const main = async () => {
  try {
    // Build for composite actions (legacy)
    await buildAction(
      "./src/actions/collect.ts",
      "./.github/actions/collect-metrics/dist",
      "collect.js"
    );

    await buildAction(
      "./src/actions/report.ts",
      "./.github/actions/generate-report/dist",
      "report.js"
    );

    await buildAction(
      "./src/actions/find-database.ts",
      "./.github/actions/find-database/dist",
      "find-database.js"
    );

    // Build for direct workflow usage
    await buildAction("./src/actions/collect.ts", "./dist/actions", "collect.js");

    await buildAction("./src/actions/report.ts", "./dist/actions", "report.js");

    await buildAction("./src/actions/find-database.ts", "./dist/actions", "find-database.js");

    console.log("\n✓ All actions built successfully");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

main();
