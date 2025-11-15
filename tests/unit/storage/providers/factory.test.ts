import { describe, it, expect, afterEach } from "bun:test";
import { createStorageProvider } from "../../../../src/storage/providers/factory";
import type { StorageProviderConfig } from "../../../../src/storage/providers/interface";

describe("createStorageProvider", () => {
  let provider: Awaited<ReturnType<typeof createStorageProvider>> | null = null;

  afterEach(async () => {
    await provider?.cleanup();
    provider = null;
  });

  it("should create sqlite-local provider", async () => {
    const config: StorageProviderConfig = {
      type: "sqlite-local",
      path: ":memory:",
    };

    provider = await createStorageProvider(config);
    expect(provider).toBeDefined();
    expect(provider.isInitialized()).toBe(false);

    const db = await provider.initialize();
    expect(db).toBeDefined();
    expect(provider.isInitialized()).toBe(true);
  });

  it("should throw error for unsupported provider types", async () => {
    const config = {
      type: "sqlite-artifact",
      artifactName: "test",
    } as unknown as StorageProviderConfig;

    try {
      await createStorageProvider(config);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect((error as Error).message).toContain("not yet implemented");
    }
  });
});
