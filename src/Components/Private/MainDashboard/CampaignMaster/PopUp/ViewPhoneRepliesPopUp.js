// ✅ NEW — chat popup for "Unknown customer" reply cards
// (numbers that are NOT linked to Customer Master). Loads every reply
// and every questionnaire answer for that phone number.
import { useState, useEffect } from "react";
import { getCampaignRepliesByPhone } from "../../../../../hooks/useCampaign";

const fmt = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "—" : x.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
};

const ViewPhoneRepliesPopUp = ({ phone, custName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replies, setReplies] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getCampaignRepliesByPhone(phone);
      if (data?.success) {
        // oldest first, like a chat
        setReplies([...(data.replies || [])].reverse());
        setSessions(data.sessions || []);
        setError("");
      } else {
        setError(data?.error || "Failed to load replies");
      }
      setLoading(false);
    })();
  }, [phone]);

  const answeredSessions = sessions.filter((s) => (s.answers || []).length > 0);

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <div>
              <h5 className="card-title fw-bold mb-0">
                <i className="fa-brands fa-whatsapp me-2" style={{ color: "#25D366" }}></i>
                {custName || "Unknown customer"}
              </h5>
              <small className="text-muted">
                <i className="fa-solid fa-phone me-1"></i>{phone}
                {!custName && <span className="badge bg-secondary ms-2" style={{ fontSize: "10px" }}>Not in Customer Master</span>}
              </small>
            </div>
            <button onClick={onClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body">
            {loading && <div className="text-center text-muted py-4">Loading replies...</div>}
            {!loading && error && <div className="alert alert-danger py-2">{error}</div>}

            {!loading && !error && (
              <>
                {/* ── Questionnaire answers (if any) ── */}
                {answeredSessions.length > 0 && (
                  <div className="mb-3">
                    <h6 className="fw-bold" style={{ color: "#1e40af" }}>
                      <i className="fa-solid fa-list-check me-2"></i>Questionnaire Answers
                    </h6>
                    {answeredSessions.map((s) => (
                      <div key={s._id} className="border rounded p-2 mb-2" style={{ background: "#eff6ff" }}>
                        <div className="d-flex justify-content-between mb-1">
                          <strong style={{ fontSize: "0.85rem" }}>{s.template?.title || "Campaign"}</strong>
                          <span className={`badge ${s.status === "COMPLETED" ? "bg-success" : "bg-warning text-dark"}`}>{s.status}</span>
                        </div>
                        {(s.answers || []).map((a, i) => (
                          <div key={i} style={{ fontSize: "0.82rem" }}>
                            <span className="text-muted">{a.questionText}:</span>{" "}
                            <strong>{a.answerTitle}</strong>
                            {a.answerDescription && <span className="text-muted"> ({a.answerDescription})</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Chat ── */}
                <h6 className="fw-bold mb-2">
                  <i className="fa-solid fa-comments me-2"></i>Messages ({replies.length})
                </h6>
                {replies.length === 0 && <div className="text-muted text-center py-3">No messages found for this number.</div>}
                <div className="rounded p-2" style={{ background: "#e5ddd5" }}>
                  {replies.map((r) => (
                    <div key={r._id} className="bg-white rounded shadow-sm p-2 mb-2" style={{ maxWidth: "85%" }}>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem" }}>{r.message || "—"}</div>
                      <div className="d-flex justify-content-between align-items-center mt-1 gap-2">
                        {r.isButtonClick ? (
                          <span className="badge bg-primary" style={{ fontSize: "9px" }}>
                            <i className="fa-solid fa-computer-mouse me-1"></i>Tapped
                          </span>
                        ) : <span />}
                        <small className="text-muted" style={{ fontSize: "10px" }}>{fmt(r.createdAt)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="pt-2">
            <button type="button" onClick={onClose} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPhoneRepliesPopUp;