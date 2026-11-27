// AI CALLING – NEW: "AI Agent" button popup — Tripti status, safety switches, today's numbers, recent calls
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  getAiConfig, getAiRecentCalls, queueLeadsForAi, formatIST, callBadge,
} from "../../../../../hooks/aiCalling/aiAgentApi";

const Stat = ({ label, value, color, bg, icon }) => (
  <div className="col-6 col-md">
    <div className="p-3 h-100 d-flex justify-content-between align-items-center" style={{ background: bg, borderRadius: 12 }}>
      <div>
        <div className="text-dark" style={{ fontSize: "0.78rem", fontWeight: 600 }}>{label}</div>
        <div className="fw-bold" style={{ fontSize: "1.6rem", color }}>{value ?? 0}</div>
      </div>
      <i className={`fa-solid ${icon}`} style={{ fontSize: "1.8rem", color, opacity: 0.4 }}></i>
    </div>
  </div>
);

const AiAgentDashboardPopUp = ({ pageLeads = [], onClose, onOpenLead, onQueued }) => {
  const [config, setConfig] = useState(null);
  const [recent, setRecent] = useState({ calls: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [queueing, setQueueing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, r] = await Promise.all([getAiConfig(), getAiRecentCalls(30)]);
    if (c?.success) setConfig(c); else toast.error(c?.error || "AI Agent not reachable");
    if (r?.success) setRecent(r);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const allowed = (config?.allowedSources || []).map((s) => s.toLowerCase());
  const allowAll = allowed.includes("all") || allowed.includes("*");
  const eligibleOnPage = pageLeads.filter((l) => allowAll || allowed.includes(String(l.SOURCE || "Direct").toLowerCase()));

  const handleQueuePage = async () => {
    if (!eligibleOnPage.length) return toast.error("No leads on this page are enabled for AI calling.");
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Queue ${eligibleOnPage.length} lead(s) from this page for Tripti?\nShe will call them within calling hours (blocked sources and the testing lock are still respected).`)) return;
    setQueueing(true);
    const res = await queueLeadsForAi(eligibleOnPage.map((l) => l._id));
    setQueueing(false);
    if (res?.success) {
      toast.success(res.message);
      const skipped = (res.results || []).filter((x) => !x.queued);
      if (skipped.length) toast(`${skipped.length} skipped: ${skipped[0].reason}${skipped.length > 1 ? " ..." : ""}`, { duration: 6000 });
      onQueued && onQueued();
      load();
    } else {
      toast.error(res?.error || "Could not queue leads");
    }
  };

  const s = recent.stats || {};

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl modal-dialog-centered" style={{ width: "1050px", maxWidth: "95%" }}>
        <div className="modal-content" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
          <div className="modal-header">
            <h5 className="modal-title fw-bold">
              <i className="fa-solid fa-robot me-2 text-primary"></i>AI Calling Agent — Tripti
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body" style={{ overflowY: "auto" }}>
            {loading && !config ? (
              <div className="text-center py-4 text-muted">Loading...</div>
            ) : !config?.enabled ? (
              <div className="alert alert-secondary">AI calling is not enabled for this company.</div>
            ) : (
              <>
                {/* Safety switches */}
                <div className="d-flex flex-wrap gap-2 mb-3" style={{ fontSize: "0.85rem" }}>
                  <span className={`badge ${config.dryRun ? "bg-warning text-dark" : "bg-success"} p-2`}>
                    <i className="fa-solid fa-power-off me-1"></i>{config.dryRun ? "TEST MODE (no real calls)" : "LIVE calls"}
                  </span>
                  <span className="badge bg-primary p-2">
                    <i className="fa-solid fa-filter me-1"></i>Calls only: {config.allowedSources.join(", ")}
                  </span>
                  {config.testLock && (
                    <span className="badge bg-danger p-2">
                      <i className="fa-solid fa-lock me-1"></i>Testing lock: only {config.testNumbersCount} test number(s)
                    </span>
                  )}
                  <span className={`badge ${config.autoCall ? "bg-success" : "bg-secondary"} p-2`}>
                    <i className="fa-solid fa-bolt me-1"></i>Auto-call new leads: {config.autoCall ? "ON" : "OFF"}
                  </span>
                  <span className={`badge ${config.withinHours ? "bg-success" : "bg-secondary"} p-2`}>
                    <i className="fa-solid fa-clock me-1"></i>{config.callWindow} · {config.withinHours ? "open now" : "closed now"}
                  </span>
                  <span className="badge bg-light text-dark border p-2">
                    <i className="fa-solid fa-share me-1"></i>Forwards to: {(config.team || []).map((t) => t.name).join(", ") || "—"}
                  </span>
                </div>

                {/* Today */}
                <div className="row g-2 mb-3">
                  <Stat label="Calls today" value={s.today} color="#1565C0" bg="#DDEEFF" icon="fa-phone" />
                  <Stat label="Connected" value={s.connected} color="#2E7D32" bg="#E8F5E9" icon="fa-headset" />
                  <Stat label="Site visits booked" value={s.siteVisits} color="#E65100" bg="#FFF3E0" icon="fa-location-dot" />
                  <Stat label="Forwarded to sales" value={s.transferred} color="#6A1B9A" bg="#F3E5F5" icon="fa-share" />
                  <Stat label="On call now" value={s.active} color="#0277BD" bg="#E1F5FE" icon="fa-tower-broadcast" />
                </div>

                {/* Bulk */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0 text-primary"><i className="fa-solid fa-list me-2"></i>Recent AI calls</h6>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-light border" onClick={load}>
                      <i className="fa-solid fa-rotate me-1"></i>Refresh
                    </button>
                    <button type="button" className="btn btn-sm btn-primary" disabled={queueing} onClick={handleQueuePage}>
                      <i className="fa-solid fa-play me-1"></i>
                      {queueing ? "Queueing..." : `Queue eligible leads on this page (${eligibleOnPage.length})`}
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm table-striped table-hover mb-0" style={{ fontSize: "0.85rem" }}>
                    <thead className="table-light">
                      <tr>
                        <th>When</th><th>Customer</th><th>Mobile</th><th>Source</th><th>Result</th><th>Summary</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.calls.length === 0 ? (
                        <tr><td colSpan="7" className="text-center text-muted py-3">No AI calls yet</td></tr>
                      ) : recent.calls.map((c) => {
                        const b = callBadge(c);
                        return (
                          <tr key={c._id}>
                            <td style={{ whiteSpace: "nowrap" }}>{formatIST(c.createdAt)}</td>
                            <td>{c.lead?.name || "—"}{c.lead?.company ? <div className="text-muted small">{c.lead.company}</div> : null}</td>
                            <td>{c.phone || c.lead?.phone || "—"}</td>
                            <td>{c.direction === "inbound" ? <span className="badge bg-success">Inbound</span> : (c.lead?.source || "—")}</td>
                            <td><span className={`badge ${b.cls}`}>{b.text}</span></td>
                            <td style={{ maxWidth: 320 }}>
                              <span title={c.summary || ""}>{c.summary ? (c.summary.length > 90 ? c.summary.slice(0, 90) + "..." : c.summary) : "—"}</span>
                            </td>
                            <td>
                              {c.lead?.crmLeadId && (
                                <span style={{ cursor: "pointer" }} title="Open history"
                                  onClick={() => onOpenLead && onOpenLead({
                                    _id: c.lead.crmLeadId, SENDER_NAME: c.lead.name, SENDER_COMPANY: c.lead.company,
                                    SENDER_MOBILE: c.lead.phone, SOURCE: c.lead.source,
                                  })}>
                                  <i className="fa-solid fa-eye text-primary"></i>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAgentDashboardPopUp;
