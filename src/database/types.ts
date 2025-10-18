export type MetricType = "numeric" | "label";

export interface MetricDefinition {
  id: number;
  name: string;
  type: MetricType;
  unit: string | null;
  description: string | null;
  created_at: string;
}

export interface BuildContext {
  id: number;
  commit_sha: string;
  branch: string;
  run_id: string;
  run_number: number;
  actor: string | null;
  event_name: string | null;
  timestamp: string;
  created_at: string;
}

export interface MetricValue {
  id: number;
  metric_id: number;
  build_id: number;
  value_numeric: number | null;
  value_label: string | null;
  collected_at: string;
  collection_duration_ms: number | null;
}

export interface InsertBuildContext {
  commit_sha: string;
  branch: string;
  run_id: string;
  run_number: number;
  actor?: string | null;
  event_name?: string | null;
  timestamp: string;
}

export interface InsertMetricDefinition {
  name: string;
  type: MetricType;
  unit?: string | null;
  description?: string | null;
}

export interface InsertMetricValue {
  metric_id: number;
  build_id: number;
  value_numeric?: number | null;
  value_label?: string | null;
  collected_at: string;
  collection_duration_ms?: number | null;
}
