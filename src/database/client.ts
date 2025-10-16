import type { DatabaseAdapter } from "./adapters/interface";
import { createAdapter } from "./adapters/factory";

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
  timeout?: number;
  verbose?: boolean;
}

export class DatabaseClient {
  private adapter: DatabaseAdapter | null = null;
  private initPromise: Promise<void>;

  constructor(private config: DatabaseConfig) {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    const { path, readonly = false, timeout = 5000, verbose = false } = this.config;

    this.adapter = await createAdapter({
      path,
      readonly,
      create: true,
      timeout,
      verbose,
    });

    this.configureConnection();
  }

  private configureConnection(): void {
    if (!this.adapter) throw new Error("Database not initialized");

    this.adapter.pragma("journal_mode = WAL");
    this.adapter.pragma("synchronous = NORMAL");
    this.adapter.pragma("foreign_keys = ON");
    this.adapter.pragma("busy_timeout = 5000");
    this.adapter.pragma("cache_size = -2000");
    this.adapter.pragma("temp_store = MEMORY");
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  getConnection(): DatabaseAdapter {
    if (!this.adapter) throw new Error("Database not initialized");
    return this.adapter;
  }

  close(): void {
    if (this.adapter?.open) {
      this.adapter.close();
    }
  }

  transaction<T>(fn: () => T): T {
    if (!this.adapter) throw new Error("Database not initialized");
    const tx = this.adapter.transaction(fn);
    return tx();
  }

  isOpen(): boolean {
    return this.adapter?.open ?? false;
  }
}
