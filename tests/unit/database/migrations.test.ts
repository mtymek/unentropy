import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseClient } from "../../../src/database/client";
import { initializeSchema } from "../../../src/database/migrations";
import { rm } from "fs/promises";

describe("Schema Initialization", () => {
  const testDbPath = "./test-migrations.db";
  let client: DatabaseClient;

  beforeEach(() => {
    client = new DatabaseClient({ path: testDbPath });
  });

  afterEach(async () => {
    client.close();
    await rm(testDbPath, { force: true });
    await rm(`${testDbPath}-shm`, { force: true });
    await rm(`${testDbPath}-wal`, { force: true });
  });

  it("creates all required tables", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name).sort();
    expect(tableNames).toEqual([
      "build_contexts",
      "metric_definitions",
      "metric_values",
      "schema_version",
    ]);
  });

  it("creates metric_definitions table with correct schema", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const columns = db.pragma("table_info(metric_definitions)") as {
      name: string;
      type: string;
    }[];
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual(["id", "name", "type", "unit", "description", "created_at"]);
  });

  it("creates build_contexts table with correct schema", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const columns = db.pragma("table_info(build_contexts)") as {
      name: string;
      type: string;
    }[];
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual([
      "id",
      "commit_sha",
      "branch",
      "run_id",
      "run_number",
      "actor",
      "event_name",
      "timestamp",
      "created_at",
    ]);
  });

  it("creates metric_values table with correct schema", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const columns = db.pragma("table_info(metric_values)") as {
      name: string;
      type: string;
    }[];
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual([
      "id",
      "metric_id",
      "build_id",
      "value_numeric",
      "value_label",
      "collected_at",
      "collection_duration_ms",
    ]);
  });

  it("creates indexes", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as {
      name: string;
    }[];

    const indexNames = indexes.map((i) => i.name).sort();
    expect(indexNames).toContain("idx_metric_name");
    expect(indexNames).toContain("idx_build_timestamp");
    expect(indexNames).toContain("idx_build_branch");
    expect(indexNames).toContain("idx_build_commit");
    expect(indexNames).toContain("idx_metric_value_metric_time");
    expect(indexNames).toContain("idx_metric_value_build");
  });

  it("records schema version", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const version = db
      .prepare("SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1")
      .get() as { version: string };

    expect(version.version).toBe("1.0.0");
  });

  it("is idempotent", () => {
    initializeSchema(client);
    initializeSchema(client);

    const db = client.getConnection();
    const versions = db.prepare("SELECT COUNT(*) as count FROM schema_version").get() as {
      count: number;
    };

    expect(versions.count).toBe(1);
  });
});
