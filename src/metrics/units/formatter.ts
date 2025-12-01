import type { UnitType } from "./types.js";

/**
 * Format a number value according to its unit type for display in reports and PR comments.
 *
 * @param value - The numeric value to format, or null for missing data
 * @param unit - The semantic unit type determining format rules
 * @returns Formatted string representation of the value
 *
 * @example
 * formatValue(85.5, 'percent') // "85.5%"
 * formatValue(1234567, 'integer') // "1,234,567"
 * formatValue(1572864, 'bytes') // "1.5 MB"
 * formatValue(90, 'duration') // "1m 30s"
 * formatValue(null, 'percent') // "N/A"
 */
export function formatValue(value: number | null, unit: UnitType | null): string {
  if (value === null) {
    return "N/A";
  }

  switch (unit) {
    case "percent":
      return formatPercent(value);
    case "integer":
      return formatInteger(value);
    case "bytes":
      return formatBytes(value);
    case "duration":
      return formatDuration(value);
    case "decimal":
      return formatDecimal(value);
    case null:
      return "N/A";
    default:
      const _exhaustive: never = unit;
      return _exhaustive;
  }
}

/**
 * Format a delta (change) value according to its unit type.
 * Includes +/- prefix and applies same formatting rules as formatValue.
 *
 * @param delta - The change value (positive or negative)
 * @param unit - The semantic unit type determining format rules
 * @returns Formatted string with +/- prefix
 *
 * @example
 * formatDelta(2.5, 'percent') // "+2.5%"
 * formatDelta(-262144, 'bytes') // "-256 KB"
 * formatDelta(150, 'integer') // "+150"
 */
export function formatDelta(delta: number, unit: UnitType | null): string {
  const sign = delta >= 0 ? "+" : "";
  const formattedValue = formatValue(delta, unit);
  return `${sign}${formattedValue}`;
}

/**
 * Format a percentage value with 1 decimal place and % suffix.
 * @internal
 */
function formatPercent(value: number): string {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/**
 * Format an integer value with thousands separator (US locale).
 * @internal
 */
export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format a byte value with auto-scaling to KB/MB/GB.
 * Thresholds: 1024 bytes = 1 KB, etc.
 * Shows 0 decimals for bytes, 1 decimal for KB/MB/GB.
 *
 * @internal
 * @example
 * formatBytes(500) // "500 B"
 * formatBytes(1536) // "1.5 KB"
 * formatBytes(1572864) // "1.5 MB"
 * formatBytes(1610612736) // "1.5 GB"
 */
export function formatBytes(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue < 1024) {
    return `${sign}${Math.round(absValue)} B`;
  }

  if (absValue < 1024 * 1024) {
    const kb = absValue / 1024;
    // Use 0 decimals if the value is a whole number, otherwise 1 decimal
    const decimals = kb % 1 === 0 ? 0 : 1;
    return `${sign}${kb.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: 1 })} KB`;
  }

  if (absValue < 1024 * 1024 * 1024) {
    const mb = absValue / (1024 * 1024);
    const decimals = mb % 1 === 0 ? 0 : 1;
    return `${sign}${mb.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: 1 })} MB`;
  }

  const gb = absValue / (1024 * 1024 * 1024);
  const decimals = gb % 1 === 0 ? 0 : 1;
  return `${sign}${gb.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: 1 })} GB`;
}

/**
 * Format a duration value with auto-scaling from seconds.
 * Auto-scales: < 1s -> ms, < 60s -> s, < 3600s -> m+s, else h+m.
 *
 * @internal
 * @example
 * formatDuration(0.5) // "500ms"
 * formatDuration(45) // "45s"
 * formatDuration(90) // "1m 30s"
 * formatDuration(3665) // "1h 1m"
 */
export function formatDuration(seconds: number): string {
  const absSeconds = Math.abs(seconds);
  const sign = seconds < 0 ? "-" : "";

  if (absSeconds < 1) {
    const ms = Math.round(absSeconds * 1000);
    return `${sign}${ms}ms`;
  }

  if (absSeconds < 60) {
    const rounded = Math.round(absSeconds);
    return `${sign}${rounded}s`;
  }

  if (absSeconds < 3600) {
    const minutes = Math.floor(absSeconds / 60);
    const secs = Math.round(absSeconds % 60);
    return `${sign}${minutes}m ${secs}s`;
  }

  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.round((absSeconds % 3600) / 60);
  return `${sign}${hours}h ${minutes}m`;
}

/**
 * Format a decimal value with 2 decimal places.
 * @internal
 */
function formatDecimal(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
