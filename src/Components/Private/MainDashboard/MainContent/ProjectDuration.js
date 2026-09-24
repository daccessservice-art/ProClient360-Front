import { ProjectDurationBar } from "./ProjectDurationBar";
import "../../EmployeeDashboard/EmployeeDashboard.css";
import "./MainDashboard.css";

export const ProjectDuration = ({ duration }) => {
  return (
    <div className="ed-section">
      <ProjectDurationBar duration={duration} />
    </div>
  );
};