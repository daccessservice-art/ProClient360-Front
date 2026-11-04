import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getProjectAMCAlerts } from "../../../../hooks/useOldAMCHistory";

// ─────────────────────────────────────────────────────────────────────
// Project AMC Alerts
// Shows projects from Project Master whose AMC start date
// (= warranty end date OR project end date) is within the next 30 days
// or within the last 30 days — so the team can follow up with the
// customer for AMC / service.
//
// Project Master itself is NOT changed; this panel only reads project data.
// Once "Create AMC" is saved, that project disappears from this list and
// appears in the normal Old AMC History table (with follow-up blinker).
//
// ── FIX: Earlier this panel showed ALL ended projects (e.g. "Ended 450d
// ago"), which was confusing. Now it only shows projects whose Project
// End Date OR Warranty End Date is within ±30 days of today.
// ─────────────────────────────────────────────────────────────────────

const DAY_MS = 1000 * 60 * 60 * 24;
// ── CHANGED: ±30 day window (was 60 days future-only) ──
const ALERT_WINDOW_DAYS = 30;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// yyyy-mm-dd in LOCAL time (avoids 1-day shift from toISOString)
const toInputDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${mm}-${dd}`;
};

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "N/A");

const getWarrantyEnd = (p) => {
  if (!p.warrantyStartDate || !p.warrantyMonths) return null;
  const d = new Date(p.warrantyStartDate);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + Number(p.warrantyMonths));
  return d;
};

// ── NEW: AMC start = warranty end (if warranty given) otherwise project end.
// Alert is based on AMC start date. Only projects whose AMC start is within
// ±ALERT_WINDOW_DAYS of today are returned by the backend, so the day count
// shown here will always be a sensible small number.
const getProjectAlert = (p) => {
  const warrantyEnd = getWarrantyEnd(p);
  const projectEnd = p.endDate ? new Date(p.endDate) : null;
  const amcStart = warrantyEnd || projectEnd;

  if (!amcStart) {
    return {
      type: "ended",
      label: "No date",
      source: "none",
      title: "No project end date or warranty date available",
    };
  }

  const diff = Math.round(
    (startOfDay(amcStart) - startOfDay(new Date())) / DAY_MS
  );
  const sourceLabel = warrantyEnd ? "Warranty" : "Project";

  if (diff < 0) {
    return {
      type: "ended",
      label: `AMC due ${Math.abs(diff)}d ago`,
      source: warrantyEnd ? "warranty" : "project",
      title: `${sourceLabel} ended ${Math.abs(diff)} day(s) ago — AMC should be started`,
    };
  }
  if (diff === 0) {
    return {
      type: "ended",
      label: "AMC due Today",
      source: warrantyEnd ? "warranty" : "project",
      title: `${sourceLabel} ends today — start AMC follow-up`,
    };
  }
  return {
    type: "upcoming",
    label: `AMC in ${diff}d`,
    source: warrantyEnd ? "warranty" : "project",
    title: `${sourceLabel} ends in ${diff} day(s) — AMC follow-up due soon`,
  };
};

const ALERT_STYLE = {
  ended: {
    row: "amcBlinkRed 1.2s infinite",
    border: "#dc2626",
    badgeBg: "#dc2626",
    badgeText: "#fff",
  },
  upcoming: {
    row: "amcBlinkDarkYellow 1.2s infinite",
    border: "#a16207",
    badgeBg: "#a16207",
    badgeText: "#fff",
  },
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case "Upcoming":
      return "bg-primary";
    case "Inprocess":
      return "bg-warning text-dark";
    case "Completed":
      return "bg-success";
    default:
      return "bg-secondary";
  }
};

// Build the values used to pre-fill the "Add AMC" popup from a project
const buildPrefill = (p) => {
  const c = p.custId || {};
  const warrantyEnd = getWarrantyEnd(p);

  // AMC starts after warranty ends (if warranty given), otherwise after project end date
  const amcStart = warrantyEnd || (p.endDate ? new Date(p.endDate) : new Date());
  const amcEnd = new Date(amcStart);
  amcEnd.setFullYear(amcEnd.getFullYear() + 1);
  amcEnd.setDate(amcEnd.getDate() - 1);

  const remark = [
    `AMC from Project: ${p.name || ""}`,
    p.purchaseOrderNo ? `PO No: ${p.purchaseOrderNo}` : "",
    p.endDate ? `Project End: ${fmt(p.endDate)}` : "",
    warrantyEnd ? `Warranty till: ${fmt(warrantyEnd)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    custName: c.custName || "",
    customerType: c.customerType === "branch" ? "branch" : "main",
    email: c.email || "",
    ownedBy: "",
    industryType: c.industryType || "",
    customerPriority: c.customerPriority || "",
    customerContactPersonName1: c.customerContactPersonName1 || "",
    phoneNumber1: c.phoneNumber1 ? String(c.phoneNumber1) : "",
    customerContactPersonEmail1: c.customerContactPersonEmail1 || "",
    customerContactPersonDesignation1: c.customerContactPersonDesignation1 || "",
    city: p.Address?.city || c.billingAddress?.city || "",
    state: p.Address?.state || c.billingAddress?.state || "",
    pincode: String(p.Address?.pincode || c.billingAddress?.pincode || ""),
    GSTNo: c.GSTNo || "",
    zone: c.zone || "",
    system: (p.category || "").slice(0, 500),
    remark: remark.slice(0, 2000),
    startDate: toInputDate(amcStart),
    endDate: toInputDate(amcEnd),
    nextFollowUpDate: toInputDate(new Date()), // follow up starts today → row goes yellow
    sourceProject: p._id,
    sourceProjectName: p.name || "",
  };
};

