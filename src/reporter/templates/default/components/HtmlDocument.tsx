import type { ReportData } from "../../../types";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MetricCard } from "./MetricCard";
import { EmptyState } from "./EmptyState";
import { ChartScripts } from "./ChartScripts";
import { PrintStyles } from "./PrintStyles";

interface HtmlDocumentProps {
  data: ReportData;
}

export function HtmlDocument({ data }: HtmlDocumentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Unentropy Metrics Report - {data.metadata.repository}</title>

        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>

        <PrintStyles />
      </head>
      <body class="bg-gray-50 dark:bg-gray-900">
        <Header metadata={data.metadata} />

        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.metrics.length > 0 ? (
              data.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)
            ) : (
              <EmptyState />
            )}
          </div>
        </main>

        <Footer />

        <ChartScripts metrics={data.metrics} />
      </body>
    </html>
  );
}
