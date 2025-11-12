import type { ReportMetadata } from "../../../templates";

interface HeaderProps {
  metadata: ReportMetadata;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Header({ metadata }: HeaderProps) {
  const generatedDate = formatDate(metadata.generatedAt);
  const startDate = formatDate(metadata.dateRange.start);
  const endDate = formatDate(metadata.dateRange.end);

  return (
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Unentropy Metrics Report
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{metadata.repository}</p>
          </div>
          <div class="mt-4 sm:mt-0 text-sm text-gray-600 dark:text-gray-400">
            <div>Generated: {generatedDate}</div>
            <div>
              Data Range: {startDate} - {endDate}
            </div>
            <div>Total Builds: {metadata.buildCount}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
