// ⚠️ Reuses the donut chart from the employee dashboard – adjust the path if your folder names differ
import { CompanyInfEmployeeDashboardPieChartoPieChart } from "../EmployeeDashboard/EmployeeDashboardPieChart";

export const AdminInfoPieChart = ({ activateCompanys, inactiveSubscriptions }) => {

  const segments = [
    { label: "Active", value: Number(activateCompanys) || 0, color: "#22b35e" },
    { label: "Deactivated", value: Number(inactiveSubscriptions) || 0, color: "#ef4444" },
  ];

  return (
    <CompanyInfEmployeeDashboardPieChartoPieChart
      segments={segments}
      centerLabel="Total companies"
    />
  );
};