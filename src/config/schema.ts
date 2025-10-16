import { z } from "zod";

export const MetricConfigSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, {
        message: "name must be lowercase with hyphens only (pattern: ^[a-z0-9-]+$)",
      }),
    type: z.enum(["numeric", "label"], {
      message: "type must be either 'numeric' or 'label'",
    }),
    description: z.string().max(256).optional(),
    command: z.string().min(1, { message: "command cannot be empty" }).max(1024),
    unit: z.string().max(10).optional(),
  })
  .strict();

export const DatabaseConfigSchema = z
  .object({
    path: z.string().optional(),
    artifactName: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/, {
        message:
          "artifactName must contain only alphanumeric characters, hyphens, and underscores (pattern: ^[a-zA-Z0-9_-]+$)",
      })
      .optional(),
  })
  .strict()
  .optional();

export const UnentropyConfigSchema = z
  .object({
    metrics: z
      .array(MetricConfigSchema)
      .min(1, { message: "metrics array must contain at least one metric" })
      .max(50),
    database: DatabaseConfigSchema,
  })
  .strict();

export type MetricConfig = z.infer<typeof MetricConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type UnentropyConfig = z.infer<typeof UnentropyConfigSchema>;

export function validateConfig(config: unknown): UnentropyConfig {
  const result = UnentropyConfigSchema.safeParse(config);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message || "Validation error");
  }

  const metricNames = new Set<string>();
  for (const metric of result.data.metrics) {
    if (metricNames.has(metric.name)) {
      throw new Error(
        `Duplicate metric name "${metric.name}" found. Metric names must be unique within the configuration`
      );
    }
    metricNames.add(metric.name);
  }

  return result.data;
}
