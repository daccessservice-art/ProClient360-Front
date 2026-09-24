import { useState } from "react";
import { Line } from "react-chartjs-2";
import "chart.js";

export const PerFormanceChart = () => {
  const [isYearView, setIsYearView] = useState(false);

  const monthlyLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyValues = [0, 70, 60, 100, 90, 30, 50, 65, 35, 55, 100, 95];

  const yearlyLabels = ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023"];
  const yearlyValues = [0, 10, 60, 40, 33, 60, 70, 20, 99];

  const labels = isYearView ? yearlyLabels : monthlyLabels;
  const values = isYearView ? yearlyValues : monthlyValues;

  const maxVal = Math.max(...values);
  const avgVal = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  const LINE = "#6d5dfc";

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: "Performance",
        data: values,
        fill: true,
        // Plain soft fill (no canvas gradient) – avoids the "non-finite" crash
        backgroundColor: "rgba(109, 93, 252, 0.12)",
        borderColor: LINE,
        borderWidth: 3,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: LINE,
        pointBorderWidth: 2.5,
        pointRadius: 4.5,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: "#ffffff",
        pointHoverBorderColor: LINE,
        lineTension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 10, right: 8, left: 0, bottom: 0 } },
    legend: { display: false },
    hover: { mode: "index", intersect: false },
    tooltips: {
      mode: "index",
      intersect: false,
      backgroundColor: "rgba(30, 34, 53, 0.95)",
      titleFontColor: "#f8fafc",
      bodyFontColor: "#e2e8f0",
      titleFontSize: 12,
      bodyFontSize: 13,
      bodyFontStyle: "bold",
      xPadding: 14,
      yPadding: 10,
      cornerRadius: 10,
      displayColors: false,
      callbacks: {
        title: function (items) {
          const label = items && items[0] ? items[0].label || items[0].xLabel : "";
          return isYearView ? "Year " + label : label;
        },
        label: function (item) {
          return "Performance: " + item.yLabel + "%";
        },
      },
    },
    scales: {
      xAxes: [
        {
          gridLines: { display: false, drawBorder: false },
          ticks: { fontColor: "#8a90a6", fontSize: 11, padding: 8 },
        },
      ],
      yAxes: [
        {
          gridLines: {
            color: "#eef0f6",
            drawBorder: false,
            borderDash: [4, 4],
            zeroLineColor: "#e2e5ef",
            zeroLineBorderDash: [4, 4],
          },
          ticks: {
            fontColor: "#8a90a6",
            fontSize: 11,
            padding: 10,
            min: 0,
            max: 100,
            stepSize: 20,
            callback: function (value) {
              return value + "%";
            },
          },
        },
      ],
    },
    animation: { duration: 900, easing: "easeOutQuart" },
  };

  return (
    <div className="ed-card">
      <div className="ed-card-head">
        <div>
          <div className="ed-card-title">Performance overview</div>
          <div className="ed-card-sub">
            {isYearView ? "Yearly performance score" : "Monthly performance score"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="ed-chip" style={{ color: "#15803d", background: "#effaf3", borderColor: "#c9eed8" }}>
            <span className="ed-chip-dot" style={{ background: "#22b35e" }} />
            Peak {maxVal}%
          </span>
          <span className="ed-chip" style={{ color: "#5a48f0", background: "#f3f1ff", borderColor: "#dcd6ff" }}>
            <span className="ed-chip-dot" style={{ background: LINE }} />
            Avg {avgVal}%
          </span>
          <div className="ed-seg" role="tablist" aria-label="Chart period">
            <button
              type="button"
              role="tab"
              aria-selected={!isYearView}
              className={!isYearView ? "active" : ""}
              onClick={() => setIsYearView(false)}
            >
              Monthly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isYearView}
              className={isYearView ? "active" : ""}
              onClick={() => setIsYearView(true)}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      <div className="ed-card-body">
        <div className="ed-chart-box">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};