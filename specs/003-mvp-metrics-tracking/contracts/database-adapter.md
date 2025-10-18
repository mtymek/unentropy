# Database Adapter Contract

**Feature**: 003-mvp-metrics-tracking  
**Purpose**: Enable database layer to work in both Bun and Node.js environments  
**Last Updated**: Thu Oct 16 2025

## Overview

This contract defines the database adapter interface that provides a consistent API for SQLite operations across different runtime environments:
- **Bun** (local development): Uses `bun:sqlite`
- **Node.js** (GitHub Actions): Uses `better-sqlite3`

## Problem Statement

`better-sqlite3` uses native bindings that require N-API support. Bun's N-API implementation is incomplete, causing `better-sqlite3` to fail when loading native modules in Bun runtime.

However, both `better-sqlite3` and `bun:sqlite` have highly compatible APIs, making a thin adapter layer feasible.

## Adapter Interface

### Core Types

```typescript
export interface DatabaseAdapter {
  prepare(sql: string): StatementAdapter;
  exec(sql: string): void;
  pragma(pragma: string, options?: { simple: boolean }): unknown;
  transaction<T>(fn: () => T): () => T;
  close(): void;
  readonly inTransaction: boolean;
  readonly open: boolean;
}

export interface StatementAdapter {
  run(...params: unknown[]): RunResult;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  finalize(): void;
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface AdapterConfig {
  path: string;
  readonly?: boolean;
  create?: boolean;
  timeout?: number;
  verbose?: boolean;
}
```

## Implementation Requirements

### Common Behavior

All adapters MUST:
1. Support the same method signatures
2. Handle parameters in the same way (positional and named)
3. Return data in the same format
4. Throw errors with similar messages
5. Support WAL mode via pragma
6. Support transactions
7. Handle connection lifecycle (open/close)

### better-sqlite3 Adapter

**File**: `src/database/adapters/better-sqlite3.ts`

```typescript
import Database from "better-sqlite3";
import type { DatabaseAdapter, AdapterConfig, StatementAdapter, RunResult } from "./interface";

export class BetterSqlite3Adapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor(config: AdapterConfig) {
    this.db = new Database(config.path, {
      readonly: config.readonly ?? false,
      fileMustExist: !config.create,
      timeout: config.timeout ?? 5000,
      verbose: config.verbose ? console.log : undefined,
    });
  }

  prepare(sql: string): StatementAdapter {
    const stmt = this.db.prepare(sql);
    return new BetterSqlite3Statement(stmt);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  pragma(pragma: string, options?: { simple: boolean }): unknown {
    return this.db.pragma(pragma, options);
  }

  transaction<T>(fn: () => T): () => T {
    return this.db.transaction(fn);
  }

  close(): void {
    if (this.db.open) {
      this.db.close();
    }
  }

  get inTransaction(): boolean {
    return this.db.inTransaction;
  }

  get open(): boolean {
    return this.db.open;
  }
}

class BetterSqlite3Statement implements StatementAdapter {
  constructor(private stmt: Database.Statement) {}

  run(...params: unknown[]): RunResult {
    const result = this.stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  get(...params: unknown[]): unknown {
    return this.stmt.get(...params);
  }

  all(...params: unknown[]): unknown[] {
    return this.stmt.all(...params);
  }

  finalize(): void {
    // better-sqlite3 doesn't have explicit finalize
    // statements are automatically cleaned up
  }
}
```

### bun:sqlite Adapter

**File**: `src/database/adapters/bun-sqlite.ts`

```typescript
import { Database } from "bun:sqlite";
import type { DatabaseAdapter, AdapterConfig, StatementAdapter, RunResult } from "./interface";

export class BunSqliteAdapter implements DatabaseAdapter {
  private db: Database;

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
    this.db.exec(sql);
  }

  pragma(pragma: string): unknown {
    const result = this.db.query(`PRAGMA ${pragma}`).get();
    return result;
  }

  transaction<T>(fn: () => T): () => T {
    return this.db.transaction(fn);
  }

  close(): void {
    this.db.close();
  }

  get inTransaction(): boolean {
    return false;
  }

  get open(): boolean {
    return true;
  }
}

class BunSqliteStatement implements StatementAdapter {
  constructor(private stmt: any) {}

  run(...params: unknown[]): RunResult {
    const result = this.stmt.run(...params);
    return {
      changes: result.changes ?? 0,
      lastInsertRowid: result.lastInsertRowid ?? 0,
    };
  }

  get(...params: unknown[]): unknown {
    return this.stmt.get(...params);
  }

  all(...params: unknown[]): unknown[] {
    return this.stmt.all(...params);
  }

  finalize(): void {
    this.stmt.finalize();
  }
}
```

### Adapter Factory

**File**: `src/database/adapters/factory.ts`

```typescript
import type { DatabaseAdapter, AdapterConfig } from "./interface";

export function createAdapter(config: AdapterConfig): DatabaseAdapter {
  const runtime = detectRuntime();
  
  if (runtime === "bun") {
    const { BunSqliteAdapter } = await import("./bun-sqlite");
    return new BunSqliteAdapter(config);
  } else {
    const { BetterSqlite3Adapter } = await import("./better-sqlite3");
    return new BetterSqlite3Adapter(config);
  }
}

export function detectRuntime(): "bun" | "node" {
  if (typeof Bun !== "undefined") {
    return "bun";
  }
  return "node";
}
```

