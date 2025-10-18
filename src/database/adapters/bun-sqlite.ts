import { Database } from "bun:sqlite";
import type { DatabaseAdapter, AdapterConfig, StatementAdapter, RunResult } from "./interface";

class BunSqliteStatement implements StatementAdapter {
  constructor(private stmt: ReturnType<Database["query"]>) {}

  run(...params: unknown[]): RunResult {
    const result = this.stmt.run(...(params as never[]));
    return {
      changes: result.changes ?? 0,
      lastInsertRowid: result.lastInsertRowid ?? 0,
    };
  }

  get(...params: unknown[]): unknown {
    return this.stmt.get(...(params as never[]));
  }

  all(...params: unknown[]): unknown[] {
    return this.stmt.all(...(params as never[]));
  }

  finalize(): void {
    this.stmt.finalize();
  }
}

export class BunSqliteAdapter implements DatabaseAdapter {
  private db: Database;
  private isOpen = true;

  constructor(config: AdapterConfig) {
    this.db = new Database(config.path, {
      readonly: config.readonly ?? false,
      create: config.create ?? true,
    });

    if (config.verbose) {
      console.log(`[bun:sqlite] Opened database: ${config.path}`);
    }
  }

  prepare(sql: string): StatementAdapter {
    const stmt = this.db.query(sql);
    return new BunSqliteStatement(stmt);
  }

  exec(sql: string): void {
    this.db.run(sql);
  }

  pragma(pragma: string, options?: { simple: boolean }): unknown {
    const query = this.db.query(`PRAGMA ${pragma}`);

    if (pragma.includes("table_info(") || pragma.includes("(")) {
      return query.all();
    }

    const result = query.get();

    if (options?.simple && result && typeof result === "object") {
      const values = Object.values(result);
      return values.length === 1 ? values[0] : result;
    }

    return result;
  }

  transaction<T>(fn: () => T): () => T {
    return this.db.transaction(fn);
  }

  close(): void {
    this.db.close();
    this.isOpen = false;
  }

  get inTransaction(): boolean {
    return this.db.inTransaction;
  }

  get open(): boolean {
    return this.isOpen;
  }
}
