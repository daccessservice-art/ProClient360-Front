// Shared look for the main dashboard bar charts (Chart.js 2 options)

export const STATUS_COLORS = {
  inprocess: "#f59e0b",
  completed: "#22b35e",
  upcoming: "#3b82f6",
};

export const makeBarOptions = ({ yLabel } = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: 10, right: 8, left: 0, bottom: 0 } },

  // legend is drawn in the card header instead (see ChartLegend)
  legend: { display: false },
  plugins: {
    legend: { display: false },
    datalabels: { display: false },
  },

  hover: { mode: "index", intersect: false },
  tooltips: {
    mode: "index",
    intersect: false,
    backgroundColor: "rgba(30, 34, 53, 0.95)",
    titleFontColor: "#f8fafc",
    bodyFontColor: "#e2e8f0",
    titleFontSize: 12,
    bodyFontSize: 12,
    xPadding: 12,
    yPadding: 10,
    cornerRadius: 10,
    displayColors: true,
  },

  scales: {
    xAxes: [
      {
        gridLines: { display: false, drawBorder: false },
        barPercentage: 0.75,
        categoryPercentage: 0.6,
        maxBarThickness: 22,
        ticks: {
          autoSkip: false,
          fontColor: "#5b6178",
          fontSize: 12,
          padding: 6,
        },
      },
    ],
    yAxes: [
      {
        gridLines: {
          color: "#eef0f6",
          drawBorder: false,
          borderDash: [4, 4],
          zeroLineColor: "#e2e5ef",
        },
        ticks: {
          beginAtZero: true,
          precision: 0,
          fontColor: "#8a90a6",
          fontSize: 11,
          padding: 8,
          callback: (value) => (Number.isInteger(value) ? value : ""),
        },
        scaleLabel: yLabel
          ? { display: true, labelString: yLabel, fontColor: "#8a90a6", fontSize: 11 }
          : { display: false },
      },
    ],
  },
  animation: { duration: 800 },
});

export const ChartLegend = ({ items }) => (
  <div className="md-legend">
    {items.map((i) => (
      <span key={i.label} className="md-legend-item">
        <span className="md-legend-sw" style={{ background: i.color }} />
        {i.label}
      </span>
    ))}
  </div>
);

// Width so many categories scroll sideways instead of squashing
export const chartMinWidth = (count) => `${Math.max(count * 90, 480)}px`;