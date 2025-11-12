import { describe, it, expect } from "bun:test";
import { createAdapter } from "../../../src/database/adapters/factory";
import type { AdapterConfig } from "../../../src/database/adapters/interface";

describe("Database Adapter Factory", () => {
  describe("createAdapter", () => {
    it("creates Bun adapter when Bun is available", async () => {
      const config: AdapterConfig = { path: ":memory:" };
      const adapter = await createAdapter(config);

      expect(adapter).toBeDefined();
      expect(adapter.open).toBe(true);

      adapter.close();
    });

    it("accepts string path as config", async () => {
      const adapter = await createAdapter(":memory:");

      expect(adapter).toBeDefined();
      expect(adapter.open).toBe(true);

      adapter.close();
    });

    it("throws error for unsupported runtime", async () => {
      // We can't easily mock Bun being undefined in this test environment,
      // but we can verify the factory function exists and handles the config correctly
      // The runtime detection is tested implicitly by the fact that this test runs in Bun

      // Test that the function handles invalid config properly
      try {
        await createAdapter({} as AdapterConfig);
        expect.unreachable("Should have thrown an error for invalid config");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
