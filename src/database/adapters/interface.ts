export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface StatementAdapter {
  run(...params: unknown[]): RunResult;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  finalize(): void;
}

export interface DatabaseAdapter {
  prepare(sql: string): StatementAdapter;
  exec(sql: string): void;
  pragma(pragma: string, options?: { simple: boolean }): unknown;
  transaction<T>(fn: () => T): () => T;
  close(): void;
  readonly inTransaction: boolean;
  readonly open: boolean;
}

export interface AdapterConfig {
  path: string;
  readonly?: boolean;
  create?: boolean;
  timeout?: number;
  verbose?: boolean;
}
