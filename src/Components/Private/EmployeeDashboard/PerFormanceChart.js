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

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: "Performance",
        data: values,
        fill: true,
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return "rgba(79, 125, 249, 0.1)";
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, "rgba(79, 125, 249, 0.28)");
          gradient.addColorStop(0.6, "rgba(79, 125, 249, 0.06)");
          gradient.addColorStop(1, "rgba(79, 125, 249, 0.0)");
          return gradient;
        },
        borderColor: "#4f7df9",
        borderWidth: 3,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#4f7df9",
        pointBorderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 9,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: "#ffffff",
        pointHoverBorderColor: "#4f7df9",
        lineTension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 5,
        right: 5,
        left: 0,
        bottom: 0,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(30, 41, 59, 0.95)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        titleFont: { size: 12, weight: "bold", family: "Segoe UI" },
        bodyFont: { size: 14, weight: "600", family: "Segoe UI" },
        padding: { top: 10, bottom: 10, left: 14, right: 14 },
        cornerRadius: 10,
        displayColors: false,
        borderColor: "rgba(79, 125, 249, 0.3)",
        borderWidth: 1,
        callbacks: {
          title: function (context) {
            return isYearView ? "Year " + context[0].label : context[0].label;
          },
          label: function (context) {
            return "Performance: " + context.parsed.y + "%";
          },
        },
      },
    },
    scales: {
      xAxes: [
        {
          gridLines: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            color: "#94a3b8",
            fontSize: 11,
            font: {
              family: "Segoe UI",
              weight: "500",
            },
            padding: 8,
          },
        },
      ],
      yAxes: [
        {
          gridLines: {
            color: "#f1f5f9",
            drawBorder: false,
            lineWidth: 1,
            zeroLineColor: "#e2e8f0",
            zeroLineWidth: 1,
          },
          ticks: {
            color: "#94a3b8",
            fontSize: 11,
            font: {
              family: "Segoe UI",
            },
            padding: 12,
            callback: function (value) {
              return value + "%";
            },
            maxTicksLimit: 6,
            stepSize: 20,
          },
          min: 0,
          max: 120,
        },
      ],
    },
    animation: {
      duration: 1000,
      easing: "easeOutQuart",
    },
    elements: {
      line: {
        capBezierPoints: true,
      },
    },
  };

  return (
    <div className="w-100" style={{ padding: "4px 0 0 0" }}>
      <div style={{
        background: "#fff",
        borderRadius: "16px",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        overflow: "hidden",
        width: "100%",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #4f7df9 0%, #6c8cff 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 12px rgba(79,125,249,0.35)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <h6 className="mb-0 fw-bold" style={{ color: "#1e293b", fontSize: "0.95rem" }}>
                Performance
              </h6>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                {isYearView ? "Yearly overview" : "Monthly overview"}
              </span>
            </div>
          </div>

          {/* Badges + Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: "50px", padding: "4px 12px",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#16a34a" }}>Peak: {maxVal}%</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "#eff6ff", border: "1px solid #bfdbfe",
              borderRadius: "50px", padding: "4px 12px",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4f7df9" }} />
              <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#2563eb" }}>Avg: {avgVal}%</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                fontSize: "0.76rem", fontWeight: 600,
                color: !isYearView ? "#4f7df9" : "#94a3b8",
                transition: "color 0.2s",
              }}>Monthly</span>
              <div
                onClick={() => setIsYearView(!isYearView)}
                style={{
                  width: 46, height: 24, borderRadius: 50,
                  background: isYearView ? "linear-gradient(135deg, #4f7df9, #6c8cff)" : "#e2e8f0",
                  cursor: "pointer", position: "relative",
                  transition: "background 0.3s ease",
                  boxShadow: isYearView ? "0 2px 10px rgba(79,125,249,0.4)" : "inset 0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: "#fff", position: "absolute",
                  top: 3, left: isYearView ? 25 : 3,
                  transition: "left 0.3s cubic-bezier(0.68,-0.55,0.265,1.55)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                }} />
              </div>
              <span style={{
                fontSize: "0.76rem", fontWeight: 600,
                color: isYearView ? "#4f7df9" : "#94a3b8",
                transition: "color 0.2s",
              }}>Yearly</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ padding: "8px 20px 20px 20px", height: "330px" }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};