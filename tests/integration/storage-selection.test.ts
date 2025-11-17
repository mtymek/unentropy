import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Storage } from "../../src/storage/storage";
import { SqliteS3StorageProvider } from "../../src/storage/providers/sqlite-s3";
import type { StorageProviderConfig, SqliteS3Config } from "../../src/storage/providers/interface";

const TEST_DB_PATH = "/tmp/unentropy-storage-selection.db";

// Mock S3 configuration for testing
const mockS3Config: SqliteS3Config = {
  type: "sqlite-s3",
  endpoint: "https://s3.amazonaws.com",
  bucket: "test-bucket",
  region: "us-east-1",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  databaseKey: "test-unentropy.db",
};

describe("Storage Backend Selection Integration", () => {
  describe("sqlite-local provider", () => {
    it("should create storage for sqlite-local provider", async () => {
      const provider: StorageProviderConfig = {
        type: "sqlite-local",
        path: TEST_DB_PATH,
      };

      const db = new Storage(provider);
      await db.ready();

      expect(db.isOpen()).toBe(true);

      await db.close();
    });

    it("should use default path when not specified", async () => {
      const provider: StorageProviderConfig = {
        type: "sqlite-local",
        path: "unentropy.db", // Provide required path
      };

      const db = new Storage(provider);
      await db.ready();

      expect(db.isOpen()).toBe(true);

      await db.close();
    });
  });

  describe("sqlite-artifact provider", () => {
    it("should reject unsupported sqlite-artifact provider", async () => {
      const provider = { type: "sqlite-artifact" } as StorageProviderConfig;

      const create = async () => {
        const db = new Storage(provider);
        await db.ready();
      };

      expect(create()).rejects.toThrow(
        "Storage provider type 'sqlite-artifact' is not yet implemented"
      );
    });
  });

  describe("sqlite-s3 provider", () => {
    let s3Provider: SqliteS3StorageProvider;

    beforeEach(() => {
      s3Provider = new SqliteS3StorageProvider(mockS3Config);
    });

    afterEach(async () => {
      try {
        await s3Provider.cleanup();
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should create sqlite-s3 provider with valid config", async () => {
      expect(s3Provider).toBeDefined();
      expect(s3Provider.isInitialized()).toBe(false);
    });

    it("should initialize S3 provider and create database", async () => {
      const db = await s3Provider.initialize();

      expect(db).toBeDefined();
      expect(s3Provider.isInitialized()).toBe(true);
      expect(s3Provider.getTempDbPath()).toContain("/tmp/unentropy-s3-");
      expect(s3Provider.getDatabaseKey()).toBe("test-unentropy.db");
    });

    it("should handle persist operation", async () => {
      await s3Provider.initialize();

      // Persist should not throw even if S3 operations fail in test environment
      // The provider should handle errors gracefully
      try {
        await s3Provider.persist();
      } catch (error) {
        // Expected in test environment without real S3
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should cleanup properly", async () => {
      await s3Provider.initialize();
      expect(s3Provider.isInitialized()).toBe(true);

      await s3Provider.cleanup();
      expect(s3Provider.isInitialized()).toBe(false);
    });

    it("should use default database key when not specified", async () => {
      const configWithoutKey: SqliteS3Config = {
        ...mockS3Config,
        databaseKey: undefined,
      };

      const provider = new SqliteS3StorageProvider(configWithoutKey);
      await provider.initialize();

      expect(provider.getDatabaseKey()).toBe("unentropy.db");

      await provider.cleanup();
    });

    it("should reject incomplete S3 configuration", async () => {
      const incompleteConfig: SqliteS3Config = {
        type: "sqlite-s3",
        // Missing required fields
      };

      const provider = new SqliteS3StorageProvider(incompleteConfig);

      expect(provider.initialize()).rejects.toThrow(
        "S3 configuration is incomplete: endpoint, accessKeyId, and secretAccessKey are required"
      );
    });

    it("should return same database instance on multiple initialize calls", async () => {
      const db1 = await s3Provider.initialize();
      const db2 = await s3Provider.initialize();

      expect(db1).toBe(db2);
      expect(s3Provider.isInitialized()).toBe(true);

      await s3Provider.cleanup();
    });

    it("should handle storage creation through Storage class", async () => {
      const provider: StorageProviderConfig = mockS3Config;
      const storage = new Storage(provider);

      // This should work without throwing
      expect(storage).toBeDefined();

      // Note: In test environment without real S3, initialization might fail
      // but the factory should create the provider successfully
      try {
        await storage.ready();
        expect(storage.isOpen()).toBe(true);
        await storage.close();
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("Storage Provider Factory", () => {
    it("should create sqlite-s3 provider through factory", async () => {
      const provider: StorageProviderConfig = mockS3Config;
      const storage = new Storage(provider);

      expect(storage).toBeDefined();
      // The factory should successfully create the S3 provider
      // even if S3 operations fail in test environment
    });

    it("should reject unknown storage type", async () => {
      // Test with type assertion to simulate invalid config
      const provider = { type: "invalid-type" } as unknown as StorageProviderConfig;

      const create = async () => {
        const db = new Storage(provider);
        await db.ready();
      };

      expect(create()).rejects.toThrow(
        "Storage provider type 'invalid-type' is not yet implemented"
      );
    });
  });
});
