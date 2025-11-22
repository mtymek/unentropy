import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { Storage } from "../../../src/storage/storage";
import { initializeSchema } from "../../../src/storage/migrations";
import { rm } from "fs/promises";

describe("Schema Initialization", () => {
  const testDbPath = "./test-migrations.db";
  let client: Storage;

  beforeEach(async () => {
    client = new Storage({
      type: "sqlite-local",
      path: testDbPath,
    });
    await client.ready();
  });

  afterEach(async () => {
    await client.close();
    await rm(testDbPath, { force: true });
    await rm(`${testDbPath}-shm`, { force: true });
    await rm(`${testDbPath}-wal`, { force: true });
  });

  it("creates all required tables", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const tables = db
      .query<
        { name: string },
        []
      >("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all();

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

    const columns = db
      .query<{ name: string; type: string }, []>("PRAGMA table_info(metric_definitions)")
      .all();
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual(["id", "name", "type", "unit", "description", "created_at"]);
  });

  it("creates build_contexts table with correct schema", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const columns = db
      .query<{ name: string; type: string }, []>("PRAGMA table_info(build_contexts)")
      .all();
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
      "pull_request_number",
      "pull_request_base",
      "pull_request_head",
    ]);
  });

  it("creates metric_values table with correct schema", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const columns = db
      .query<{ name: string; type: string }, []>("PRAGMA table_info(metric_values)")
      .all();
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

    const indexes = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='index'")
      .all();

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
      .query<
        { version: string },
        []
      >("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
      .get();

    expect(version?.version).toBe("1.1.0");
  });

  it("migrates from 1.0.0 to 1.1.0", () => {
    // Create a fresh database for this test
    const db = new Database("./test-migration.db");

    try {
      // Create a mock storage object that returns our database
      const mockStorage = {
        getConnection: () => db,
      } as Storage;

      // Initialize to version 1.0.0 only
      initializeSchema(mockStorage, "1.0.0");

      // Verify we're at 1.0.0
      const version = db
        .query<
          { version: string },
          []
        >("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
        .get();
      expect(version?.version).toBe("1.0.0");

      // Verify pull request columns don't exist yet
      const columns = db
        .query<{ name: string; type: string }, []>("PRAGMA table_info(build_contexts)")
        .all();
      const columnNames = columns.map((c) => c.name);

      expect(columnNames).not.toContain("pull_request_number");
      expect(columnNames).not.toContain("pull_request_base");
      expect(columnNames).not.toContain("pull_request_head");

      // Now migrate to 1.1.0
      initializeSchema(mockStorage, "1.1.0");

      // Check new columns were added
      const updatedColumns = db
        .query<{ name: string; type: string }, []>("PRAGMA table_info(build_contexts)")
        .all();
      const updatedColumnNames = updatedColumns.map((c) => c.name);

      expect(updatedColumnNames).toContain("pull_request_number");
      expect(updatedColumnNames).toContain("pull_request_base");
      expect(updatedColumnNames).toContain("pull_request_head");

      // Check version was updated
      const finalVersion = db
        .query<
          { version: string },
          []
        >("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
        .get();
      expect(finalVersion?.version).toBe("1.1.0");
    } finally {
      db.close();
      rm("./test-migration.db", { force: true });
      rm("./test-migration.db-shm", { force: true });
      rm("./test-migration.db-wal", { force: true });
    }
  });

  it("is idempotent", () => {
    initializeSchema(client);
    initializeSchema(client);

    const db = client.getConnection();
    const versions = db
      .query<{ count: number }, []>("SELECT COUNT(*) as count FROM schema_version")
      .get();

    expect(versions?.count).toBe(2);
  });
});
