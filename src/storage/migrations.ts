import { Storage } from "./storage";

interface Migration {
  version: string;
  description: string;
  up: (db: any) => void;
}

const migrations: Migration[] = [
  {
    version: "1.0.0",
    description: "Initial MVP schema",
    up: (db) => {
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
    },
  },
  {
    version: "1.1.0",
    description: "Add pull request columns to build_contexts",
    up: (db) => {
      // Check if columns already exist before adding them
      const columns = db.query<{ name: string }, []>("PRAGMA table_info(build_contexts)").all();
      const columnNames = columns.map((c) => c.name);

      if (!columnNames.includes("pull_request_number")) {
        db.exec(`ALTER TABLE build_contexts ADD COLUMN pull_request_number INTEGER;`);
      }
      if (!columnNames.includes("pull_request_base")) {
        db.exec(`ALTER TABLE build_contexts ADD COLUMN pull_request_base TEXT;`);
      }
      if (!columnNames.includes("pull_request_head")) {
        db.exec(`ALTER TABLE build_contexts ADD COLUMN pull_request_head TEXT;`);
      }
    },
  },
];

export function initializeSchema(storage: Storage, targetVersion?: string): void {
  const db = storage.getConnection();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version TEXT PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );
  `);

  const currentVersionRow = db
    .query<
      { version: string },
      []
    >("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
    .get();

  const currentVersion = currentVersionRow?.version;
  const currentMigrationIndex = currentVersion
    ? migrations.findIndex((m) => m.version === currentVersion)
    : -1;

  // Determine the target migration index
  const targetIndex = targetVersion
    ? migrations.findIndex((m) => m.version === targetVersion)
    : migrations.length - 1;

  if (targetIndex === -1) {
    throw new Error(`Unknown target version: ${targetVersion}`);
  }

  // Run migrations that haven't been applied yet up to target version
  for (let i = currentMigrationIndex + 1; i <= targetIndex; i++) {
    const migration = migrations[i];
    if (!migration) continue;

    migration.up(db);

    const insertStmt = db.query<unknown, [string, string]>(
      "INSERT OR IGNORE INTO schema_version (version, description) VALUES (?, ?)"
    );
    insertStmt.run(migration.version, migration.description);
  }
}
