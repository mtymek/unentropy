import { readFile } from "fs/promises";
import { validateConfig } from "./schema";
import type { UnentropyConfig } from "./schema";

export async function loadConfig(configPath: string): Promise<UnentropyConfig> {
  try {
    const fileContent = await readFile(configPath, "utf-8");

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(fileContent);
    } catch (error) {
      throw new Error(
        `Invalid JSON in config file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    return validateConfig(parsedJson);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid JSON")) {
      throw error;
    }
    if (
      error instanceof Error &&
      (error.message.includes("ENOENT") || error.message.includes("no such file"))
    ) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    throw error;
  }
}
