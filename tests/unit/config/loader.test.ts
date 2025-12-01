import { describe, it, expect } from "bun:test";
import { loadConfig } from "../../../src/config/loader";
import * as path from "path";

describe("Config Loader", () => {
  const fixturesDir = path.join(__dirname, "fixtures");

  it("should parse valid minimal config", async () => {
    const configPath = path.join(fixturesDir, "valid-minimal.json");
    const config = await loadConfig(configPath);

    expect(config.metrics).toHaveLength(1);
    expect(config.metrics[0]?.name).toBe("test-coverage");
    expect(config.metrics[0]?.type).toBe("numeric");
    expect(config.metrics[0]?.command).toBe(
      "npm run test:coverage -- --json | jq -r '.total.lines.pct'"
    );
  });

  it("should parse valid complete config with all fields", async () => {
    const configPath = path.join(fixturesDir, "valid-complete.json");
    const config = await loadConfig(configPath);

    expect(config.metrics).toHaveLength(3);

    const metric = config.metrics[0];
    expect(metric?.name).toBe("test-coverage");
    expect(metric?.type).toBe("numeric");
    expect(metric?.description).toBe("Percentage of code covered by tests");
    expect(metric?.unit).toBe("percent");
    expect(metric?.command).toBe("npm run test:coverage -- --json | jq -r '.total.lines.pct'");
  });

  it("should parse config with label type metric", async () => {
    const configPath = path.join(fixturesDir, "valid-label.json");
    const config = await loadConfig(configPath);

    expect(config.metrics).toHaveLength(1);
    expect(config.metrics[0]?.type).toBe("label");
    expect(config.metrics[0]?.name).toBe("build-status");
  });

  it("should throw error for missing config file", async () => {
    const configPath = path.join(fixturesDir, "nonexistent.json");

    await expect(loadConfig(configPath)).rejects.toThrow();
  });

  it("should throw error for invalid JSON", async () => {
    const configPath = path.join(fixturesDir, "invalid-json.json");

    await expect(loadConfig(configPath)).rejects.toThrow(Error);
  });
});
