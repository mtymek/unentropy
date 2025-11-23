import type { Argv } from "yargs";
import { loadConfig } from "../../config/loader.js";
import { cmd } from "./cmd";

interface VerifyArgs {
  config?: string;
}

export const VerifyCommand = cmd({
  command: "verify [config]",
  describe: "verify unentropy.json configuration file",
  builder: (yargs: Argv<VerifyArgs>) => {
    return yargs.positional("config", {
      type: "string",
      description: "path to configuration file",
      default: "unentropy.json",
    });
  },
  async handler(argv: VerifyArgs) {
    try {
      await loadConfig(argv.config);
      console.log(`✓ Configuration file ${argv.config} is valid`);
    } catch (error) {
      console.error(`✗ Configuration file ${argv.config} is invalid:`);
      console.error(`  ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  },
});
