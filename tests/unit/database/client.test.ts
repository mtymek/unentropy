import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseClient } from "../../../src/database/client";
import { rm } from "fs/promises";

describe("DatabaseClient", () => {
  const testDbPath = "./test-client.db";
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

  it("creates a database connection", () => {
    expect(client.isOpen()).toBe(true);
  });

  it("configures WAL mode", () => {
    const db = client.getConnection();
    const result = db.pragma("journal_mode", { simple: true });
    expect(result).toBe("wal");
  });

  it("enables foreign keys", () => {
    const db = client.getConnection();
    const result = db.pragma("foreign_keys", { simple: true });
    expect(result).toBe(1);
  });

  it("sets busy timeout", () => {
    const db = client.getConnection();
    const result = db.pragma("busy_timeout", { simple: true });
    expect(result).toBe(5000);
  });

  it("closes connection", () => {
    client.close();
    expect(client.isOpen()).toBe(false);
  });

  it("executes transactions", () => {
    const db = client.getConnection();
    db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)");

    const result = client.transaction(() => {
      db.prepare("INSERT INTO test (value) VALUES (?)").run("test1");
      db.prepare("INSERT INTO test (value) VALUES (?)").run("test2");
      return db.prepare("SELECT COUNT(*) as count FROM test").get() as {
        count: number;
      };
    });

    expect(result.count).toBe(2);
  });
});
