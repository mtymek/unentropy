import type { Argv } from "yargs";
import { cmd } from "./cmd";
import { parseSize } from "../../metrics/collectors/size";
import { parseLcovCoverage } from "../../metrics/collectors/lcov";

const SizeCommand = cmd({
  command: "size <paths...>",
  describe: "calculate size of files and directories",
  builder: (yargs: Argv) => {
    return yargs
      .positional("paths", {
        type: "string",
        description: "paths to files or directories",
        array: true,
      })
      .options({
        followSymlinks: {
          type: "boolean",
          description: "follow symbolic links",
          default: false,
        },
      });
  },
  async handler(argv: { paths?: string[]; followSymlinks?: boolean; [key: string]: unknown }) {
    const { paths, followSymlinks } = argv;

    if (!paths || paths.length === 0) {
      throw new Error("At least one path is required");
    }

    let totalSize = 0;

    for (const path of paths) {
      const size = await parseSize(path, { followSymlinks });
      totalSize += size;
    }

    console.log(totalSize);
  },
});

const CoverageLcovCommand = cmd({
  command: "coverage-lcov <sourcePath>",
  describe: "parse LCOV coverage reports",
  builder: (yargs: Argv) => {
    return yargs
      .positional("sourcePath", {
        type: "string",
        description: "path to LCOV file",
      })
      .options({
        fallback: {
          type: "number",
          description: "fallback value if parsing fails",
          default: 0,
        },
      });
  },
  async handler(argv: { sourcePath?: string; fallback?: number; [key: string]: unknown }) {
    try {
      if (!argv.sourcePath) {
        throw new Error("Source path is required");
      }
      const coverage = await parseLcovCoverage(argv.sourcePath, { fallback: argv.fallback });
      console.log(coverage);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log(argv.fallback || 0);
    }
  },
});

const CoverageJsonCommand = cmd({
  command: "coverage-json <sourcePath>",
  describe: "parse JSON coverage reports",
  builder: (yargs: Argv) => {
    return yargs
      .positional("sourcePath", {
        type: "string",
        description: "path to JSON coverage file",
      })
      .options({
        fallback: {
          type: "number",
          description: "fallback value if parsing fails",
          default: 0,
        },
      });
  },
  async handler(argv: { sourcePath?: string; fallback?: number; [key: string]: unknown }) {
    try {
      if (!argv.sourcePath) {
        throw new Error("Source path is required");
      }
      // TODO: Implement JSON parser in T044
      console.log("0");
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log(argv.fallback || 0);
    }
  },
});

const CoverageXmlCommand = cmd({
  command: "coverage-xml <sourcePath>",
  describe: "parse XML coverage reports",
  builder: (yargs: Argv) => {
    return yargs
      .positional("sourcePath", {
        type: "string",
        description: "path to XML coverage file",
      })
      .options({
        fallback: {
          type: "number",
          description: "fallback value if parsing fails",
          default: 0,
        },
      });
  },
  async handler(argv: { sourcePath?: string; fallback?: number; [key: string]: unknown }) {
    try {
      if (!argv.sourcePath) {
        throw new Error("Source path is required");
      }
      // TODO: Implement XML parser in T045
      console.log("0");
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log(argv.fallback || 0);
    }
  },
});

export const CollectCommand = cmd({
  command: "collect",
  describe: "collect metrics from standard format files",
  builder: (yargs: Argv) => {
    return yargs
      .command(SizeCommand)
      .command(CoverageLcovCommand)
      .command(CoverageJsonCommand)
      .command(CoverageXmlCommand)
      .demandCommand();
  },
  async handler() {
    // No-op, handled by subcommands
  },
});
