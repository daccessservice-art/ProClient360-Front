/**
 * ProjectProgressReportPanel.jsx
 *
 * One-click Excel export covering every visible project, with real
 * task-based completion % alongside the manually-set project %.
 *
 * Usage:
 *   <ProjectProgressReportPanel />
 */

import { useState } from "react";
import { downloadProjectProgressReport } from "../../../../hooks/useReports";

const ProjectProgressReportPanel = () => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    await downloadProjectProgressReport();
    setDownloading(false);
  };

  return (
    <button
      type="button"
      className="btn btn-success btn-sm"
      onClick={handleDownload}
      disabled={downloading}
    >
      {downloading ? (
        <><span className="spinner-border spinner-border-sm me-1"></span>Generating...</>
      ) : (
        <><i className="fa-solid fa-diagram-project me-1"></i>Download Project Progress (Excel)</>
      )}
    </button>
  );
};

export default ProjectProgressReportPanel;