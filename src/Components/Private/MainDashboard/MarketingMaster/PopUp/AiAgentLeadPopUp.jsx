// AI CALLING – NEW: per-lead popup — "Call with Tripti" + full AI call history
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  getAiLeadHistory, callLeadWithAi, formatIST, callBadge, ACTIVE_STATUSES,
} from "../../../../../hooks/aiCalling/aiAgentApi";

const prettyKey = (k) => String(k).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Turns Bolna's captured data into simple "label: value" rows
const capturedRows = (extracted) => {
  const rows = [];
  const walk = (obj) => {
    if (!obj || typeof obj !== "object") return;
    Object.entries(obj).forEach(([k, v]) => {
      if (v && typeof v === "object" && ("subjective" in v || "value" in v || "objective" in v)) {
        const val = [v.value, v.objective, v.subjective].find((x) => x !== undefined && x !== null && String(x).trim() !== "");
        if (val !== undefined && !/call summary/i.test(k)) rows.push([prettyKey(k), String(val)]);
      } else if (v && typeof v === "object") {
        walk(v);
      } else if (v !== undefined && v !== null && String(v).trim() !== "" && !/summary/i.test(k)) {
        rows.push([prettyKey(k), String(v)]);
      }
    });
  };
  walk(extracted);
  return rows.filter(([, v]) => !/^(none|null|n\/a|not mentioned|unknown)$/i.test(v.trim()));
};

