import { describe, test, expect } from "bun:test";
import { escapeHtml, generateHtmlReport, type ReportData } from "../../../src/reporter/templates";
import type { SummaryStats } from "../../../src/reporter/generator";
import type { ChartConfig } from "../../../src/reporter/charts";

function createMockChartConfig(): ChartConfig {
  return {
    type: "line",
    data: {
      labels: ["2025-10-01"],
      datasets: [
        {
          label: "test-metric",
          data: [42],
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Value",
          },
        },
      },
    },
  };
}

describe("escapeHtml", () => {
  test("escapes HTML special characters", () => {
    const unsafe = '<script>alert("XSS")</script>';
    const safe = escapeHtml(unsafe);
    expect(safe).toBe("&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;");
  });

  test("escapes ampersands", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  test("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });

  test("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  test("handles string with no special characters", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });

  test("escapes multiple special characters", () => {
    const unsafe = `<div class="test" data-value='5 & 6'>"XSS"</div>`;
    const safe = escapeHtml(unsafe);
    expect(safe).toContain("&lt;div");
    expect(safe).toContain("&quot;test&quot;");
    expect(safe).toContain("&#039;5 &amp; 6&#039;");
    expect(safe).toContain("&gt;");
  });
});

describe("generateHtmlReport - basic rendering", () => {
  test("generates valid HTML with basic structure", () => {
    const stats: SummaryStats = {
      latest: 42,
      min: 10,
      max: 100,
      average: 50,
      trendDirection: "up",
      trendPercent: 25,
    };

    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 5,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-15T12:00:00Z",
        },
      },
      metrics: [
        {
          id: "test-metric",
          name: "test-metric",
          description: "A test metric",
          stats,
          chartConfig: createMockChartConfig(),
          sparse: false,
          dataPointCount: 10,
        },
      ],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("<head>");
    expect(html).toContain("</head>");
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
  });

  test("includes repository name in title", () => {
    const reportData: ReportData = {
      metadata: {
        repository: "my-org/my-project",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 1,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("<title>Unentropy Metrics Report - my-org/my-project</title>");
    expect(html).toContain("my-org/my-project");
  });

  test("includes metric name and description", () => {
    const stats: SummaryStats = {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };

    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 1,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [
        {
          id: "coverage",
          name: "Test Coverage",
          description: "Code coverage percentage",
          stats,
          chartConfig: createMockChartConfig(),
          sparse: false,
          dataPointCount: 0,
        },
      ],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("Test Coverage");
    expect(html).toContain("Code coverage percentage");
  });

  test("renders multiple metrics", () => {
    const stats: SummaryStats = {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };

    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 1,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [
        {
          id: "metric1",
          name: "Metric One",
          description: null,
          stats,
          chartConfig: createMockChartConfig(),
          sparse: false,
          dataPointCount: 0,
        },
        {
          id: "metric2",
          name: "Metric Two",
          description: null,
          stats,
          chartConfig: createMockChartConfig(),
          sparse: false,
          dataPointCount: 0,
        },
      ],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("Metric One");
    expect(html).toContain("Metric Two");
    expect(html).toContain('id="chart-metric1"');
    expect(html).toContain('id="chart-metric2"');
  });

  test("includes summary statistics when available", () => {
    const stats: SummaryStats = {
      latest: 85.5,
      min: 75.2,
      max: 92.3,
      average: 82.1,
      trendDirection: "up",
      trendPercent: 12.5,
    };

    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 1,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [
        {
          id: "coverage",
          name: "Coverage",
          description: null,
          stats,
          chartConfig: createMockChartConfig(),
          sparse: false,
          dataPointCount: 10,
        },
      ],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("85.50");
    expect(html).toContain("75.20");
    expect(html).toContain("92.30");
    expect(html).toContain("12.5%");
  });

  test("handles empty metrics array", () => {
    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 0,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("test/repo");
    expect(html).toContain("No metrics data");
  });
});

describe("generateHtmlReport - self-contained output", () => {
  test("includes Tailwind CSS CDN link", () => {
    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 0,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("cdn.tailwindcss.com");
  });

  test("includes Chart.js CDN script", () => {
    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 0,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("cdn.jsdelivr.net/npm/chart.js");
  });

  test("embeds chart configuration as JSON", () => {
    const stats: SummaryStats = {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };

    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 1,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [
        {
          id: "test-metric",
          name: "test-metric",
          description: null,
          stats,
          chartConfig: createMockChartConfig(),
          sparse: false,
          dataPointCount: 2,
        },
      ],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("const chartsData = ");
    expect(html).toMatch(/"id":"test-metric"/);
  });

  test("includes viewport meta tag for mobile", () => {
    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 0,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain("width=device-width");
    expect(html).toContain("initial-scale=1");
  });

  test("includes charset declaration", () => {
    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 0,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain('<meta charset="UTF-8"');
  });
});

describe("generateHtmlReport - XSS sanitization", () => {
  test("sanitizes metric name with HTML tags", () => {
    const stats: SummaryStats = {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };

    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 1,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [
        {
          id: "malicious",
          name: '<script>alert("XSS")</script>',
          description: null,
          stats,
          chartConfig: createMockChartConfig(),
          sparse: false,
          dataPointCount: 0,
        },
      ],
    };

    const html = generateHtmlReport(reportData);

    expect(html).not.toContain('<script>alert("XSS")</script>');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;XSS&quot;");
  });

  test("sanitizes metric description with HTML tags", () => {
    const stats: SummaryStats = {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };

    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 1,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [
        {
          id: "test",
          name: "Test Metric",
          description: '<img src=x onerror="alert(1)">',
          stats,
          chartConfig: createMockChartConfig(),
          sparse: false,
          dataPointCount: 0,
        },
      ],
    };

    const html = generateHtmlReport(reportData);

    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).toContain("&lt;img");
    expect(html).toContain("&quot;alert(1)&quot;");
  });

  test("sanitizes repository name with HTML tags", () => {
    const reportData: ReportData = {
      metadata: {
        repository: '<a href="javascript:alert(1)">evil</a>',
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 0,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).not.toContain('<a href="javascript:alert(1)">');
    expect(html).toContain("&lt;a href=");
  });
});

describe("generateHtmlReport - responsive layout", () => {
  test("includes responsive Tailwind classes", () => {
    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 0,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toMatch(/sm:|md:|lg:/);
  });

  test("includes dark mode classes", () => {
    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 0,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toMatch(/dark:/);
  });

  test("includes print media query styles", () => {
    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 0,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("@media print");
  });
});

describe("generateHtmlReport - accessibility", () => {
  test("includes semantic HTML5 elements", () => {
    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 0,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("<header");
    expect(html).toContain("<main");
  });

  test("includes ARIA labels for canvas elements", () => {
    const stats: SummaryStats = {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };

    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 1,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [
        {
          id: "test-metric",
          name: "Test Metric",
          description: null,
          stats,
          chartConfig: createMockChartConfig(),
          sparse: false,
          dataPointCount: 0,
        },
      ],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("aria-label");
    expect(html).toMatch(/aria-label="Line chart showing Test Metric over time"/);
  });

  test("includes semantic HTML and aria-hidden where appropriate", () => {
    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 0,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toContain("aria-hidden");
    expect(html).toContain("<header");
    expect(html).toContain("<main");
    expect(html).toContain("<footer");
  });
});

describe("generateHtmlReport - sparse data warnings", () => {
  test("shows warning for sparse data", () => {
    const stats: SummaryStats = {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };

    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 1,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [
        {
          id: "sparse-metric",
          name: "Sparse Metric",
          description: null,
          stats,
          chartConfig: createMockChartConfig(),
          sparse: true,
          dataPointCount: 3,
        },
      ],
    };

    const html = generateHtmlReport(reportData);

    expect(html).toMatch(/sparse|limited data|few data points/i);
  });

  test("does not show warning for sufficient data", () => {
    const stats: SummaryStats = {
      latest: 42,
      min: 10,
      max: 50,
      average: 30,
      trendDirection: "up",
      trendPercent: 10,
    };

    const reportData: ReportData = {
      metadata: {
        repository: "test/repo",
        generatedAt: "2025-10-16T12:00:00Z",
        buildCount: 1,
        dateRange: {
          start: "2025-10-01T12:00:00Z",
          end: "2025-10-01T12:00:00Z",
        },
      },
      metrics: [
        {
          id: "good-metric",
          name: "Good Metric",
          description: null,
          stats,
          chartConfig: createMockChartConfig(),
          sparse: false,
          dataPointCount: 50,
        },
      ],
    };

    const html = generateHtmlReport(reportData);

    const sparseMatch = html.match(/sparse|limited data|few data points/i);
    expect(sparseMatch).toBeNull();
  });
});
