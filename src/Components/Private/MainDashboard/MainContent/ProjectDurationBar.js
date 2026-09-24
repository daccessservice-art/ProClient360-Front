import { Chart } from "chart.js";
import { Bar } from "react-chartjs-2";
import { makeBarOptions, chartMinWidth } from "./dashboardChartTheme";

// Kept from original – affects other charts that show a legend
Chart.Legend.prototype.afterFit = function () {
  this.height = this.height + 40;
};

const DELAY_SHADES = ["#6d5dfc", "#8b7bff", "#a996ff", "#c4b8ff", "#ddd6ff"];

export const ProjectDurationBar = ({ duration }) => {

  const safe = duration || [];
  const rangeData = safe.map((data) => data.range);
  const delayData = safe.map((data) => data.delayedProjects);

  const chartData = {
    labels: rangeData,
    datasets: [
      {
        label: "Delayed projects",
        data: delayData,
        backgroundColor: rangeData.map((_, i) => DELAY_SHADES[i % DELAY_SHADES.length]),
      },
    ],
  };

  const totalDelayed = delayData.reduce((s, v) => s + (Number(v) || 0), 0);

  return (
    <div className="ed-card">
      <div className="ed-card-head">
        <div>
          <div className="ed-card-title">Project duration</div>
          <div className="ed-card-sub">Delayed projects grouped by how many days they're late</div>
        </div>
        <span className="ed-chip" style={{ color: "#5a48f0", background: "#f3f1ff", borderColor: "#dcd6ff" }}>
          <span className="ed-chip-dot" style={{ background: "#6d5dfc" }} />
          {totalDelayed} delayed
        </span>
      </div>
      <div className="ed-card-body">
        {rangeData.length === 0 ? (
          <div className="ed-empty">
            <i className="fa-solid fa-circle-check"></i>
            No delayed projects. Everything is on schedule.
          </div>
        ) : (
          <div className="md-chart-scroll">
            <div className="ed-chart-box" style={{ minWidth: chartMinWidth(rangeData.length) }}>
              <Bar data={chartData} options={makeBarOptions({ yLabel: "Delayed projects" })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};