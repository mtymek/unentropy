import { S3Storage, S3Credentials, S3Configuration } from "./s3";
import { MergedConfiguration, ActionInputs } from "../config/storage-schema";

/**
 * Abstract storage interface
 */
export interface StorageBackend {
  download(key: string): Promise<Buffer>;
  upload(key: string, data: Buffer): Promise<any>;
  exists(key: string): Promise<boolean>;
  getLastModified(key: string): Promise<Date | null>;
  getSize(key: string): Promise<number | null>;
}

/**
 * Storage factory for creating appropriate storage backend
 */
export class StorageFactory {
  /**
   * Create storage backend based on configuration
   */
  static createStorage(config: MergedConfiguration, inputs: ActionInputs): StorageBackend {
    switch (config.storage.type) {
      case "s3":
        return StorageFactory.createS3Storage(config, inputs);
      case "artifact":
        return StorageFactory.createArtifactStorage(config);
      default:
        throw new Error(
          `Unsupported storage type: ${config.storage.type}. Supported types: 'artifact', 's3'`
        );
    }
  }

  /**
   * Create S3 storage backend
   */
  private static createS3Storage(config: MergedConfiguration, inputs: ActionInputs): S3Storage {
    if (!config.storage.s3) {
      throw new Error("S3 configuration is required for S3 storage");
    }

    if (!inputs.s3AccessKeyId || !inputs.s3SecretAccessKey) {
      throw new Error(
        "S3 credentials (access-key-id, secret-access-key) must be provided as action inputs from GitHub Secrets"
      );
    }

    const credentials: S3Credentials = {
      accessKeyId: inputs.s3AccessKeyId,
      secretAccessKey: inputs.s3SecretAccessKey,
      sessionToken: inputs.s3SessionToken,
    };

    return new S3Storage(config.storage.s3, credentials);
  }

  /**
   * Create artifact storage backend
   */
  private static createArtifactStorage(config: MergedConfiguration): StorageBackend {
    return new ArtifactStorage();
  }

  /**
   * Validate storage configuration
   */
  static validateStorageConfig(config: MergedConfiguration, inputs: ActionInputs): void {
    // Validate storage type
    if (!["artifact", "s3"].includes(config.storage.type)) {
      throw new Error(`Invalid storage-type: ${config.storage.type}. Must be 'artifact' or 's3'`);
    }

    // S3-specific validation
    if (config.storage.type === "s3") {
      if (!config.storage.s3) {
        throw new Error("S3 configuration is required for S3 storage");
      }

      const missing = [];
      if (!config.storage.s3.endpoint) missing.push("endpoint");
      if (!config.storage.s3.bucket) missing.push("bucket");
      if (!config.storage.s3.region) missing.push("region");

      if (missing.length > 0) {
        throw new Error(
          `Missing required S3 configuration: ${missing.join(
            ", "
          )}. Provide via action inputs or unentropy.json`
        );
      }

      // Validate endpoint URL
      try {
        new URL(config.storage.s3.endpoint);
      } catch {
        throw new Error(`Invalid S3 endpoint URL: ${config.storage.s3.endpoint}`);
      }

      // Credentials must come from action inputs (security requirement)
      if (!inputs.s3AccessKeyId || !inputs.s3SecretAccessKey) {
        throw new Error(
          "S3 credentials (access-key-id, secret-access-key) must be provided as action inputs from GitHub Secrets"
        );
      }
    }
  }
}

/**
 * Artifact storage backend (placeholder for GitHub Artifacts)
 * Note: This is a simplified implementation since track-metrics action focuses on S3
 */
class ArtifactStorage implements StorageBackend {
  async download(key: string): Promise<Buffer> {
    throw new Error(
      "Artifact storage not implemented in track-metrics action. Use S3 storage or individual actions (collect, find-database, report)."
    );
  }

  async upload(key: string, data: Buffer): Promise<any> {
    throw new Error(
      "Artifact storage not implemented in track-metrics action. Use S3 storage or individual actions (collect, find-database, report)."
    );
  }

  async exists(key: string): Promise<boolean> {
    throw new Error(
      "Artifact storage not implemented in track-metrics action. Use S3 storage or individual actions (collect, find-database, report)."
    );
  }

  async getLastModified(key: string): Promise<Date | null> {
    throw new Error(
      "Artifact storage not implemented in track-metrics action. Use S3 storage or individual actions (collect, find-database, report)."
    );
  }

  async getSize(key: string): Promise<number | null> {
    throw new Error(
      "Artifact storage not implemented in track-metrics action. Use S3 storage or individual actions (collect, find-database, report)."
    );
  }
}
