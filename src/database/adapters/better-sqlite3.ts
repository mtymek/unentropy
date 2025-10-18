import Database from "better-sqlite3";
import type { DatabaseAdapter, AdapterConfig, StatementAdapter, RunResult } from "./interface";

class BetterSqlite3Statement implements StatementAdapter {
  constructor(private stmt: Database.Statement) {}

  run(...params: unknown[]): RunResult {
    const result = this.stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  get(...params: unknown[]): unknown {
    return this.stmt.get(...params);
  }

  all(...params: unknown[]): unknown[] {
    return this.stmt.all(...params);
  }

  finalize(): void {
    // better-sqlite3 does not require explicit finalization
  }
}

export class BetterSqlite3Adapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor(config: AdapterConfig) {
    this.db = new Database(config.path, {
      readonly: config.readonly ?? false,
      fileMustExist: !(config.create ?? true),
      timeout: config.timeout ?? 5000,
      verbose: config.verbose ? console.log : undefined,
    });
  }

  prepare(sql: string): StatementAdapter {
    const stmt = this.db.prepare(sql);
    return new BetterSqlite3Statement(stmt);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  pragma(pragma: string, options?: { simple: boolean }): unknown {
    return this.db.pragma(pragma, options);
  }

  transaction<T>(fn: () => T): () => T {
    return this.db.transaction(fn);
  }

  close(): void {
    if (this.db.open) {
      this.db.close();
    }
  }

  get inTransaction(): boolean {
    return this.db.inTransaction;
  }

  get open(): boolean {
    return this.db.open;
  }
}
