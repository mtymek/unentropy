import type { TimeSeriesData, NormalizedDataPoint } from "./types";

export interface ChartDataPoint {
  commitSha: string;
  runNumber: number;
}

export interface ChartDataset {
  label: string;
  data: (number | null)[];
  metadata?: (ChartDataPoint | null)[];
  borderColor: string;
  backgroundColor: string;
  tension?: number;
  fill?: boolean;
  pointRadius?: number;
  pointHoverRadius?: number;
  borderWidth?: number;
  spanGaps?: boolean;
}

export interface TooltipConfig {
  enabled?: boolean;
  useCustomCallback?: boolean;
}

export interface ChartConfig {
  type: "line" | "bar";
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  options: {
    responsive: boolean;
    maintainAspectRatio: boolean;
    interaction: {
      mode: string;
      intersect: boolean;
    };
    plugins: {
      legend: {
        display: boolean;
      };
      tooltip?: TooltipConfig;
    };
    scales: {
      x?: {
        type?: string;
        time?: {
          unit: string;
          displayFormats?: Record<string, string>;
        };
        title: {
          display: boolean;
          text: string;
        };
      };
      y: {
        beginAtZero: boolean;
        ticks?: {
          stepSize: number;
        };
        title: {
          display: boolean;
          text: string;
        };
      };
    };
  };
}

export interface NormalizedChartInput {
  metricName: string;
  metricType: "numeric" | "label";
  normalizedData: NormalizedDataPoint[];
}

export function buildChartConfig(data: TimeSeriesData | NormalizedChartInput): ChartConfig {
  if ("normalizedData" in data) {
    return buildNormalizedNumericChartConfig(data);
  }
  if (data.metricType === "numeric") {
    throw new Error(
      "Numeric metrics must use NormalizedChartInput. Use normalizeMetricToBuilds() first."
    );
  }
  return buildLabelChartConfig(data);
}

function buildNormalizedNumericChartConfig(data: NormalizedChartInput): ChartConfig {
  const labels = data.normalizedData.map((dp) => dp.timestamp);
  const values = data.normalizedData.map((dp) => dp.value);
  const metadata = data.normalizedData.map((dp) =>
    dp.value !== null ? { commitSha: dp.commitSha, runNumber: dp.runNumber } : null
  );

  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: data.metricName,
          data: values,
          metadata,
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: false,
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
        tooltip: {
          enabled: true,
          useCustomCallback: true,
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            displayFormats: {
              day: "MMM d",
            },
          },
          title: {
            display: true,
            text: "Build Date",
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: data.metricName,
          },
        },
      },
    },
  };
}

function buildLabelChartConfig(data: TimeSeriesData): ChartConfig {
  const labelCounts = new Map<string, number>();

  for (const dp of data.dataPoints) {
    if (dp.valueLabel) {
      labelCounts.set(dp.valueLabel, (labelCounts.get(dp.valueLabel) ?? 0) + 1);
    }
  }

  const labels = Array.from(labelCounts.keys()).sort();
  const values = labels.map((label) => labelCounts.get(label) ?? 0);

  return {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Occurrences",
          data: values,
          backgroundColor: "rgba(59, 130, 246, 0.8)",
          borderColor: "rgb(59, 130, 246)",
          borderWidth: 1,
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
          ticks: {
            stepSize: 1,
          },
          title: {
            display: true,
            text: "Count",
          },
        },
      },
    },
  };
}
