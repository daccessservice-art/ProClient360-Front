import { Chart } from "chart.js";
import { Bar } from "react-chartjs-2";
import { STATUS_COLORS, makeBarOptions, ChartLegend, chartMinWidth } from "./dashboardChartTheme";

// Customize chart legend (kept from original – affects other charts that show a legend)
Chart.Legend.prototype.afterFit = function () {
  this.height = this.height + 40;
};

export const Valuewiseproject = ({ valueWise }) => {

  const safe = valueWise || [];
  const rangeData = safe.map((data) => data.range);
  const inProcessData = safe.map((data) => data.inprocess);
  const completedData = safe.map((data) => data.completed);
  const upcomingData = safe.map((data) => data.upcoming);

  const chartData = {
    labels: rangeData,
    datasets: [
      { label: "In progress", data: inProcessData, backgroundColor: STATUS_COLORS.inprocess },
      { label: "Completed", data: completedData, backgroundColor: STATUS_COLORS.completed },
      { label: "Upcoming", data: upcomingData, backgroundColor: STATUS_COLORS.upcoming },
    ],
  };

  return (
    <div className="ed-card">
      <div className="ed-card-head">
        <div>
          <div className="ed-card-title">Value wise projects</div>
          <div className="ed-card-sub">Project status by project value range</div>
        </div>
        <ChartLegend
          items={[
            { label: "In progress", color: STATUS_COLORS.inprocess },
            { label: "Completed", color: STATUS_COLORS.completed },
            { label: "Upcoming", color: STATUS_COLORS.upcoming },
          ]}
        />
      </div>
      <div className="ed-card-body">
        {rangeData.length === 0 ? (
          <div className="ed-empty">
            <i className="fa-solid fa-indian-rupee-sign"></i>
            No value data yet. Add project values to see this chart.
          </div>
        ) : (
          <div className="md-chart-scroll">
            <div className="ed-chart-box" style={{ minWidth: chartMinWidth(rangeData.length) }}>
              <Bar data={chartData} options={makeBarOptions({ yLabel: "Projects" })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};