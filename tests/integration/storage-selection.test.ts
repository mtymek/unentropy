import { describe, it, expect } from "bun:test";
import { Storage } from "../../src/storage/storage";
import type { StorageProviderConfig } from "../../src/storage/providers/interface";

const TEST_DB_PATH = "/tmp/unentropy-storage-selection.db";

describe("Storage Backend Selection Integration", () => {
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

  it("should reject unsupported sqlite-artifact provider", async () => {
    const provider = { type: "sqlite-artifact" } as any as StorageProviderConfig;

    const create = async () => {
      const db = new Storage(provider);
      await db.ready();
    };

    expect(create()).rejects.toThrow(
      "Storage provider type 'sqlite-artifact' is not yet implemented"
    );
  });
});
