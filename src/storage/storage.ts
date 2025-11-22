import type { Database } from "bun:sqlite";
import type { StorageProvider, StorageProviderConfig } from "./providers/interface";
import { createStorageProvider } from "./providers/factory";
import { SqliteDatabaseAdapter } from "./adapters/sqlite";
import { MetricsRepository } from "./repository";
import { initializeSchema } from "./migrations";

import type { MetricDefinition, MetricValue } from "./types";

export class Storage {
  private readonly provider: StorageProvider;
  private readonly initPromise: Promise<void>;
  private adapter: SqliteDatabaseAdapter | null = null;
  private repository: MetricsRepository | null = null;

  constructor(private config: StorageProviderConfig) {
    this.provider = createStorageProvider(this.config);
    this.initPromise = this.initialize();
  }

  async initialize(): Promise<void> {
    await this.provider.initialize();
    initializeSchema(this);

    // Create adapter and repository (three-layer architecture)
    const db = this.getConnection();
    this.adapter = new SqliteDatabaseAdapter(db);
    this.repository = new MetricsRepository(this.adapter);
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  getConnection(): Database {
    return this.provider?.getDb();
  }

  /**
   * Get the repository for domain operations.
   * This is the recommended API for application code.
   */
  getRepository(): MetricsRepository {
    if (!this.repository) throw new Error("Database not initialized");
    return this.repository;
  }

  async persist(): Promise<void> {
    await this.provider.persist();
  }

  async close(): Promise<void> {
    await this.provider.cleanup();
  }

  transaction<T>(fn: () => T): T {
    const tx = this.provider.getDb().transaction(fn);
    return tx();
  }

  isOpen(): boolean {
    return this.provider?.isInitialized() ?? false;
  }

  // Read-only query methods for backward compatibility (reporter uses these)
  getMetricDefinition(name: string): MetricDefinition | undefined {
    if (!this.adapter) throw new Error("Database not initialized");
    return this.adapter.getMetricDefinition(name);
  }

  getMetricValues(buildId: number): (MetricValue & { metric_name: string })[] {
    if (!this.adapter) throw new Error("Database not initialized");
    return this.adapter.getMetricValuesByBuildId(buildId);
  }

  getAllMetricDefinitions(): MetricDefinition[] {
    if (!this.adapter) throw new Error("Database not initialized");
    return this.adapter.getAllMetricDefinitions();
  }

  getAllMetricValues(): (MetricValue & { metric_name: string })[] {
    if (!this.adapter) throw new Error("Database not initialized");
    return this.adapter.getAllMetricValues();
  }

  getMetricTimeSeries(metricName: string): (MetricValue & {
    metric_name: string;
    commit_sha: string;
    branch: string;
    run_number: number;
    build_timestamp: string;
  })[] {
    if (!this.adapter) throw new Error("Database not initialized");
    return this.adapter.getMetricTimeSeries(metricName);
  }

  getAllBuildContexts(): import("./types").BuildContext[] {
    if (!this.adapter) throw new Error("Database not initialized");
    return this.adapter.getAllBuildContexts();
  }
}
