// ENTERO SYSTEMS — conversation view for one customer (replies + tapped answers).
// Uses the Entero API only, so DAccess replies never show here.
import { useEffect, useState } from "react";
import { getCampaignReplies, getCampaignSessions } from "../../../../../hooks/useEnteroCampaign";

const ViewEnteroCampaignRepliesPopUp = ({ customer, onClose }) => {
  const [replies, setReplies] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [r, s] = await Promise.all([
        getCampaignReplies(customer._id),
        getCampaignSessions(customer._id),
      ]);
      if (r?.success) setReplies(r.replies || []);
      if (s?.success) setSessions(s.sessions || []);
      setLoading(false);
    };
    if (customer?._id) load();
  }, [customer]);

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              <i className="fa-brands fa-whatsapp me-2" style={{ color: "#25D366" }}></i>
              {customer?.custName || "Customer"} <small className="text-muted ms-2">{customer?.phoneNumber1}</small>
            </h5>
            <button onClick={onClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body">
            {loading && <div className="text-center text-muted py-4">Loading...</div>}

            {!loading && sessions.some((s) => s.answers?.length > 0) && (
              <div className="mb-4">
                <h6 className="fw-bold" style={{ color: "#1e40af" }}>
                  <i className="fa-solid fa-list-check me-2"></i>Questionnaire Answers
                </h6>
                {sessions.filter((s) => s.answers?.length > 0).map((s) => (
                  <div key={s._id} className="border rounded p-2 mb-2" style={{ background: "#eff6ff" }}>
                    <div className="d-flex justify-content-between mb-1">
                      <strong>{s.template?.title || "Template"}</strong>
                      <span className={`badge bg-${s.status === "COMPLETED" ? "success" : "warning"}`}>{s.status}</span>
                    </div>
                    {s.answers.map((a, i) => (
                      <div key={i} style={{ fontSize: "13px" }}>
                        <span className="text-muted">{a.questionText}</span> → <strong>{a.answerTitle}</strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!loading && (
              <>
                <h6 className="fw-bold"><i className="fa-regular fa-comments me-2"></i>Messages</h6>
                {replies.length === 0 && <div className="text-muted text-center py-3">No messages yet.</div>}
                {replies.map((r) => (
                  <div key={r._id} className="p-2 mb-2 rounded" style={{ background: r.isButtonClick ? "#eff6ff" : "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div className="d-flex justify-content-between">
                      <span>
                        {r.message}
                        {r.isButtonClick && <span className="badge bg-primary ms-2" style={{ fontSize: "10px" }}>Tapped</span>}
                      </span>
                      <small className="text-muted ms-2 flex-shrink-0">{new Date(r.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewEnteroCampaignRepliesPopUp;