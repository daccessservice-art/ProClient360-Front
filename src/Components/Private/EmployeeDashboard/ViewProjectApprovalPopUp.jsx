import { useState } from "react";
import toast from "react-hot-toast";

// ✅ NEW: full project details for "Director Customer Delight" — Approve / Reject
// Path: src/Components/Private/EmployeeDashboard/ViewProjectApprovalPopUp.jsx

const fmtDate = (d) => {
  if (!d) return "N/A";
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? "N/A"
    : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtINR = (v) => {
  const n = Number(v);
  if (!n || n <= 0) return "₹0";
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Field = ({ label, value, full = false }) => (
  <div className={full ? "col-12" : "col-12 col-md-6 col-lg-4"} style={{ marginBottom: 12 }}>
    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#8a90a6", textTransform: "uppercase", letterSpacing: "0.3px" }}>
      {label}
    </div>
    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e2235", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
      {value === undefined || value === null || value === "" ? "N/A" : value}
    </div>
  </div>
);

const Section = ({ title, icon, children }) => (
  <div style={{ border: "1px solid #eceef5", borderRadius: 12, marginBottom: 14, overflow: "hidden" }}>
    <div style={{ background: "#f6f5ff", padding: "8px 14px", fontSize: "0.82rem", fontWeight: 700, color: "#5a48f0" }}>
      <i className={`fa-solid ${icon} me-2`}></i>{title}
    </div>
    <div className="row" style={{ padding: "12px 14px 0", margin: 0 }}>{children}</div>
  </div>
);

const ViewProjectApprovalPopUp = ({ project, onClose, onApprove, onReject, busy = false }) => {
  const [remark, setRemark] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");
  const [showPO, setShowPO] = useState(false);

  if (!project) return null;

  const a = project.Address || {};
  const address = [a.add, a.city, a.state, a.country, a.pincode].filter(Boolean).join(", ");
  const retention =
    project.retention ??
    Math.max(0, 100 - (Number(project.advancePay || 0) + Number(project.payAgainstDelivery || 0) + Number(project.payAfterCompletion || 0)));

  const handleRejectClick = () => {
    if (!rejectMode) return setRejectMode(true);
    if (!reason.trim()) return toast.error("Please enter rejection reason");
    onReject(project, reason.trim());
  };

  return (
    <div
      className="modal fade show"
      style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-xl" style={{ width: "100%" }}>
        <div className="modal-content" style={{ borderRadius: 16, overflow: "hidden" }}>
          {/* ── Header ── */}
          <div
            style={{
              background: "linear-gradient(115deg, #6d5dfc 0%, #8474ff 55%, #a996ff 100%)",
              color: "#fff",
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                <i className="fa-solid fa-clipboard-check me-2"></i>Project Approval
              </div>
              <div style={{ fontSize: "0.78rem", opacity: 0.9 }}>
                Created by {project.createdBy?.name || "N/A"} on {fmtDate(project.createdAt)}
              </div>
            </div>
            <span className="ed-badge" style={{ background: "#fff4e5", color: "#c2410c" }}>
              {project.approvalStatus || "Pending"}
            </span>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{
                background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
                borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 16,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: 18, maxHeight: "70vh", overflowY: "auto" }}>
            <Section title="Project" icon="fa-folder-open">
              <Field label="Customer Name" value={project.custId?.custName} />
              <Field label="Category" value={project.category} />
              <Field label="Project Status" value={project.projectStatus} />
              <Field label="Project Name" value={project.name} full />
            </Section>

            <Section title="Purchase Order" icon="fa-file-invoice">
              <Field label="PO Number" value={project.purchaseOrderNo} />
              <Field label="PO Date" value={fmtDate(project.purchaseOrderDate)} />
              <Field label="PO Value (without GST)" value={fmtINR(project.purchaseOrderValue)} />
              <div className="col-12" style={{ marginBottom: 12 }}>
                {project.POCopy ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="ed-icon-btn" style={{ width: "auto", padding: "0 12px", gap: 6, display: "inline-flex" }}
                      onClick={() => setShowPO((s) => !s)}>
                      <i className="fa-solid fa-file-pdf"></i> {showPO ? "Hide PO copy" : "View PO copy"}
                    </button>
                    <a href={project.POCopy} target="_blank" rel="noopener noreferrer" className="ed-icon-btn"
                      style={{ width: "auto", padding: "0 12px", gap: 6, display: "inline-flex", textDecoration: "none" }}>
                      <i className="fa-solid fa-up-right-from-square"></i> Open in new tab
                    </a>
                  </div>
                ) : (
                  <span style={{ fontSize: "0.8rem", color: "#8a90a6" }}>No PO copy uploaded</span>
                )}
                {showPO && project.POCopy && (
                  <iframe
                    src={project.POCopy}
                    title="PO Copy"
                    style={{ width: "100%", height: 460, border: "1px solid #eceef5", borderRadius: 10, marginTop: 10 }}
                  />
                )}
              </div>
            </Section>

            <Section title="Schedule" icon="fa-calendar-days">
              <Field label="Start Date" value={fmtDate(project.startDate)} />
              <Field label="End Date (Expected)" value={fmtDate(project.endDate)} />
              <Field label="Actual Completion" value={project.actualCompletionDate ? fmtDate(project.actualCompletionDate) : "-"} />
            </Section>

            <Section title="Payment Terms" icon="fa-indian-rupee-sign">
              <Field label="Advance Payment" value={`${project.advancePay ?? 0}%`} />
              <Field label="Pay Against Delivery" value={`${project.payAgainstDelivery ?? 0}%`} />
              <Field label="Pay After Completion" value={`${project.payAfterCompletion ?? 0}%`} />
              <Field label="Retention" value={`${retention}%`} />
              <Field label="Retention Days" value={project.retentionDays ?? 0} />
            </Section>

            <Section title="Site Address" icon="fa-location-dot">
              <Field label="Address" value={address} full />
            </Section>

            <Section title="Remark" icon="fa-comment">
              <Field label="Remark" value={project.remark} full />
            </Section>

            {/* ── Decision ── */}
            {!rejectMode ? (
              <div style={{ marginBottom: 4 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#5b6178" }}>Approval remark (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  maxLength={500}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Any note for the sales team..."
                  style={{ borderRadius: 10, fontSize: "0.85rem" }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: 4 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#dc2626" }}>
                  Rejection reason <span style={{ color: "red" }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell the sales employee what to correct..."
                  style={{ borderRadius: 10, fontSize: "0.85rem", borderColor: "#f6cfd3" }}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{ padding: "12px 18px", borderTop: "1px solid #eceef5", display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {rejectMode && (
              <button type="button" className="btn btn-light" onClick={() => setRejectMode(false)} disabled={busy}
                style={{ borderRadius: 10, marginRight: "auto" }}>
                Back
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy} style={{ borderRadius: 10 }}>
              Close
            </button>
            <button type="button" className="btn btn-danger" onClick={handleRejectClick} disabled={busy} style={{ borderRadius: 10 }}>
              <i className="fa-solid fa-xmark me-1"></i>{rejectMode ? (busy ? "Rejecting…" : "Confirm Reject") : "Reject"}
            </button>
            {!rejectMode && (
              <button type="button" className="ed-approve-btn" onClick={() => onApprove(project, remark.trim())} disabled={busy}
                style={{ padding: "8px 20px", fontSize: "0.85rem" }}>
                <i className="fa-solid fa-check me-1"></i>{busy ? "Approving…" : "Approve Project"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProjectApprovalPopUp;