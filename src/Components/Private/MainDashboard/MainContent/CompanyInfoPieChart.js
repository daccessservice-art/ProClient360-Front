import { CompanyInfEmployeeDashboardPieChartoPieChart } from "../../EmployeeDashboard/EmployeeDashboardPieChart";

export const CompanyInfoPieChart = ({ categorywise }) => {

  const segments = [
    { label: "Completed", value: Number(categorywise?.completed) || 0, color: "#22b35e" },
    { label: "In progress", value: Number(categorywise?.inprocess) || 0, color: "#f59e0b" },
    { label: "Upcoming", value: Number(categorywise?.upcoming) || 0, color: "#3b82f6" },
  ];

  return (
    <div className="ed-card">
      <div className="ed-card-head">
        <div>
          <div className="ed-card-title">Projects by status</div>
          <div className="ed-card-sub">Hover a slice to see its share</div>
        </div>
      </div>
      <div className="ed-card-body" style={{ display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%" }}>
          <CompanyInfEmployeeDashboardPieChartoPieChart
            segments={segments}
            centerLabel="Total projects"
          />
        </div>
      </div>
    </div>
  );
};