import type { SummaryStats } from "../../../generator";

interface StatsGridProps {
  stats: SummaryStats;
}

function formatTrendArrow(direction: "up" | "down" | "stable" | null): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  if (direction === "stable") return "→";
  return "—";
}

function getTrendColor(direction: "up" | "down" | "stable" | null): string {
  if (direction === "up") return "text-green-600 dark:text-green-400";
  if (direction === "down") return "text-red-600 dark:text-red-400";
  return "text-gray-600 dark:text-gray-400";
}

function formatValue(value: number | null): string {
  if (value === null) return "N/A";
  return value.toFixed(2);
}

export function StatsGrid({ stats }: StatsGridProps) {
  const trendArrow = formatTrendArrow(stats.trendDirection);
  const trendColor = getTrendColor(stats.trendDirection);
  const trendPercent =
    stats.trendPercent !== null ? Math.abs(stats.trendPercent).toFixed(1) : "0.0";

  return (
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div class="text-center">
        <div class="text-2xl font-bold text-gray-900 dark:text-white">
          {formatValue(stats.latest)}
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400">Latest</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-gray-900 dark:text-white">{formatValue(stats.min)}</div>
        <div class="text-xs text-gray-600 dark:text-gray-400">Min</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-gray-900 dark:text-white">{formatValue(stats.max)}</div>
        <div class="text-xs text-gray-600 dark:text-gray-400">Max</div>
      </div>
      <div class="text-center">
        <div class={`text-2xl font-bold ${trendColor}`}>
          {trendArrow} {trendPercent}%
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400">Trend</div>
      </div>
    </div>
  );
}
