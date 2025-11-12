import type { DatabaseAdapter, AdapterConfig } from "./interface";

function detectRuntime(): "bun" | "node" {
  return typeof Bun !== "undefined" ? "bun" : "node";
}

export async function createAdapter(config: string | AdapterConfig): Promise<DatabaseAdapter> {
  const runtime = detectRuntime();
  const adapterConfig: AdapterConfig = typeof config === "string" ? { path: config } : config;

  if (runtime === "bun") {
    const { BunSqliteAdapter } = await import("./bun-sqlite");
    return new BunSqliteAdapter(adapterConfig);
  }

  const { BetterSqlite3Adapter } = await import("./better-sqlite3");
  return new BetterSqlite3Adapter(adapterConfig);
}
