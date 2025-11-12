export function formatTrendArrow(direction: "up" | "down" | "stable" | null): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  if (direction === "stable") return "→";
  return "—";
}

export function getTrendColor(direction: "up" | "down" | "stable" | null): string {
  if (direction === "up") return "text-green-600 dark:text-green-400";
  if (direction === "down") return "text-red-600 dark:text-red-400";
  return "text-gray-600 dark:text-gray-400";
}

export function formatValue(value: number | null, unit: string | null): string {
  if (value === null) return "N/A";
  const formatted = value.toFixed(2);
  return unit ? `${formatted}${unit}` : formatted;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
