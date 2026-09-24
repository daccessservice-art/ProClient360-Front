import { Categorywiseproject } from "./Categorywiseproject";
import { Valuewiseproject } from "./Valuewiseproject";
import "../../EmployeeDashboard/EmployeeDashboard.css";
import "./MainDashboard.css";

export const ProjectBar = ({ forbar, valueWise }) => {
  return (
    <div className="md-stack ed-section">
      <Categorywiseproject categorywise={forbar} />
      <Valuewiseproject valueWise={valueWise} />
    </div>
  );
};