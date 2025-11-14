import { readFile } from "fs/promises";
import { validateConfig } from "./schema";
import type { UnentropyConfig } from "./schema";

export async function loadConfig(configPath: string = 'unentropy.json'): Promise<UnentropyConfig> {
  const fileContent = await readFile(configPath, "utf-8");
  const parsedJson = JSON.parse(fileContent);

  return validateConfig(parsedJson);
}
