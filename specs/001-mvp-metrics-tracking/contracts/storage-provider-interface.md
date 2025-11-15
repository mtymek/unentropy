# Contract: Storage Provider Interface

**Feature**: 001-mvp-metrics-tracking  
**Created**: Sat Nov 15 2025  
**Status**: Draft

## Purpose

Defines the interface contract for storage providers that abstract where SQLite database files are stored and how they're accessed. This enables future extensibility for different storage backends (GitHub Artifacts, S3, etc.) while keeping the MVP simple with local file storage.

## Architecture Overview

### Class Dependency Diagram

```
┌─────────────────────────────────────────────────────┐
│ Storage                                             │
│ - Business logic methods                            │
│ - Uses DatabaseQueries                              │
└────────────────┬────────────────────────────────────┘
                 │
                 │ uses
                 ▼
┌─────────────────────────────────────────────────────┐
│ StorageProvider (interface)                         │
│ + initialize(): Promise<Database>                   │
│ + persist(): Promise<void>                          │
│ + cleanup(): void                                   │
└────────────────┬────────────────────────────────────┘
                 │
                 │ implements
                 ▼
    ┌────────────┴────────────┬──────────────────────┬───────────────────┐
    │                         │                      │                   │
┌───▼──────────────┐  ┌──────▼──────────┐  ┌───────▼────────┐  ┌──────▼────────┐
│ SqliteLocal      │  │ SqliteArtifact  │  │ SqliteS3       │  │ Postgres      │
│ StorageProvider  │  │ StorageProvider │  │ StorageProvider│  │ StorageProvider│
│ (MVP)            │  │ (future)        │  │ (future)       │  │ (future)      │
└───┬──────────────┘  └──────────┬──────┘  └───────────┬────┘  └──────┬────────┘
    │                            │                      │               │
    │ all return                 │                      │               │
    ▼                            ▼                      ▼               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Database (from bun:sqlite) or PostgreSQL Connection                       │
│ - query(), run(), exec(), transaction(), close()                          │
└───────────────────────────────────────────────────────────────────────────┘
```

**Key Design Principles:**
- **Storage**: High-level API for application code, uses StorageProvider
- **StorageProvider**: Abstract interface for WHERE the database is stored/accessed
- **Concrete Providers**: Handle specific storage scenarios (local file, artifacts, S3, remote DB)
- **Database Instance**: Direct use of bun:sqlite or database client (no wrapper)

## Interface Definition

### StorageProvider Interface

```typescript
import type { Database } from "bun:sqlite";

interface StorageProvider {
  /**
   * Initialize the storage provider and return a ready-to-use Database instance.
   * 
   * For local storage: Opens the database file directly
   * For remote storage (future): Downloads database, then opens locally
   * 
   * @returns Promise resolving to bun:sqlite Database instance
   * @throws Error if initialization fails (file not found, permission denied, etc.)
   */
  initialize(): Promise<Database>;

  /**
   * Persist any changes made to the database.
   * 
   * For local storage: No-op (writes are immediate to disk)
   * For remote storage (future): Uploads database to remote location
   * 
   * @returns Promise resolving when persistence is complete
   * @throws Error if persistence fails (network error, quota exceeded, etc.)
   */
  persist(): Promise<void>;

  /**
   * Cleanup resources (close connections, delete temp files, etc.)
   * 
   * Called after persist() to release all resources.
   * Should be idempotent (safe to call multiple times).
   */
  cleanup(): void;

  /**
   * Check if the provider has been initialized.
   * 
   * @returns true if initialize() has been called and succeeded
   */
  readonly isInitialized: boolean;
}
```

### StorageProviderConfig Type

```typescript
interface StorageProviderConfig {
  /**
   * Type of storage provider to use.
   * Format: <database-engine>-<storage-location>
   * 
   * MVP: Only 'sqlite-local' is supported
   * Future: 'sqlite-artifact', 'sqlite-s3', 'postgres'
   */
  type: 'sqlite-local' | 'sqlite-artifact' | 'sqlite-s3' | 'postgres';

  /**
   * File system path for SQLite local storage.
   * Required when type === 'sqlite-local'
   * 
   * @example "./unentropy.db"
   * @example "/tmp/metrics.db"
   */
  path?: string;

  // ... other config fields for future providers 
}
```

## Factory Function

