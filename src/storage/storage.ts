import type { Database } from "bun:sqlite";
import type { StorageProvider, StorageProviderConfig } from "./providers/interface";
import { createStorageProvider } from "./providers/factory";
import { DatabaseQueries } from "./queries";
import type {
  InsertBuildContext,
  InsertMetricDefinition,
  InsertMetricValue,
  MetricDefinition,
  MetricValue,
} from "./types";

export class Storage {
  private provider: StorageProvider | null = null;
  private db: Database | null = null;
  private initPromise: Promise<void>;
  private queries: DatabaseQueries | null = null;

  constructor(private config: StorageProviderConfig) {
    this.initPromise = this.initialize();
  }

  async initialize(): Promise<void> {
    this.provider = await createStorageProvider(this.config);
    this.db = await this.provider.initialize();

    const readonly = this.config.type === "sqlite-local" ? (this.config.readonly ?? false) : false;

    if (!readonly) {
      const { initializeSchema } = await import("./migrations");
      initializeSchema(this);
    }

    this.queries = new DatabaseQueries(this);
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  getConnection(): Database {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }

  async close(): Promise<void> {
    if (this.provider) {
      await this.provider.cleanup();
      this.db = null;
    }
  }

  transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error("Database not initialized");
    const tx = this.db.transaction(fn);
    return tx();
  }

  isOpen(): boolean {
    return this.provider?.isInitialized() ?? false;
  }

  insertBuildContext(data: InsertBuildContext): number {
    if (!this.queries) throw new Error("Database not initialized");
    return this.queries.insertBuildContext(data);
  }

  upsertMetricDefinition(data: InsertMetricDefinition): MetricDefinition {
    if (!this.queries) throw new Error("Database not initialized");
    return this.queries.upsertMetricDefinition(data);
  }

  insertMetricValue(data: InsertMetricValue): number {
    if (!this.queries) throw new Error("Database not initialized");
    return this.queries.insertMetricValue(data);
  }

  getMetricDefinition(name: string): MetricDefinition | undefined {
    if (!this.queries) throw new Error("Database not initialized");
    return this.queries.getMetricDefinition(name);
  }

  getMetricValues(buildId: number): (MetricValue & { metric_name: string })[] {
    if (!this.queries) throw new Error("Database not initialized");
    return this.queries.getMetricValuesByBuildId(buildId);
  }

  getAllMetricDefinitions(): MetricDefinition[] {
    if (!this.queries) throw new Error("Database not initialized");
    return this.queries.getAllMetricDefinitions();
  }

  getAllMetricValues(): (MetricValue & { metric_name: string })[] {
    if (!this.queries) throw new Error("Database not initialized");
    return this.queries.getAllMetricValues();
  }

  getMetricTimeSeries(metricName: string): (MetricValue & {
    metric_name: string;
    commit_sha: string;
    branch: string;
    run_number: number;
    build_timestamp: string;
  })[] {
    if (!this.queries) throw new Error("Database not initialized");
    return this.queries.getMetricTimeSeries(metricName);
  }

  getAllBuildContexts(): import("./types").BuildContext[] {
    if (!this.queries) throw new Error("Database not initialized");
    return this.queries.getAllBuildContexts();
  }
}
