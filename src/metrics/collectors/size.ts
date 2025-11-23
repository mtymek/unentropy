import { $ } from "bun";

export interface SizeOptions {
  followSymlinks?: boolean;
  excludePatterns?: string[];
}

/**
 * Parse size of a file or directory using `du` command
 * Returns size in bytes
 */
export async function parseSize(sourcePath: string, options: SizeOptions = {}): Promise<number> {
  // Validate input path
  if (!sourcePath || typeof sourcePath !== "string") {
    throw new Error("Source path must be a non-empty string");
  }

  // Build du command using Bun's shell with automatic escaping
  let command;
  if (options.followSymlinks) {
    command = $`du -sbL ${sourcePath}`;
  } else {
    command = $`du -sb ${sourcePath}`;
  }

  // Execute du command and get output
  const output = await command.text();

  // Parse output: format is "size\tpath"
  const trimmedOutput = output.trim();
  if (!trimmedOutput) {
    throw new Error("du command returned empty output");
  }

  const match = trimmedOutput.match(/^(\d+)/);
  if (!match) {
    throw new Error(`Unable to parse du output: ${trimmedOutput}`);
  }

  const sizeStr = match[1];
  if (!sizeStr) {
    throw new Error(`Unable to extract size from du output: ${trimmedOutput}`);
  }

  const sizeInBytes = parseInt(sizeStr, 10);
  if (isNaN(sizeInBytes)) {
    throw new Error(`Invalid size value in du output: ${sizeStr}`);
  }

  return sizeInBytes;
}
