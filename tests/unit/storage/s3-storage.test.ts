import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { S3Storage, S3Credentials, S3Configuration } from "../../../src/storage/s3";

// Simple mock for testing
class MockS3Client {
  constructor(config: any) {
    this.config = config;
  }

  config: any;
  fileMock = {
    bytes: () => Promise.resolve(new Uint8Array([1, 2, 3, 4])),
    write: () => Promise.resolve(9),
    stat: () =>
      Promise.resolve({
        etag: "test-etag",
        versionId: "test-version",
        lastModified: new Date("2023-01-01"),
        size: 1024,
      }),
  };

  file(key: string) {
    return this.fileMock;
  }

  exists(key: string) {
    return Promise.resolve(true);
  }
}

describe("S3Storage", () => {
  let s3Storage: S3Storage;
  let mockConfig: S3Configuration;
  let mockCredentials: S3Credentials;
  let originalRequire: any;

  beforeEach(() => {
    // Store original require
    originalRequire = globalThis.require;

    // Mock require for bun module
    globalThis.require = (id: string) => {
      if (id === "bun") {
        return {
          S3Client: MockS3Client,
        };
      }
      return originalRequire?.(id);
    };

    mockConfig = {
      endpoint: "https://s3.amazonaws.com",
      bucket: "test-bucket",
      region: "us-east-1",
    };

    mockCredentials = {
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      sessionToken: "test-session-token",
    };

    s3Storage = new S3Storage(mockConfig, mockCredentials);
  });

  afterEach(() => {
    // Restore original require
    globalThis.require = originalRequire;
  });

  describe("Constructor", () => {
    it("should create S3Storage with valid configuration", () => {
      expect(s3Storage).toBeDefined();
    });

    it("should create S3Storage without session token", () => {
      const credentialsWithoutToken = {
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key",
      };

      const storage = new S3Storage(mockConfig, credentialsWithoutToken);
      expect(storage).toBeDefined();
    });
  });

  describe("download", () => {
    it("should download file successfully", async () => {
      const result = await s3Storage.download("test-key.txt");
      expect(result).toEqual(Buffer.from(new Uint8Array([1, 2, 3, 4])));
    });

    it("should throw error when download fails", async () => {
      // Mock error case
      const mockClient = new MockS3Client({});
      mockClient.fileMock.bytes = () => Promise.reject(new Error("Network error"));

      globalThis.require = (id: string) => {
        if (id === "bun") {
          return {
            S3Client: () => mockClient,
          };
        }
        return originalRequire?.(id);
      };

      const storage = new S3Storage(mockConfig, mockCredentials);

      await expect(storage.download("test-key.txt")).rejects.toThrow(
        "S3 download failed for test-key.txt: Network error"
      );
    });
  });

  describe("upload", () => {
    it("should upload file successfully", async () => {
      const mockData = Buffer.from("test data");
      const result = await s3Storage.upload("test-key.txt", mockData);

      expect(result).toEqual({
        key: "test-key.txt",
        etag: "test-etag",
        size: 9,
        lastModified: new Date("2023-01-01"),
      });
    });

    it("should throw error when upload fails", async () => {
      // Mock error case
      const mockClient = new MockS3Client({});
      mockClient.fileMock.write = () => Promise.reject(new Error("Upload failed"));

      globalThis.require = (id: string) => {
        if (id === "bun") {
          return {
            S3Client: () => mockClient,
          };
        }
        return originalRequire?.(id);
      };

      const storage = new S3Storage(mockConfig, mockCredentials);
      const mockData = Buffer.from("test data");

      await expect(storage.upload("test-key.txt", mockData)).rejects.toThrow(
        "S3 upload failed for test-key.txt: Upload failed"
      );
    });
  });

  describe("exists", () => {
    it("should return true when file exists", async () => {
      const result = await s3Storage.exists("test-key.txt");
      expect(result).toBe(true);
    });

    it("should return false when file does not exist", async () => {
      // Mock false case
      const mockClient = new MockS3Client({});
      mockClient.exists = () => Promise.resolve(false);

      globalThis.require = (id: string) => {
        if (id === "bun") {
          return {
            S3Client: () => mockClient,
          };
        }
        return originalRequire?.(id);
      };

      const storage = new S3Storage(mockConfig, mockCredentials);
      const result = await storage.exists("test-key.txt");
      expect(result).toBe(false);
    });

    it("should return false when exists check throws error", async () => {
      // Mock error case
      const mockClient = new MockS3Client({});
      mockClient.exists = () => Promise.reject(new Error("Permission denied"));

      globalThis.require = (id: string) => {
        if (id === "bun") {
          return {
            S3Client: () => mockClient,
          };
        }
        return originalRequire?.(id);
      };

      const storage = new S3Storage(mockConfig, mockCredentials);
      const result = await storage.exists("test-key.txt");
      expect(result).toBe(false);
    });
  });

  describe("getLastModified", () => {
    it("should return last modified date when file exists", async () => {
      const result = await s3Storage.getLastModified("test-key.txt");
      expect(result).toBe(new Date("2023-01-01"));
    });

    it("should return null when file does not exist", async () => {
      // Mock error case
      const mockClient = new MockS3Client({});
      mockClient.fileMock.stat = () => Promise.reject(new Error("File not found"));

      globalThis.require = (id: string) => {
        if (id === "bun") {
          return {
            S3Client: () => mockClient,
          };
        }
        return originalRequire?.(id);
      };

      const storage = new S3Storage(mockConfig, mockCredentials);
      const result = await storage.getLastModified("test-key.txt");
      expect(result).toBeNull();
    });
  });

  describe("getSize", () => {
    it("should return file size when file exists", async () => {
      const result = await s3Storage.getSize("test-key.txt");
      expect(result).toBe(1024);
    });

    it("should return null when file does not exist", async () => {
      // Mock error case
      const mockClient = new MockS3Client({});
      mockClient.fileMock.stat = () => Promise.reject(new Error("File not found"));

      globalThis.require = (id: string) => {
        if (id === "bun") {
          return {
            S3Client: () => mockClient,
          };
        }
        return originalRequire?.(id);
      };

      const storage = new S3Storage(mockConfig, mockCredentials);
      const result = await storage.getSize("test-key.txt");
      expect(result).toBeNull();
    });
  });
});
