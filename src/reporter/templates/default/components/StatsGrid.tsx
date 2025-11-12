import type { SummaryStats } from "../../../types";
import { formatTrendArrow, getTrendColor, formatValue } from "./formatUtils";

interface StatsGridProps {
  stats: SummaryStats;
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
          {formatValue(stats.latest, null)}
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400">Latest</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-gray-900 dark:text-white">
          {formatValue(stats.min, null)}
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400">Min</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-gray-900 dark:text-white">
          {formatValue(stats.max, null)}
        </div>
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
