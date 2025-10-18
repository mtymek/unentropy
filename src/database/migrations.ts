import { DatabaseClient } from "./client";

const SCHEMA_VERSION = "1.0.0";

export function initializeSchema(client: DatabaseClient): void {
  const db = client.getConnection();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version TEXT PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );
  `);

  const currentVersion = db
    .prepare("SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1")
    .get() as { version: string } | undefined;

  if (currentVersion?.version === SCHEMA_VERSION) {
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS metric_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('numeric', 'label')),
      unit TEXT,
      description TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_metric_name ON metric_definitions(name);

    CREATE TABLE IF NOT EXISTS build_contexts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commit_sha TEXT NOT NULL,
      branch TEXT NOT NULL,
      run_id TEXT NOT NULL,
      run_number INTEGER NOT NULL,
      actor TEXT,
      event_name TEXT,
      timestamp DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(commit_sha, run_id)
    );

    CREATE INDEX IF NOT EXISTS idx_build_timestamp ON build_contexts(timestamp);
    CREATE INDEX IF NOT EXISTS idx_build_branch ON build_contexts(branch);
    CREATE INDEX IF NOT EXISTS idx_build_commit ON build_contexts(commit_sha);

    CREATE TABLE IF NOT EXISTS metric_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_id INTEGER NOT NULL,
      build_id INTEGER NOT NULL,
      value_numeric REAL,
      value_label TEXT,
      collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      collection_duration_ms INTEGER,
      FOREIGN KEY (metric_id) REFERENCES metric_definitions(id),
      FOREIGN KEY (build_id) REFERENCES build_contexts(id),
      UNIQUE(metric_id, build_id),
      CHECK(
        (value_numeric IS NOT NULL AND value_label IS NULL) OR
        (value_numeric IS NULL AND value_label IS NOT NULL)
      )
    );

    CREATE INDEX IF NOT EXISTS idx_metric_value_metric_time ON metric_values(metric_id, collected_at);
    CREATE INDEX IF NOT EXISTS idx_metric_value_build ON metric_values(build_id);
  `);

  db.prepare("INSERT OR IGNORE INTO schema_version (version, description) VALUES (?, ?)").run(
    SCHEMA_VERSION,
    "Initial MVP schema"
  );
}
