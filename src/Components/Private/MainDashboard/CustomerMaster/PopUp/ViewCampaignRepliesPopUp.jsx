import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getCampaignReplies, getCampaignSessions } from "../../../../../hooks/useCampaign";

// Usage: <ViewCampaignRepliesPopUp customer={customer} onClose={...} />
// Shows two things for this customer:
//   1. Structured answers — the actual tap-through questionnaire results
//      (Question -> tapped option), from CampaignSession.
//   2. Raw replies — every inbound message/tap logged, newest first.
const ViewCampaignRepliesPopUp = ({ customer, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [sessionData, replyData] = await Promise.all([
        getCampaignSessions(customer._id),
        getCampaignReplies(customer._id),
      ]);
      if (sessionData?.success) setSessions(sessionData.sessions || []);
      if (replyData?.success) setReplies(replyData.replies || []);
      if (!sessionData?.success && !replyData?.success) toast.error("Failed to load WhatsApp activity");
      setLoading(false);
    };
    fetchAll();
  }, [customer._id]);

  const statusBadge = (status) => {
    if (status === "COMPLETED") return <span className="badge bg-success">Completed</span>;
    if (status === "IN_PROGRESS") return <span className="badge bg-warning text-dark">In Progress</span>;
    return <span className="badge bg-secondary">Waiting for reply</span>;
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              <i className="fa-brands fa-whatsapp me-2" style={{ color: "#25D366" }}></i>
              WhatsApp Activity — {customer.custName}
            </h5>
            <button onClick={onClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body">
            <div className="mb-3 p-2 rounded" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <small className="text-muted">
                <i className="fa-solid fa-phone me-1"></i>
                {customer.phoneNumber1 || "No phone number on file"}
              </small>
            </div>

            {loading && <div className="text-center text-muted py-4">Loading...</div>}

            {!loading && sessions.length > 0 && (
              <div className="mb-4">
                <h6 className="fw-bold mb-2">
                  <i className="fa-solid fa-list-check me-2"></i>Questionnaire Answers
                </h6>
                {sessions.map((s) => (
                  <div key={s._id} className="border rounded p-3 mb-2" style={{ background: "#eff6ff" }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>{s.template?.title || "Unknown product"}</strong>
                      {statusBadge(s.status)}
                    </div>
                    {s.answers.length === 0 && (
                      <small className="text-muted">No questions answered yet.</small>
                    )}
                    {s.answers.map((a, i) => (
                      <div key={i} className="mb-2 ps-2" style={{ borderLeft: "3px solid #93c5fd" }}>
                        <div className="text-muted small">{a.questionText}</div>
                        <div className="fw-semibold">
                          <i className="fa-solid fa-check text-success me-1"></i>
                          {a.answerTitle}
                        </div>
                        {a.answerDescription && <div className="small text-muted">{a.answerDescription}</div>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <h6 className="fw-bold mb-2">
              <i className="fa-solid fa-message me-2"></i>All Messages
            </h6>

            {!loading && replies.length === 0 && (
              <div className="text-center text-muted py-4 border rounded">
                No messages yet. This customer hasn't responded to any campaign on WhatsApp.
              </div>
            )}

            {!loading && replies.map((r) => (
              <div key={r._id} className="border rounded p-3 mb-2" style={{ background: r.isButtonClick ? "#eff6ff" : "#f0fdf4" }}>
                {r.isButtonClick && (
                  <span className="badge bg-primary mb-2">
                    <i className="fa-solid fa-computer-mouse me-1"></i>Tapped
                  </span>
                )}
                <div style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>{r.message}</div>
                <small className="text-muted d-block mt-2">
                  <i className="fa-regular fa-clock me-1"></i>
                  {new Date(r.createdAt).toLocaleString()}
                </small>
              </div>
            ))}
          </div>

          <div className="modal-footer border-0 justify-content-start">
            <button type="button" onClick={onClose} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewCampaignRepliesPopUp;