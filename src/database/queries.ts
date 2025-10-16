import { DatabaseClient } from "./client";
import type {
  BuildContext,
  InsertBuildContext,
  InsertMetricDefinition,
  InsertMetricValue,
  MetricDefinition,
  MetricValue,
} from "./types";

export class DatabaseQueries {
  constructor(private client: DatabaseClient) {}

  insertBuildContext(data: InsertBuildContext): number {
    const db = this.client.getConnection();
    const stmt = db.prepare(`
      INSERT INTO build_contexts (
        commit_sha, branch, run_id, run_number, actor, event_name, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `);

    const result = stmt.get(
      data.commit_sha,
      data.branch,
      data.run_id,
      data.run_number,
      data.actor ?? null,
      data.event_name ?? null,
      data.timestamp
    ) as { id: number };

    return result.id;
  }

  upsertMetricDefinition(data: InsertMetricDefinition): MetricDefinition {
    const db = this.client.getConnection();
    const stmt = db.prepare(`
      INSERT INTO metric_definitions (name, type, unit, description)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        unit = excluded.unit,
        description = excluded.description
      RETURNING id, name, type, unit, description, created_at
    `);

    const result = stmt.get(
      data.name,
      data.type,
      data.unit ?? null,
      data.description ?? null
    ) as MetricDefinition;

    return result;
  }

  insertMetricValue(data: InsertMetricValue): number {
    const db = this.client.getConnection();
    const stmt = db.prepare(`
      INSERT INTO metric_values (
        metric_id, build_id, value_numeric, value_label, collected_at, collection_duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(metric_id, build_id) DO UPDATE SET
        value_numeric = excluded.value_numeric,
        value_label = excluded.value_label,
        collected_at = excluded.collected_at,
        collection_duration_ms = excluded.collection_duration_ms
      RETURNING id
    `);

    const result = stmt.get(
      data.metric_id,
      data.build_id,
      data.value_numeric ?? null,
      data.value_label ?? null,
      data.collected_at,
      data.collection_duration_ms ?? null
    ) as { id: number };

    return result.id;
  }

  getBuildContext(id: number): BuildContext | undefined {
    const db = this.client.getConnection();
    const stmt = db.prepare("SELECT * FROM build_contexts WHERE id = ?");
    return stmt.get(id) as BuildContext | undefined;
  }

  getMetricDefinition(name: string): MetricDefinition | undefined {
    const db = this.client.getConnection();
    const stmt = db.prepare("SELECT * FROM metric_definitions WHERE name = ?");
    const result = stmt.get(name) as MetricDefinition | null;
    return result ?? undefined;
  }

  getMetricValues(metricId: number, buildId: number): MetricValue | undefined {
    const db = this.client.getConnection();
    const stmt = db.prepare("SELECT * FROM metric_values WHERE metric_id = ? AND build_id = ?");
    return stmt.get(metricId, buildId) as MetricValue | undefined;
  }

  getAllMetricDefinitions(): MetricDefinition[] {
    const db = this.client.getConnection();
    const stmt = db.prepare("SELECT * FROM metric_definitions ORDER BY name");
    return stmt.all() as MetricDefinition[];
  }
}
