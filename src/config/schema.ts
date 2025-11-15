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
    timeout: z.number().int().positive().max(300000).optional(),
  })
  .strict();

export const StorageConfigSchema = z
  .object({
    type: z.enum(["sqlite-local", "sqlite-artifact", "sqlite-s3"], {
      message: "must be one of 'sqlite-local', 'sqlite-artifact', or 'sqlite-s3'",
    }),
  })
  .strict();

export const UnentropyConfigSchema = z
  .object({
    storage: StorageConfigSchema.optional(),
    metrics: z
      .array(MetricConfigSchema)
      .min(1, { message: "metrics array must contain at least one metric" })
      .max(50),
  })
  .strict()
  .transform((data) => ({
    ...data,
    storage: data.storage || { type: "sqlite-local" },
  }));

export type MetricConfig = z.infer<typeof MetricConfigSchema>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
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