const AiAgentLeadPopUp = ({ lead, onClose, onCalled }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [openTranscript, setOpenTranscript] = useState({});

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const res = await getAiLeadHistory(lead._id);
    if (res?.success) setData(res);
    else if (!quiet) toast.error(res?.error || "Could not load AI call history");
    setLoading(false);
  }, [lead._id]);

  useEffect(() => { load(); }, [load]);

  // While a call is going on, refresh every 10 seconds
  const hasActive = (data?.calls || []).some(
    (c) => ACTIVE_STATUSES.includes(c.status) && !String(c.providerCallId || "").startsWith("dryrun-")
  );
  useEffect(() => {
    if (!hasActive) return undefined;
    const t = setInterval(() => load(true), 10000);
    return () => clearInterval(t);
  }, [hasActive, load]);

  const handleCall = async () => {
    let ignoreHours = false;
    if (data && !data.withinHours) {
      // eslint-disable-next-line no-alert
      ignoreHours = window.confirm(
        "Outside calling hours (10 AM – 7 PM, Mon–Sat).\n\nCall anyway? Only do this for your own TEST numbers."
      );
      if (!ignoreHours) return;
    }
    setCalling(true);
    const t = toast.loading("Starting Arohi...");
    const res = await callLeadWithAi(lead._id, ignoreHours);
    toast.dismiss(t);
    setCalling(false);
    if (res?.success) {
      toast.success(res.message || "Arohi is calling the customer");
      load(true);
      onCalled && onCalled();
    } else {
      toast.error(res?.error || "Could not start the call");
    }
  };

  const elig = data?.eligibility;
  const aiLead = data?.aiLead;
  const calls = data?.calls || [];

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl modal-dialog-centered" style={{ width: "950px", maxWidth: "95%" }}>
        <div className="modal-content" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
          <div className="modal-header">
            <h5 className="modal-title fw-bold">
              <i className="fa-solid fa-robot me-2 text-primary"></i>
              AI Agent (Arohi) — {lead?.SENDER_NAME || lead?.SENDER_COMPANY || "Lead"}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body" style={{ overflowY: "auto" }}>
            {/* Lead summary */}
            <div className="row g-2 mb-3">
              <div className="col-12 col-md-8">
                <div className="p-3 border rounded h-100" style={{ background: "#f8f9fa" }}>
                  <div className="d-flex flex-wrap gap-3" style={{ fontSize: "0.88rem" }}>
                    <span><strong>Company:</strong> {lead?.SENDER_COMPANY || "—"}</span>
                    <span><strong>Mobile:</strong> {lead?.SENDER_MOBILE || "—"}</span>
                    <span><strong>Product:</strong> {lead?.QUERY_PRODUCT_NAME || "—"}</span>
                    <span><strong>City:</strong> {lead?.SENDER_CITY || "—"}</span>
                    <span><strong>Source:</strong> <span className="badge bg-secondary">{lead?.SOURCE}</span></span>
                  </div>
                  {aiLead && (
                    <div className="mt-2" style={{ fontSize: "0.85rem" }}>
                      <strong>AI stage:</strong> <span className="badge bg-info text-dark">{aiLead.stage}</span>
                      <span className="ms-3"><strong>Forward / assigned to:</strong> {aiLead.assignedTo?.name || "—"}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="p-3 border rounded h-100 d-flex flex-column justify-content-center">
                  {loading && !data ? (
                    <span className="text-muted">Loading...</span>
                  ) : elig?.ok ? (
                    <>
                      <button type="button" className="btn btn-primary w-100" disabled={calling || hasActive} onClick={handleCall}>
                        <i className="fa-solid fa-phone-volume me-2"></i>
                        {hasActive ? "Call in progress..." : calling ? "Starting..." : "Call with Arohi"}
                      </button>
                      <small className="text-muted mt-2 d-block">
                        {data?.dryRun ? "⚠️ Test mode (DRY_RUN) — no real phone call" : data?.withinHours ? "Calling hours: open" : "Outside calling hours"}
                      </small>
                    </>
                  ) : (
                    <div className="alert alert-warning mb-0 py-2" style={{ fontSize: "0.82rem" }}>
                      <i className="fa-solid fa-lock me-1"></i>
                      {elig?.reason || "AI calling not available for this lead"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Site visits & follow-ups */}
            {(data?.appointments?.length > 0 || data?.followUps?.length > 0) && (
              <div className="row g-2 mb-3">
                {data.appointments.map((a) => (
                  <div className="col-12 col-md-6" key={a._id}>
                    <div className="p-2 border rounded" style={{ background: "#e8f5e9", fontSize: "0.85rem" }}>
                      <i className="fa-solid fa-location-dot text-success me-1"></i>
                      <strong>Site visit:</strong> {a.scheduledFor || "time to confirm"}
                      {a.address && <div><strong>Address:</strong> {a.address}</div>}
                      <div className="text-muted">Assigned to {a.assignedTo?.name || "—"} · {a.status}</div>
                    </div>
                  </div>
                ))}
                {data.followUps.map((f) => (
                  <div className="col-12 col-md-6" key={f._id}>
                    <div className="p-2 border rounded" style={{ background: "#fff8e1", fontSize: "0.85rem" }}>
                      <i className="fa-solid fa-clock-rotate-left text-warning me-1"></i>
                      <strong>Follow-up ({f.kind}):</strong> {f.dueAt || "—"} {f.done && <span className="badge bg-success ms-1">Done</span>}
                      {f.notes && <div>{f.notes}</div>}
                      <div className="text-muted">Assigned to {f.assignedTo?.name || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Call history */}
            <h6 className="fw-bold text-primary">
              <i className="fa-solid fa-clock-rotate-left me-2"></i>AI Call History ({calls.length})
              <button type="button" className="btn btn-sm btn-light border ms-2" onClick={() => load()}>
                <i className="fa-solid fa-rotate"></i>
              </button>
            </h6>

            {calls.length === 0 ? (
              <div className="alert alert-secondary">No AI calls yet for this customer.</div>
            ) : (
              calls.map((c) => {
                const b = callBadge(c);
                const rows = capturedRows(c.extracted);
                return (
                  <div key={c._id} className="border rounded p-3 mb-2">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div style={{ fontSize: "0.88rem" }}>
                        <span className={`badge ${b.cls} me-2`}>{b.text}</span>
                        <i className={`fa-solid ${c.direction === "inbound" ? "fa-arrow-down text-success" : "fa-arrow-up text-primary"} me-1`}></i>
                        {c.direction === "inbound" ? "Customer called" : "Arohi called"} · {formatIST(c.createdAt)}
                        {c.durationSec > 0 && <span className="text-muted"> · {Math.floor(c.durationSec / 60)}m {c.durationSec % 60}s</span>}
                      </div>
                      {c.recordingUrl && (
                        <audio controls preload="none" src={c.recordingUrl} style={{ height: 32, maxWidth: 300 }} />
                      )}
                    </div>

                    {c.summary && (
                      <div className="mt-2 p-2 rounded" style={{ background: "#f1f5ff", fontSize: "0.87rem" }}>
                        <strong>Summary:</strong> {c.summary}
                      </div>
                    )}

                    {rows.length > 0 && (
                      <table className="table table-sm table-bordered mt-2 mb-0" style={{ fontSize: "0.82rem" }}>
                        <tbody>
                          {rows.map(([k, v]) => (
                            <tr key={k}><th style={{ width: "35%" }}>{k}</th><td>{v}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {c.transcript && (
                      <div className="mt-2">
                        <button type="button" className="btn btn-sm btn-link p-0"
                          onClick={() => setOpenTranscript((p) => ({ ...p, [c._id]: !p[c._id] }))}>
                          {openTranscript[c._id] ? "Hide transcript" : "Show transcript"}
                        </button>
                        {openTranscript[c._id] && (
                          <pre className="p-2 border rounded mt-1 mb-0"
                            style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem", maxHeight: 260, overflowY: "auto", background: "#fafafa" }}>
                            {c.transcript}
                          </pre>
                        )}
                      </div>
                    )}
                    {c.endedReason && !c.summary && <small className="text-muted d-block mt-1">Reason: {c.endedReason}</small>}
                  </div>
                );
              })
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

export default AiAgentLeadPopUp;