## DatabaseClient Refactoring

**File**: `src/database/client.ts`

```typescript
import { createAdapter } from "./adapters/factory";
import type { DatabaseAdapter } from "./adapters/interface";

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
  timeout?: number;
  verbose?: boolean;
}

export class DatabaseClient {
  private adapter: DatabaseAdapter;

  constructor(config: DatabaseConfig) {
    const { path, readonly = false, timeout = 5000, verbose = false } = config;

    this.adapter = createAdapter({
      path,
      readonly,
      create: true,
      timeout,
      verbose,
    });

    this.configureConnection();
  }

  private configureConnection(): void {
    this.adapter.pragma("journal_mode = WAL");
    this.adapter.pragma("synchronous = NORMAL");
    this.adapter.pragma("foreign_keys = ON");
    this.adapter.pragma("busy_timeout = 5000");
    this.adapter.pragma("cache_size = -2000");
    this.adapter.pragma("temp_store = MEMORY");
  }

  getConnection(): DatabaseAdapter {
    return this.adapter;
  }

  close(): void {
    this.adapter.close();
  }

  transaction<T>(fn: () => T): T {
    const tx = this.adapter.transaction(fn);
    return tx();
  }

  isOpen(): boolean {
    return this.adapter.open;
  }
}
```

## API Compatibility Matrix

| Operation | better-sqlite3 | bun:sqlite | Adapter Method |
|-----------|---------------|------------|----------------|
| Open database | `new Database(path, options)` | `new Database(path, options)` | `constructor(config)` |
| Prepare statement | `db.prepare(sql)` | `db.query(sql)` | `prepare(sql)` |
| Execute SQL | `db.exec(sql)` | `db.exec(sql)` | `exec(sql)` |
| Get single row | `stmt.get(params)` | `stmt.get(params)` | `stmt.get(params)` |
| Get all rows | `stmt.all(params)` | `stmt.all(params)` | `stmt.all(params)` |
| Run statement | `stmt.run(params)` | `stmt.run(params)` | `stmt.run(params)` |
| Transaction | `db.transaction(fn)` | `db.transaction(fn)` | `transaction(fn)` |
| Set pragma | `db.pragma(name)` | `db.exec("PRAGMA ...")` | `pragma(name)` |
| Close | `db.close()` | `db.close()` | `close()` |
| Check open | `db.open` | N/A | `open` |

## Testing Strategy

### Unit Tests

Each adapter must pass the same test suite:

```typescript
describe("DatabaseAdapter", () => {
  const adapters = [
    { name: "better-sqlite3", create: () => new BetterSqlite3Adapter(config) },
    { name: "bun:sqlite", create: () => new BunSqliteAdapter(config) },
  ];

  adapters.forEach(({ name, create }) => {
    describe(name, () => {
      test("should open database", () => { /* ... */ });
      test("should execute SQL", () => { /* ... */ });
      test("should prepare statements", () => { /* ... */ });
      test("should support transactions", () => { /* ... */ });
      test("should set pragmas", () => { /* ... */ });
      test("should close database", () => { /* ... */ });
    });
  });
});
```

### Environment-Specific Tests

- **Bun tests**: Run with `bun test` - uses `bun:sqlite` adapter
- **Node tests**: Run with `npm test` - uses `better-sqlite3` adapter
- **CI tests**: Run with Node.js in GitHub Actions - uses `better-sqlite3` adapter

## Migration Impact

### Code Changes Required

1. **DatabaseClient** - Refactor to use adapter interface
2. **Queries** - No changes (uses `getConnection()` which returns adapter)
3. **Migrations** - No changes (uses client methods)
4. **Tests** - Update to handle adapter runtime detection

### Backward Compatibility

- ✅ All existing code using `DatabaseClient` continues to work
- ✅ All existing tests continue to pass (adapter is transparent)
- ✅ Same database file format (SQLite is SQLite)
- ✅ Same query interface

## Performance Considerations

### Overhead

- **Adapter method calls**: Negligible (single function call)
- **Runtime detection**: Once per database instantiation
- **Memory**: Minimal (thin wrapper objects)

### Benchmarking

Expected performance is within 1-2% of direct library usage:
- `better-sqlite3` is already the fastest Node.js SQLite driver
- `bun:sqlite` is ~3-6x faster than `better-sqlite3`
- Adapter overhead is negligible compared to I/O

## Error Handling

### Common Errors

Both adapters should throw similar errors for:
- File not found
- Permission denied
- Database locked
- Constraint violations
- SQL syntax errors

### Adapter-Specific Errors

Each adapter may have slightly different error messages, but error types should be consistent.

## Documentation Updates

### AGENTS.md

Update build commands to note dual-environment support:
```markdown
- Test (Bun): bun test
- Test (Node): npm test
- CI uses Node.js with better-sqlite3
```

### README.md

Add note about dual-environment support:
```markdown
## Development

Unentropy supports both Bun and Node.js:
- Local development with Bun uses `bun:sqlite`
- GitHub Actions uses Node.js with `better-sqlite3`
- Database adapter provides consistent API
```

## Success Criteria

1. ✅ All existing tests pass with Bun locally
2. ✅ All existing tests pass with Node.js in CI
3. ✅ Same database file works in both environments
4. ✅ No changes required to query code
5. ✅ Adapter factory correctly detects runtime
6. ✅ Both adapters support all required operations
7. ✅ Performance overhead is negligible (<2%)
