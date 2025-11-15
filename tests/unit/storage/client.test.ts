import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Storage } from "../../../src/storage/storage";
import { rm } from "fs/promises";

describe("Storage", () => {
  const testDbPath = "./test-client.db";
  let client: Storage;

  beforeEach(async () => {
    client = new Storage({
      provider: {
        type: "sqlite-local",
        path: testDbPath,
      },
    });
    await client.ready();
  });

  afterEach(async () => {
    await client.close();
    await rm(testDbPath, { force: true });
    await rm(`${testDbPath}-shm`, { force: true });
    await rm(`${testDbPath}-wal`, { force: true });
  });

  it("creates a database connection", () => {
    expect(client.isOpen()).toBe(true);
  });

  it("provides direct database access", () => {
    const db = client.getConnection();
    expect(db).toBeDefined();
  });

  it("configures WAL mode via provider", () => {
    const db = client.getConnection();
    const result = db.query("PRAGMA journal_mode").get() as {
      journal_mode: string;
    };
    expect(result.journal_mode).toBe("wal");
  });

  it("enables foreign keys via provider", () => {
    const db = client.getConnection();
    const result = db.query("PRAGMA foreign_keys").get() as {
      foreign_keys: number;
    };
    expect(result.foreign_keys).toBe(1);
  });

  it("sets busy timeout", () => {
    const db = client.getConnection();
    const result = db.query("PRAGMA busy_timeout").get() as {
      timeout: number;
    };
    expect(result.timeout).toBe(5000);
  });

  it("closes connection", async () => {
    await client.close();
    expect(client.isOpen()).toBe(false);
  });

  it("executes transactions", () => {
    const db = client.getConnection();
    db.run("CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)");

    const result = client.transaction(() => {
      db.query("INSERT INTO test (value) VALUES (?)").run("test1");
      db.query("INSERT INTO test (value) VALUES (?)").run("test2");
      return db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM test").get();
    });

    expect(result?.count).toBe(2);
  });
});