```typescript
/**
 * Create a storage provider based on configuration.
 * 
 * @param config - Storage provider configuration
 * @returns Promise resolving to configured StorageProvider
 * @throws Error if config.type is unsupported or config is invalid
 */
async function createStorageProvider(
  config: StorageProviderConfig
): Promise<StorageProvider>;
```

## Implementation Requirements

### SqliteLocalStorageProvider (MVP)

**Behavior:**
- `initialize()`: Opens SQLite database at `config.path` using `bun:sqlite` and configures connection
- `persist()`: No-op (SQLite writes are immediate to disk)
- `cleanup()`: Closes database connection via `db.close()`
- `isInitialized`: Returns `true` after successful `initialize()`

**Connection Configuration:**
The provider handles SQLite-specific PRAGMA configuration:
```typescript
private configureConnection(db: Database): void {
  db.run("PRAGMA journal_mode = WAL");      // Write-Ahead Logging for concurrency
  db.run("PRAGMA synchronous = NORMAL");    // Balance safety and performance
  db.run("PRAGMA foreign_keys = ON");       // Enforce foreign key constraints
  db.run("PRAGMA busy_timeout = 5000");     // 5 second timeout for locks
  db.run("PRAGMA cache_size = -2000");      // 2MB cache
  db.run("PRAGMA temp_store = MEMORY");     // Use memory for temp tables
}
```

**Bun Database API:**
```typescript
import { Database } from "bun:sqlite";

// Open database
const db = new Database(path, {
  readonly?: boolean,   // Open in read-only mode
  create?: boolean,     // Create if doesn't exist (default: true)
  readwrite?: boolean,  // Open in read-write mode
});

// Execute SQL
db.run("PRAGMA journal_mode = WAL");  // Returns void for DDL
db.exec("CREATE TABLE..."); // Execute multiple statements

// Prepare statement
const stmt = db.query("SELECT * FROM users WHERE id = ?");
const row = stmt.get(userId);  // Get single row
const rows = stmt.all(userId); // Get all rows
stmt.run(userId);              // Execute without returning rows

// Transactions
const insertMany = db.transaction((items) => {
  for (const item of items) {
    stmt.run(item);
  }
});

// Close
db.close();
```

**Error Handling:**
- Throws if `config.path` is undefined
- Throws if file permissions prevent read/write access
- Throws if database file is corrupted

**Example Usage:**
```typescript
const provider = new SqliteLocalStorageProvider({
  type: 'sqlite-local',
  path: './unentropy.db',
  verbose: true,
});

const db = await provider.initialize();
// Use db for queries...
await provider.persist();  // No-op for local
provider.cleanup();
```

### Future Providers (Not Implemented in MVP)

**SqliteArtifactStorageProvider** (documented for future implementation):
- `initialize()`: Downloads latest artifact, extracts to temp directory, opens database
- `persist()`: Uploads database as new artifact version
- `cleanup()`: Deletes temp directory

**SqliteS3StorageProvider** (documented for future implementation):
- `initialize()`: Downloads database from S3 to temp directory, opens database
- `persist()`: Uploads database back to S3
- `cleanup()`: Deletes temp directory

**PostgresStorageProvider** (documented for future implementation):
- `initialize()`: Connects to PostgreSQL using connection string, returns connection handle
- `persist()`: No-op (PostgreSQL handles persistence automatically)
- `cleanup()`: Closes PostgreSQL connection
- **Note**: Will use a different database interface than SQLite (e.g., `pg` or similar client)

## Integration with Storage

```typescript
class Storage {
  private provider: StorageProvider | null = null;
  private db: Database | null = null;

  constructor(private config: StorageProviderConfig) {
    this.initPromise = this.initialize();
  }

  async initialize(): Promise<void> {
    // Create provider using factory
    this.provider = await createStorageProvider(this.config);
    
    // Initialize provider to get Database instance
    this.db = await this.provider.initialize();
    
    // Initialize schema if needed
    if (!this.config.readonly) {
      initializeSchema(this);
    }
  }

  async close(): Promise<void> {
    if (this.provider) {
      // Persist changes (uploads for remote storage)
      await this.provider.persist();
      
      // Cleanup resources
      this.provider.cleanup();
    }
  }

  getConnection(): Database {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }
}
```

## Design Rationale

### Why No Adapter Wrapper Around bun:sqlite?

The original design included a `DatabaseAdapter` interface wrapping `bun:sqlite` operations. This was removed because:

