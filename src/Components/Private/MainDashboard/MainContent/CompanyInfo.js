import { CompanyInfoPieChart } from "./CompanyInfoPieChart";
import "../../EmployeeDashboard/EmployeeDashboard.css";
import "./MainDashboard.css";

export const CompanyInfo = ({ categorywise }) => {

  const completed = Number(categorywise?.completed) || 0;
  const inprocess = Number(categorywise?.inprocess) || 0;
  const upcoming = Number(categorywise?.upcoming) || 0;
  const total = completed + inprocess + upcoming;

  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);

  const cards = [
    {
      label: "Total projects",
      value: total,
      icon: "fa-folder-open",
      accent: "#7c5cfc",
      tint: "#f3efff",
      foot: <>Across all categories</>,
    },
    {
      label: "Completed projects",
      value: completed,
      icon: "fa-circle-check",
      accent: "#22b35e",
      tint: "#ecf9f1",
      foot: <><b>{pct(completed)}%</b> completion rate</>,
    },
    {
      label: "In progress",
      value: inprocess,
      icon: "fa-hourglass-half",
      accent: "#f59e0b",
      tint: "#fff5e8",
      foot: <><b>{pct(inprocess)}%</b> of all projects</>,
    },
    {
      label: "Upcoming projects",
      value: upcoming,
      icon: "fa-calendar-plus",
      accent: "#3b82f6",
      tint: "#edf4ff",
      foot: <><b>{pct(upcoming)}%</b> scheduled to start</>,
    },
  ];

  return (
    <div className="md-overview">
      <div className="ed-kpi-grid md-kpi-2x2">
        {cards.map((c) => (
          <div
            key={c.label}
            className="ed-kpi"
            style={{ "--accent": c.accent, "--tint": c.tint }}
          >
            <div className="ed-kpi-top">
              <div style={{ minWidth: 0 }}>
                <div className="ed-kpi-label">{c.label}</div>
                <div className="ed-kpi-value">{c.value}</div>
              </div>
              <div className="ed-kpi-icon">
                <i className={`fa-solid ${c.icon}`}></i>
              </div>
            </div>
            <div className="ed-kpi-foot">{c.foot}</div>
          </div>
        ))}
      </div>

      <CompanyInfoPieChart categorywise={categorywise} />
    </div>
  );
};