const ProjectAMCAlertsPanel = ({ refreshKey = 0, onCreateAMC }) => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState("all"); // all | upcoming | ended

  const load = async () => {
    setLoading(true);
    const data = await getProjectAMCAlerts();
    setLoading(false);
    if (data?.success) {
      setProjects(data.projects || []);
    } else {
      toast.error(data?.error || "Failed to load project AMC alerts");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const withAlert = projects.map((p) => ({ p, alert: getProjectAlert(p) }));
  const upcomingCount = withAlert.filter((x) => x.alert.type === "upcoming").length;
  const endedCount = withAlert.filter((x) => x.alert.type === "ended").length;
  const visible = tab === "all" ? withAlert : withAlert.filter((x) => x.alert.type === tab);

  return (
    <div className="row bg-white p-2 m-1 border rounded" style={{ borderLeft: "5px solid #dc2626" }}>
      <div className="col-12 py-1 d-flex align-items-center flex-wrap gap-2">
        <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
          <i
            className="fa-solid fa-bell text-danger"
            style={{ animation: projects.length > 0 ? "amcIconBlink 1s infinite" : "none" }}
          ></i>
          Project AMC Alerts
          <span className="badge bg-danger">{projects.length}</span>
        </h6>
        <small className="text-muted">
          Projects whose <strong>Project End Date</strong> or <strong>Warranty End Date</strong> is
          within <strong>±{ALERT_WINDOW_DAYS} days</strong> of today. Follow up with the customer for AMC or service.
        </small>

        <div className="ms-auto d-flex align-items-center gap-1">
          <button
            type="button"
            className={`btn btn-sm ${tab === "all" ? "btn-dark" : "btn-outline-dark"}`}
            onClick={() => setTab("all")}
          >
            All ({projects.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === "upcoming" ? "btn-warning" : "btn-outline-warning"}`}
            onClick={() => setTab("upcoming")}
          >
            Upcoming ({upcomingCount})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === "ended" ? "btn-danger" : "btn-outline-danger"}`}
            onClick={() => setTab("ended")}
          >
            Ended / Due ({endedCount})
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={load}
            title="Refresh"
            disabled={loading}
          >
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`}></i>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setOpen((o) => !o)}
            title={open ? "Hide" : "Show"}
          >
            <i className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
          </button>
        </div>
      </div>

      {open && (
        <div className="col-12 py-2">
          <div className="table-responsive" style={{ maxHeight: "340px", overflowY: "auto" }}>
            <table className="table table-striped table-class mb-0">
              <thead>
                <tr className="th_border">
                  <th className="text-center">Sr. No</th>
                  <th className="align_left_td">Customer Name</th>
                  <th className="align_left_td">Project Name</th>
                  <th className="text-center">Category / System</th>
                  <th className="text-center">PO Number</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">End Date</th>
                  <th className="text-center">Warranty Till</th>
                  <th className="text-center">AMC Alert</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.length > 0 ? (
                  visible.map(({ p, alert }, index) => {
                    const st = ALERT_STYLE[alert.type];
                    const warrantyEnd = getWarrantyEnd(p);
                    return (
                      <tr
                        key={p._id}
                        style={{ animation: st.row, borderLeft: `5px solid ${st.border}` }}
                      >
                        <td className="text-center">{index + 1}</td>
                        <td className="align_left_td wrap-text-of-col">
                          {p.custId?.custName || "N/A"}
                        </td>
                        <td className="align_left_td wrap-text-of-col" title={p.name}>
                          {p.name && p.name.length > 60 ? `${p.name.slice(0, 60)}...` : p.name}
                        </td>
                        <td className="text-center">{p.category || "N/A"}</td>
                        <td className="text-center">{p.purchaseOrderNo || "N/A"}</td>
                        <td className="text-center">
                          <span
                            className={`badge rounded-pill px-2 py-1 ${getStatusBadgeClass(
                              p.projectStatus
                            )}`}
                          >
                            {p.projectStatus}
                          </span>
                        </td>
                        <td className="text-center">
                          {p.endDate ? (
                            <span title={alert.source === "project" ? "This date triggered the alert" : ""}>
                              {fmt(p.endDate)}
                              {alert.source === "project" && (
                                <i className="fa-solid fa-circle-dot ms-1 text-danger" title="Alert source"></i>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          {warrantyEnd ? (
                            <span title={alert.source === "warranty" ? "This date triggered the alert" : ""}>
                              {fmt(warrantyEnd)}
                              {alert.source === "warranty" && (
                                <i className="fa-solid fa-circle-dot ms-1 text-danger" title="Alert source"></i>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          <span
                            title={alert.title}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                              color: st.badgeText,
                              background: st.badgeBg,
                              borderRadius: "6px",
                              padding: "2px 7px",
                              animation: "amcIconBlink 1s infinite",
                            }}
                          >
                            <i className="fa-solid fa-triangle-exclamation"></i>
                            {alert.label}
                          </span>
                          <small
                            className="d-block text-muted"
                            style={{ fontSize: "0.65rem", marginTop: "2px" }}
                          >
                            {alert.source === "warranty"
                              ? "(warranty end)"
                              : alert.source === "project"
                              ? "(project end)"
                              : ""}
                          </small>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            style={{ whiteSpace: "nowrap", fontSize: "11px" }}
                            onClick={() => onCreateAMC && onCreateAMC(buildPrefill(p))}
                            title="Create an AMC record for this project and start follow-up"
                          >
                            <i className="fa-solid fa-file-circle-plus me-1"></i>Create AMC
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="text-center text-muted">
                      {loading
                        ? "Loading..."
                        : `No projects need AMC follow-up within ±${ALERT_WINDOW_DAYS} days right now.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAMCAlertsPanel;