import { z } from "zod";

/**
 * Represents storage configuration in unentropy.json (defaults and non-sensitive settings).
 */
export const StorageConfigurationSchema = z
  .object({
    storage: z.object({
      type: z.enum(["artifact", "s3"]),
      s3: z
        .object({
          endpoint: z.string().url("Invalid S3 endpoint URL"),
          bucket: z.string().min(1, "S3 bucket name is required"),
          region: z.string().min(1, "S3 region is required"),
        })
        .optional(),
    }),
    database: z
      .object({
        key: z.string().optional(),
      })
      .optional(),
    report: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
  })
  .optional();

export type StorageConfiguration = z.infer<typeof StorageConfigurationSchema>;

/**
 * Represents GitHub Action input parameters for S3 credentials and runtime overrides.
 */
export interface ActionInputs {
  storageType: "artifact" | "s3";
  s3Endpoint?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3SessionToken?: string;
  configFile?: string;
  databaseKey?: string;
  reportName?: string;
  timeout?: number;
  retryAttempts?: number;
  verbose?: boolean;
}

/**
 * Merged configuration with precedence: Action Inputs > Configuration File
 */
export interface MergedConfiguration {
  storage: {
    type: "artifact" | "s3";
    s3?: {
      endpoint: string;
      bucket: string;
      region: string;
    };
  };
  database: {
    key: string;
  };
  report: {
    name: string;
  };
}

/**
 * Merge configuration with precedence: Action Inputs > Config File
 */
export function mergeConfiguration(
  fileConfig: StorageConfiguration | undefined,
  inputs: ActionInputs
): MergedConfiguration {
  const merged: MergedConfiguration = {
    storage: {
      type: inputs.storageType || fileConfig?.storage?.type || "artifact",
    },
    database: {
      key: inputs.databaseKey || fileConfig?.database?.key || "unentropy.db",
    },
    report: {
      name: inputs.reportName || fileConfig?.report?.name || "unentropy-report.html",
    },
  };

  // Merge S3 configuration with precedence
  if (merged.storage.type === "s3") {
    merged.storage.s3 = {
      endpoint: inputs.s3Endpoint || fileConfig?.storage?.s3?.endpoint || "",
      bucket: inputs.s3Bucket || fileConfig?.storage?.s3?.bucket || "",
      region: inputs.s3Region || fileConfig?.storage?.s3?.region || "",
    };
  }

  return merged;
}

/**
 * Validate merged configuration
 */
export function validateMergedConfig(config: MergedConfiguration, inputs: ActionInputs): void {
  // Validate storage type
  if (!["artifact", "s3"].includes(config.storage.type)) {
    throw new Error(`Invalid storage-type: ${config.storage.type}. Must be 'artifact' or 's3'`);
  }

  // Validate S3 configuration when S3 storage is selected
  if (config.storage.type === "s3") {
    // Credentials must come from action inputs (security requirement)
    if (!inputs.s3AccessKeyId || !inputs.s3SecretAccessKey) {
      throw new Error(
        `S3 credentials (access-key-id, secret-access-key) must be provided as action inputs from GitHub Secrets`
      );
    }

    // S3 settings can come from inputs or config file
    const s3Config = config.storage.s3!;
    if (!s3Config.endpoint || !s3Config.bucket || !s3Config.region) {
      const missing = [];
      if (!s3Config.endpoint) missing.push("endpoint");
      if (!s3Config.bucket) missing.push("bucket");
      if (!s3Config.region) missing.push("region");
      throw new Error(
        `Missing required S3 configuration: ${missing.join(", ")}. Provide via action inputs or unentropy.json`
      );
    }

    // Validate S3 endpoint URL
    try {
      new URL(s3Config.endpoint);
    } catch {
      throw new Error(`Invalid S3 endpoint URL: ${s3Config.endpoint}`);
    }
  }

  // Validate timeout
  if (inputs.timeout && inputs.timeout < 30000) {
    // Minimum 30 seconds
    throw new Error(`Timeout must be at least 30 seconds`);
  }

  // Validate retry attempts
  if (inputs.retryAttempts && (inputs.retryAttempts < 0 || inputs.retryAttempts > 10)) {
    throw new Error(`Retry attempts must be between 0 and 10`);
  }
}