1. **Unnecessary abstraction**: We only use bun:sqlite for all storage backends
2. **Simpler code**: Direct use of `Database` API is clearer and more maintainable
3. **Full API access**: No need to wrap/proxy every bun:sqlite method
4. **Provider solves the real problem**: The abstraction is about **where** the DB file lives, not **how** to interact with SQLite

### Why Storage Provider Pattern?

1. **Separation of concerns**: Storage location vs. database operations
2. **Future extensibility**: Easy to add GitHub Artifacts, S3, or other storage backends
3. **Simple MVP**: LocalStorageProvider is trivial (just opens a file)
4. **No premature optimization**: Don't build complexity we don't need yet
5. **Clear interface**: initialize → use → persist → cleanup lifecycle

### Why Async initialize()?

Even though LocalStorageProvider opens files synchronously, the interface is async because:
- Future providers (Artifact, S3) need to download files asynchronously
- Consistent interface across all providers
- Allows for async validation or setup steps

## Validation Rules

### Config Validation

- `type` must be one of: 'sqlite-local', 'sqlite-artifact', 'sqlite-s3', 'postgres'
- For `type === 'sqlite-local'`: `path` is required
- For `type === 'sqlite-artifact'`: `artifactName`, `repository`, `githubToken` are required (future)
- For `type === 'sqlite-s3'`: `s3Bucket`, `s3Key`, `s3Region` are required (future)
- For `type === 'postgres'`: `connectionString` is required (future)
- `readonly` must be boolean if provided
- `verbose` must be boolean if provided

### Runtime Validation

- `initialize()` must be called before using the Database
- `persist()` can only be called after successful `initialize()`
- `cleanup()` should be called after `persist()` (if needed)
- Multiple calls to `cleanup()` should be safe (idempotent)

## Testing Strategy

### Unit Tests

- Test SqliteLocalStorageProvider initialization with valid/invalid paths
- Test persist() and cleanup() lifecycle
- Test error handling (file not found, permission denied, corrupted DB)
- Test readonly mode prevents writes
- Test verbose logging output

### Integration Tests

- Test Storage + SqliteLocalStorageProvider integration
- Test full lifecycle: initialize → write data → persist → cleanup
- Test multiple Storage instances (concurrency)
- Test recovery from failed initialization

### Contract Tests (Future)

- All StorageProvider implementations must pass same test suite
- Verify initialize/persist/cleanup contract behavior
- Verify error handling consistency

## Migration Path

For future storage providers:

1. Implement new class (e.g., `SqliteArtifactStorageProvider` or `PostgresStorageProvider`) that implements `StorageProvider`
2. Add new type to `StorageProviderConfig.type` union
3. Update factory function to handle new type
4. Add provider-specific config fields to `StorageProviderConfig`
5. Write tests for new provider
6. Document usage in provider's class documentation

**Note for PostgreSQL**: The `StorageProvider` interface may need extension to accommodate different database APIs. Consider:
- Returning a generic database handle instead of bun:sqlite `Database`
- Or creating a separate `PostgresStorageProvider` interface that returns PostgreSQL connection
- Or using a higher-level abstraction that works across both SQLite and PostgreSQL

No changes needed to:
- Storage (uses StorageProvider interface)
- DatabaseQueries (uses Database directly)
- Migrations (uses Database directly)
- Existing tests (if they use interface abstractions)

## Examples

### MVP: SQLite Local Storage

```typescript
const storage = new Storage({
  type: 'sqlite-local',
  path: './unentropy.db',
  verbose: true,
});

await storage.ready();
// Use storage for queries...
await storage.close();
```

### Future: SQLite with GitHub Artifacts

```typescript
const storage = new Storage({
  type: 'sqlite-artifact',
  artifactName: 'unentropy-database',
  repository: 'myorg/myrepo',
  githubToken: process.env.GITHUB_TOKEN,
  verbose: true,
});

await storage.ready();
// Use storage for queries...
await storage.close();  // Uploads updated database
```

### Future: SQLite with S3 Storage

```typescript
const storage = new Storage({
  type: 'sqlite-s3',
  s3Bucket: 'my-metrics-bucket',
  s3Key: 'metrics/unentropy.db',
  s3Region: 'us-east-1',
  verbose: true,
});

await storage.ready();
// Use storage for queries...
await storage.close();  // Uploads updated database
```

### Future: PostgreSQL

```typescript
const storage = new Storage({
  type: 'postgres',
  connectionString: 'postgresql://user:pass@localhost:5432/metrics',
  verbose: true,
});

await storage.ready();
// Use storage for queries...
await storage.close();  // Closes connection
```
