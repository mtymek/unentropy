import type { StorageProvider, StorageProviderConfig } from "./interface";
import { SqliteLocalStorageProvider } from "./sqlite-local";

export async function createStorageProvider(
  config: StorageProviderConfig
): Promise<StorageProvider> {
  if (config.type === "sqlite-local") {
    return new SqliteLocalStorageProvider(config);
  }

  if (config.type === "sqlite-s3") {
    throw new Error(
      `Storage provider type '${config.type}' is not yet implemented. ` +
        `S3 storage support is planned for future implementation. ` +
        `Currently supported: 'sqlite-local'`
    );
  }

  throw new Error(
    `Storage provider type '${config.type}' is not yet implemented. ` +
      `Currently supported: 'sqlite-local'`
  );
}
