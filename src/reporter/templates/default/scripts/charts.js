/* eslint-disable @typescript-eslint/no-unused-vars */
// This script is inlined into generated HTML reports and runs in the browser.
// Variables are used by the initializeCharts function called from the data script.

var LINE_STYLE = {
  borderColor: "rgb(59, 130, 246)",
  backgroundColor: "rgba(59, 130, 246, 0.1)",
  tension: 0.4,
  fill: true,
  pointRadius: 4,
  pointHoverRadius: 6,
  spanGaps: false,
};

var BAR_STYLE = {
  backgroundColor: "rgba(59, 130, 246, 0.8)",
  borderColor: "rgb(59, 130, 246)",
  borderWidth: 1,
};

var COMMON_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: { legend: { display: false } },
};

function createTimeSeriesTooltip(metricName, timeline, metadata) {
  return {
    callbacks: {
      title: function (items) {
        if (!items.length) return "";
        var date = new Date(timeline[items[0].dataIndex]);
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      },
      label: function (ctx) {
        if (ctx.raw === null || ctx.raw === undefined) {
          return "No data recorded for this build";
        }
        var meta = metadata && metadata[ctx.dataIndex];
        var label = metricName + ": " + ctx.raw;
        if (meta) {
          label += " (Build #" + meta.run + ", " + meta.sha + ")";
        }
        return label;
      },
    },
  };
}

function buildLineChart(chart, timeline, metadata) {
  return {
    type: "line",
    data: {
      labels: timeline,
      datasets: [
        {
          label: chart.name,
          data: chart.values,
          borderColor: LINE_STYLE.borderColor,
          backgroundColor: LINE_STYLE.backgroundColor,
          tension: LINE_STYLE.tension,
          fill: LINE_STYLE.fill,
          pointRadius: LINE_STYLE.pointRadius,
          pointHoverRadius: LINE_STYLE.pointHoverRadius,
          spanGaps: LINE_STYLE.spanGaps,
        },
      ],
    },
    options: {
      responsive: COMMON_OPTIONS.responsive,
      maintainAspectRatio: COMMON_OPTIONS.maintainAspectRatio,
      interaction: COMMON_OPTIONS.interaction,
      plugins: {
        legend: COMMON_OPTIONS.plugins.legend,
        tooltip: createTimeSeriesTooltip(chart.name, timeline, metadata),
      },
      scales: {
        x: {
          type: "time",
          time: { unit: "day", displayFormats: { day: "MMM d" } },
          title: { display: true, text: "Build Date" },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: chart.name },
        },
      },
    },
  };
}

function buildBarChart(chart) {
  return {
    type: "bar",
    data: {
      labels: chart.labels,
      datasets: [
        {
          label: "Occurrences",
          data: chart.counts,
          backgroundColor: BAR_STYLE.backgroundColor,
          borderColor: BAR_STYLE.borderColor,
          borderWidth: BAR_STYLE.borderWidth,
        },
      ],
    },
    options: {
      responsive: COMMON_OPTIONS.responsive,
      maintainAspectRatio: COMMON_OPTIONS.maintainAspectRatio,
      interaction: COMMON_OPTIONS.interaction,
      plugins: { legend: COMMON_OPTIONS.plugins.legend },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          title: { display: true, text: "Count" },
        },
      },
    },
  };
}

function initializeCharts(timeline, metadata, lineCharts, barCharts) {
  lineCharts.forEach(function (chart) {
    var ctx = document.getElementById("chart-" + chart.id);
    if (ctx) new Chart(ctx, buildLineChart(chart, timeline, metadata));
  });

  barCharts.forEach(function (chart) {
    var ctx = document.getElementById("chart-" + chart.id);
    if (ctx) new Chart(ctx, buildBarChart(chart));
  });
}
