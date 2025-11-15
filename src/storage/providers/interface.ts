import type { Database } from "bun:sqlite";

export type StorageProviderType = "sqlite-local" | "sqlite-artifact" | "sqlite-s3" | "postgres";

export interface BaseStorageProviderConfig {
  type: StorageProviderType;
}

export interface SqliteLocalConfig extends BaseStorageProviderConfig {
  type: "sqlite-local";
  path: string;
  readonly?: boolean;
  timeout?: number;
}

// Future: sqlite-artifact, sqlite-s3, postgres configs
export type StorageProviderConfig = SqliteLocalConfig;

export interface StorageProvider {
  initialize(): Promise<Database>;
  persist(): Promise<void>;
  cleanup(): Promise<void>;
  isInitialized(): boolean;
}
