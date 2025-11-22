export interface MetricTemplate {
  id: string;
  name: string;
  description: string;
  type: "numeric" | "label";
  command: string;
  unit?: string;
}

export type BuiltInMetricsRegistry = Record<string, MetricTemplate>;
