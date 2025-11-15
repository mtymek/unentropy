import type { StorageProvider, StorageProviderConfig } from "./interface";
import { SqliteLocalStorageProvider } from "./sqlite-local";

export async function createStorageProvider(
  config: StorageProviderConfig
): Promise<StorageProvider> {
  if (config.type === "sqlite-local") {
    return new SqliteLocalStorageProvider(config);
  }

  throw new Error(
    `Storage provider type '${config.type}' is not yet implemented. ` +
      `Currently supported: 'sqlite-local'`
  );
}
