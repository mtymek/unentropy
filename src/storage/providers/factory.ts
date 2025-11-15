import type { StorageProvider, StorageProviderConfig } from "./interface";
import { SqliteLocalStorageProvider } from "./sqlite-local";
import { SqliteS3StorageProvider } from "./sqlite-s3";

export async function createStorageProvider(
  config: StorageProviderConfig
): Promise<StorageProvider> {
  const { type } = config;

  if (type === "sqlite-local") {
    return new SqliteLocalStorageProvider(config);
  }

  if (type === "sqlite-artifact") {
    throw new Error(
      `Storage provider type '${type}' is not yet implemented. ` +
        `Artifact storage support is planned for future implementation. ` +
        `Currently supported: 'sqlite-local', 'sqlite-s3'`
    );
  }

  if (type === "sqlite-s3") {
    return new SqliteS3StorageProvider(config);
  }

  throw new Error(
    `Storage provider type '${type}' is not yet implemented. ` +
      `Currently supported: 'sqlite-local', 'sqlite-s3'`
  );
}
