import type { TimeSeriesData } from "./generator";

export interface ChartDataPoint {
  commitSha: string;
  runNumber: number;
}

export interface ChartDataset {
  label: string;
  data: number[];
  metadata?: ChartDataPoint[];
  borderColor: string;
  backgroundColor: string;
  tension?: number;
  fill?: boolean;
  pointRadius?: number;
  pointHoverRadius?: number;
  borderWidth?: number;
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
      tooltip?: Record<string, unknown>;
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

export function buildChartConfig(data: TimeSeriesData): ChartConfig {
  if (data.metricType === "numeric") {
    return buildNumericChartConfig(data);
  } else {
    return buildLabelChartConfig(data);
  }
}

function buildNumericChartConfig(data: TimeSeriesData): ChartConfig {
  const labels = data.dataPoints.map((dp) => dp.timestamp);
  const values = data.dataPoints.map((dp) => dp.valueNumeric ?? 0);
  const metadata = data.dataPoints.map((dp) => ({
    commitSha: dp.commitSha,
    runNumber: dp.runNumber,
  }));

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
