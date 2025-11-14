// Use dynamic import to handle different build targets
let S3Client: any;

try {
  S3Client = require("bun").S3Client;
} catch {
  // Fallback for Node.js builds - would need AWS SDK or alternative
  throw new Error("S3Storage requires Bun runtime. Use 'bun' target in build configuration.");
}

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string; // For temporary credentials
}

export interface S3Configuration {
  endpoint: string;
  bucket: string;
  region: string;
}

export interface UploadResult {
  key: string;
  etag?: string;
  versionId?: string;
  size: number;
  lastModified: Date;
}

/**
 * Direct S3 storage operations using Bun's native S3 client.
 */
export class S3Storage {
  private client: any;

  constructor(config: S3Configuration, credentials: S3Credentials) {
    // Validate configuration
    this.validateConfig(config);
    this.validateCredentials(credentials);

    this.client = new S3Client({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      bucket: config.bucket,
      region: config.region,
      endpoint: config.endpoint,
    });
  }

  /**
   * Validate S3 configuration
   */
  private validateConfig(config: S3Configuration): void {
    if (!config.endpoint) {
      throw new Error("S3 endpoint is required");
    }
    if (!config.bucket) {
      throw new Error("S3 bucket name is required");
    }
    if (!config.region) {
      throw new Error("S3 region is required");
    }

    // Validate endpoint URL format
    try {
      new URL(config.endpoint);
    } catch {
      throw new Error(`Invalid S3 endpoint URL: ${config.endpoint}`);
    }

    // Validate bucket name format (basic S3 bucket naming rules)
    if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(config.bucket)) {
      throw new Error(
        `Invalid S3 bucket name: ${config.bucket}. Bucket names must be lowercase and contain only letters, numbers, dots, and hyphens`
      );
    }

    if (config.bucket.length < 3 || config.bucket.length > 63) {
      throw new Error(
        `Invalid S3 bucket name: ${config.bucket}. Bucket names must be between 3 and 63 characters`
      );
    }
  }

  /**
   * Validate S3 credentials
   */
  private validateCredentials(credentials: S3Credentials): void {
    if (!credentials.accessKeyId) {
      throw new Error("S3 access key ID is required");
    }
    if (!credentials.secretAccessKey) {
      throw new Error("S3 secret access key is required");
    }
    if (credentials.accessKeyId.length < 16) {
      throw new Error("S3 access key ID appears to be invalid (too short)");
    }
    if (credentials.secretAccessKey.length < 32) {
      throw new Error("S3 secret access key appears to be invalid (too short)");
    }
  }

  /**
   * Download file from S3 storage
   */
  async download(key: string): Promise<Buffer> {
    try {
      const file = this.client.file(key);
      const data = await file.bytes();
      return Buffer.from(data);
    } catch (error) {
      throw new Error(`S3 download failed for ${key}: ${(error as Error).message}`);
    }
  }

  /**
   * Download database file with integrity validation
   */
  async downloadDatabase(key: string): Promise<Buffer> {
    try {
      // Check if database exists first
      const exists = await this.exists(key);
      if (!exists) {
        throw new Error(`Database file not found: ${key}`);
      }

      // Download the database
      const data = await this.download(key);

      // Validate SQLite database header (SQLite magic number: "SQLite format 3")
      if (data.length < 16) {
        throw new Error(`Downloaded database is too small to be valid: ${data.length} bytes`);
      }

      const header = data.subarray(0, 16).toString();
      if (!header.startsWith("SQLite format 3")) {
        throw new Error(
          `Downloaded file is not a valid SQLite database. Invalid header: ${header}`
        );
      }

      return data;
    } catch (error) {
      throw new Error(`Database download failed for ${key}: ${(error as Error).message}`);
    }
  }

  /**
   * Upload file to S3 storage
   */
  async upload(key: string, data: Buffer): Promise<UploadResult> {
    try {
      const file = this.client.file(key);
      const bytesWritten = await file.write(data);

      // Get file metadata
      const stat = await file.stat();

      return {
        key,
        etag: stat.etag,
        size: bytesWritten,
        lastModified: stat.lastModified,
      };
    } catch (error) {
      throw new Error(`S3 upload failed for ${key}: ${(error as Error).message}`);
    }
  }

  /**
   * Upload database file with integrity validation
   */
  async uploadDatabase(key: string, data: Buffer): Promise<UploadResult> {
    try {
      // Validate database before upload
      if (data.length < 16) {
        throw new Error(`Database is too small to be valid: ${data.length} bytes`);
      }

      const header = data.subarray(0, 16).toString();
      if (!header.startsWith("SQLite format 3")) {
        throw new Error(`File is not a valid SQLite database. Invalid header: ${header}`);
      }

      // Upload the database
      const result = await this.upload(key, data);

      // Verify upload was successful
      const verifyExists = await this.exists(key);
      if (!verifyExists) {
        throw new Error(`Database upload verification failed: file not found after upload`);
      }

      const verifySize = await this.getSize(key);
      if (verifySize !== data.length) {
        throw new Error(
          `Database upload size mismatch: expected ${data.length}, got ${verifySize}`
        );
      }

      return result;
    } catch (error) {
      throw new Error(`Database upload failed for ${key}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if file exists in S3 storage
   */
  async exists(key: string): Promise<boolean> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get last modified timestamp for file
   */
  async getLastModified(key: string): Promise<Date | null> {
    try {
      const stat = await this.client.stat(key);
      return stat.lastModified;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get file size in bytes
   */
  async getSize(key: string): Promise<number | null> {
    try {
      const stat = await this.client.stat(key);
      return stat.size;
    } catch (error) {
      return null;
    }
  }
}
