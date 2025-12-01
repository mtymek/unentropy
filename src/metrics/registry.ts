import type { MetricTemplate, BuiltInMetricsRegistry } from "./types.js";

export const BUILT_IN_METRICS: BuiltInMetricsRegistry = {
  coverage: {
    id: "coverage",
    name: "coverage",
    description: "Overall test coverage percentage across the codebase",
    type: "numeric",
    command:
      'bun test --coverage --coverage-reporter=json 2>/dev/null | jq -r ".total.lines.pct" 2>/dev/null || echo "0"',
    unit: "percent",
  },
  "function-coverage": {
    id: "function-coverage",
    name: "function-coverage",
    description: "Percentage of functions covered by tests",
    type: "numeric",
    command:
      'bun test --coverage --coverage-reporter=json 2>/dev/null | jq -r ".total.functions.pct" 2>/dev/null || echo "0"',
    unit: "percent",
  },
  loc: {
    id: "loc",
    name: "loc",
    description: "Total lines of code in the codebase",
    type: "numeric",
    command:
      'find src/ -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk \'{print $1}\' || echo "0"',
    unit: "integer",
  },
  "bundle-size": {
    id: "bundle-size",
    name: "bundle-size",
    description: "Total size of production build artifacts",
    type: "numeric",
    command:
      'find dist/ -name "*.js" -type f 2>/dev/null | xargs wc -c 2>/dev/null | tail -1 | awk \'{print int($1/1024)}\' || echo "0"',
    unit: "bytes",
  },
  "build-time": {
    id: "build-time",
    name: "build-time",
    description: "Time taken to complete the build",
    type: "numeric",
    command:
      "(time bun run build) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' || echo \"0\"",
    unit: "duration",
  },
  "test-time": {
    id: "test-time",
    name: "test-time",
    description: "Time taken to run all tests",
    type: "numeric",
    command:
      "(time bun test) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' || echo \"0\"",
    unit: "duration",
  },
  "dependencies-count": {
    id: "dependencies-count",
    name: "dependencies-count",
    description: "Total number of dependencies",
    type: "numeric",
    command: "bun pm ls --all | wc -l",
    unit: "integer",
  },
};

export function getBuiltInMetric(id: string): MetricTemplate | undefined {
  return BUILT_IN_METRICS[id];
}

export function listBuiltInMetricIds(): string[] {
  return Object.keys(BUILT_IN_METRICS);
}
