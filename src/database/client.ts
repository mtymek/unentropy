import Database from "better-sqlite3";

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
  timeout?: number;
  verbose?: boolean;
}

export class DatabaseClient {
  private db: Database.Database;

  constructor(config: DatabaseConfig) {
    const { path, readonly = false, timeout = 5000, verbose = false } = config;

    this.db = new Database(path, {
      readonly,
      fileMustExist: false,
      timeout,
      verbose: verbose ? console.log : undefined,
    });

    this.configureConnection();
  }

  private configureConnection(): void {
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("cache_size = -2000");
    this.db.pragma("temp_store = MEMORY");
  }

  getConnection(): Database.Database {
    return this.db;
  }

  close(): void {
    if (this.db.open) {
      this.db.close();
    }
  }

  transaction<T>(fn: () => T): T {
    const tx = this.db.transaction(fn);
    return tx();
  }

  isOpen(): boolean {
    return this.db.open;
  }
}
