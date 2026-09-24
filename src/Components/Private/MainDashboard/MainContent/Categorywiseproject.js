import { Bar } from "react-chartjs-2";
import { STATUS_COLORS, makeBarOptions, ChartLegend, chartMinWidth } from "./dashboardChartTheme";

export const Categorywiseproject = ({ categorywise }) => {
  // Extract category data directly from props
  const safe = categorywise || {};
  const categories = Object.keys(safe);
  const inprocessData = categories.map((category) => safe[category].inprocess);
  const completedData = categories.map((category) => safe[category].completed);
  const upcomingData = categories.map((category) => safe[category].upcoming);

  const chartData = {
    labels: categories,
    datasets: [
      { label: "In progress", data: inprocessData, backgroundColor: STATUS_COLORS.inprocess },
      { label: "Completed", data: completedData, backgroundColor: STATUS_COLORS.completed },
      { label: "Upcoming", data: upcomingData, backgroundColor: STATUS_COLORS.upcoming },
    ],
  };

  return (
    <div className="ed-card">
      <div className="ed-card-head">
        <div>
          <div className="ed-card-title">Category wise projects</div>
          <div className="ed-card-sub">Project status in each category</div>
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
        {categories.length === 0 ? (
          <div className="ed-empty">
            <i className="fa-solid fa-chart-column"></i>
            No category data yet. Projects will appear here once they're added.
          </div>
        ) : (
          <div className="md-chart-scroll">
            <div className="ed-chart-box" style={{ minWidth: chartMinWidth(categories.length) }}>
              <Bar data={chartData} options={makeBarOptions({ yLabel: "Projects" })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};