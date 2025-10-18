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
      "./src/actions/collect.node.ts",
      "./.github/actions/collect-metrics/dist",
      "collect.node.js"
    );

    await buildAction(
      "./src/actions/report.node.ts",
      "./.github/actions/generate-report/dist",
      "report.node.js"
    );

    // Build for direct workflow usage
    await buildAction("./src/actions/collect.node.ts", "./dist/actions", "collect.node.js");

    await buildAction("./src/actions/report.node.ts", "./dist/actions", "report.node.js");

    console.log("\n✓ All actions built successfully");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

main();
