// INVITATION CAMPAIGN — main window opened from the WhatsApp Campaigns page.
// Tabs: Invitations (create / submit / edit) · History · Responses (who tapped what)
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import AddEditInvitationPopUp from "./AddEditInvitationPopUp";
import SendInvitationPopUp from "./SendInvitationPopUp";
import {
  getInvitationTemplates,
  deleteInvitationTemplate,
  submitInvitationTemplate,
  syncInvitationTemplateStatus,
  getInvitationLogs,
  getInvitationResponses,
} from "../../../../../hooks/useInvitationCampaign";

const statusBadge = (status) => {
  const map = {
    DRAFT: { color: "secondary", label: "Draft" },
    PENDING: { color: "warning", label: "Pending Review" },
    APPROVED: { color: "success", label: "Approved" },
    REJECTED: { color: "danger", label: "Rejected" },
  };
  const s = map[status] || map.DRAFT;
  return <span className={`badge bg-${s.color}`}>{s.label}</span>;
};

const InvitationCampaignPopUp = ({ handleClose, canCreate, canUpdate, canDelete, canSend }) => {
  const [tab, setTab] = useState("invitations");
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [responses, setResponses] = useState([]);
  const [responseFilter, setResponseFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showSend, setShowSend] = useState(false);
  const [sendPreselect, setSendPreselect] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [t, l] = await Promise.all([getInvitationTemplates(), getInvitationLogs()]);
      if (t?.success) setTemplates(t.templates || []);
      if (l?.success) setLogs(l.logs || []);
      setLoading(false);
    })();
  }, [refresh]);

  useEffect(() => {
    if (tab !== "responses") return;
    (async () => {
      const r = await getInvitationResponses(responseFilter);
      if (r?.success) setResponses(r.responses || []);
    })();
  }, [tab, responseFilter, refresh]);

  const reload = () => setRefresh((n) => n + 1);

  const handleSubmit = async (id) => {
    toast.loading("Submitting to Meta...");
    const d = await submitInvitationTemplate(id);
    toast.dismiss();
    d?.success ? toast.success(d.message) : toast.error(d?.error || "Failed to submit");
    reload();
  };

  const handleSync = async (id) => {
    const d = await syncInvitationTemplateStatus(id);
    d?.success ? toast.success(`Status: ${d.template.status}`) : toast.error(d?.error || "Failed to refresh");
    reload();
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete invitation "${t.title}"?`)) return;
    const d = await deleteInvitationTemplate(t._id);
    d?.success ? toast.success(d.message) : toast.error(d?.error || "Failed to delete");
    reload();
  };

  // per-button tap counts for the Responses tab
  const summary = responses.reduce((acc, r) => {
    acc[r.buttonText] = (acc[r.buttonText] || 0) + 1;
    return acc;
  }, {});

  const th = { verticalAlign: "middle", textAlign: "center" };

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content p-3">
            <div className="modal-header pt-0 flex-wrap gap-2">
              <h5 className="card-title fw-bold mb-0">
                <i className="fa-solid fa-envelope-open-text me-2" style={{ color: "#25D366" }}></i>Invitation Campaigns
              </h5>
              <div className="d-flex gap-2 ms-auto align-items-center">
                {canSend && (
                  <button type="button" className="btn btn-sm btn-success" onClick={() => { setSendPreselect(""); setShowSend(true); }}>
                    <i className="fa-solid fa-paper-plane me-1"></i>Send Invitation
                  </button>
                )}
                {canCreate && (
                  <button type="button" className="btn btn-sm btn-dark" onClick={() => { setEditing(null); setShowAddEdit(true); }}>
                    <i className="fa-solid fa-plus me-1"></i>New Invitation
                  </button>
                )}
                <button onClick={handleClose} type="button" className="close px-3">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            </div>

            <div className="modal-body">
              <div className="btn-group mb-3" role="group">
                {["invitations", "history", "responses"].map((k) => (
                  <button key={k} type="button" className={`btn btn-sm ${tab === k ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setTab(k)}>
                    {k === "invitations" ? "Invitations" : k === "history" ? "History" : "Responses"}
                  </button>
                ))}
              </div>

              {loading && <div className="text-center text-muted py-4">Loading...</div>}

              {/* ── Invitations ── */}
              {!loading && tab === "invitations" && (
                <div className="table-responsive">
                  <table className="table table-striped table-class">
                    <thead>
                      <tr className="th_border">
                        <th style={th}>Sr. No</th>
                        <th className="align-middle">Invitation</th>
                        <th style={th}>Buttons</th>
                        <th style={th}>Status</th>
                        <th style={th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.length === 0 && (
                        <tr><td colSpan="5" className="text-center text-muted">No invitations yet — click “New Invitation”.</td></tr>
                      )}
                      {templates.map((t, i) => (
                        <tr key={t._id}>
                          <td style={th}>{i + 1}</td>
                          <td className="align-middle">
                            <div className="fw-semibold">{t.title}</div>
                            {t.heading && <small className="text-muted">{t.heading}</small>}
                          </td>
                          <td style={th}>
                            {(t.buttons || []).map((b) => <span key={b.text} className="badge bg-light text-dark border me-1">{b.text}</span>)}
                          </td>
                          <td style={th}>
                            {statusBadge(t.status)}
                            {t.status === "REJECTED" && t.rejectionReason && <div className="text-danger" style={{ fontSize: 11 }}>{t.rejectionReason}</div>}
                          </td>
                          <td style={th}>
                            {canUpdate && (
                              <span onClick={() => { setEditing(t); setShowAddEdit(true); }} className="me-2" style={{ cursor: "pointer" }} title="Edit">
                                <i className="fa-solid fa-pen text-success"></i>
                              </span>
                            )}
                            {(t.status === "DRAFT" || t.status === "REJECTED") && canCreate && (
                              <button type="button" className="btn btn-sm btn-outline-success me-2 py-0 px-2" onClick={() => handleSubmit(t._id)}>
                                <i className="fa-solid fa-paper-plane me-1"></i>Submit
                              </button>
                            )}
                            {(t.status === "PENDING" || t.status === "APPROVED") && (
                              <span onClick={() => handleSync(t._id)} className="me-2" style={{ cursor: "pointer" }} title="Refresh status from Meta">
                                <i className="fa-solid fa-rotate text-primary"></i>
                              </span>
                            )}
                            {t.status === "APPROVED" && canSend && (
                              <button type="button" className="btn btn-sm btn-success me-2 py-0 px-2" onClick={() => { setSendPreselect(t._id); setShowSend(true); }}>
                                Send
                              </button>
                            )}
                            {canDelete && (
                              <span onClick={() => handleDelete(t)} style={{ cursor: "pointer" }} title="Delete">
                                <i className="fa-solid fa-trash text-danger"></i>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── History ── */}
              {!loading && tab === "history" && (
                <div className="table-responsive">
                  <table className="table table-striped table-class">
                    <thead>
                      <tr className="th_border">
                        <th style={th}>Sr. No</th>
                        <th className="align-middle">Invitation</th>
                        <th style={th}>Sent</th>
                        <th style={th}>Skipped</th>
                        <th style={th}>Sent By</th>
                        <th style={th}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 && <tr><td colSpan="6" className="text-center text-muted">No invitations sent yet.</td></tr>}
                      {logs.map((l, i) => (
                        <tr key={l._id}>
                          <td style={th}>{i + 1}</td>
                          <td className="align-middle">{l.templateTitle}</td>
                          <td style={th}><span className="badge bg-success">{l.sentCount}</span></td>
                          <td style={th}><span className="badge bg-danger">{l.skippedCount}</span></td>
                          <td style={th}>{l.sentBy?.name || "—"}</td>
                          <td style={th}>{new Date(l.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Responses ── */}
              {!loading && tab === "responses" && (
                <>
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                    <select className="form-select form-select-sm" style={{ maxWidth: 320 }} value={responseFilter} onChange={(e) => setResponseFilter(e.target.value)}>
                      <option value="">All invitations</option>
                      {templates.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
                    </select>
                    {Object.entries(summary).map(([label, n]) => (
                      <span key={label} className="badge bg-primary" style={{ fontSize: 12 }}>{label}: {n}</span>
                    ))}
                  </div>
                  <div className="table-responsive">
                    <table className="table table-striped table-class">
                      <thead>
                        <tr className="th_border">
                          <th style={th}>Sr. No</th>
                          <th className="align-middle">Name</th>
                          <th style={th}>Phone</th>
                          <th style={th}>Invitation</th>
                          <th style={th}>Tapped</th>
                          <th style={th}>Reply</th>
                          <th style={th}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responses.length === 0 && <tr><td colSpan="7" className="text-center text-muted">No button taps yet.</td></tr>}
                        {responses.map((r, i) => (
                          <tr key={r._id}>
                            <td style={th}>{i + 1}</td>
                            <td className="align-middle">{r.name || "—"}</td>
                            <td style={th}>{r.phone}</td>
                            <td style={th}>{r.template?.title || "—"}</td>
                            <td style={th}><span className="badge bg-primary">{r.buttonText}</span></td>
                            <td style={th}>
                              {r.replySent
                                ? <span className="badge bg-success">Sent</span>
                                : <span className="badge bg-danger" title={r.replyError}>Failed</span>}
                            </td>
                            <td style={th}>{new Date(r.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddEdit && (
        <AddEditInvitationPopUp
          template={editing}
          handleClose={() => { setShowAddEdit(false); setEditing(null); }}
          onSaved={() => { setShowAddEdit(false); setEditing(null); reload(); }}
        />
      )}

      {showSend && (
        <SendInvitationPopUp
          preselectId={sendPreselect}
          handleClose={() => setShowSend(false)}
          onSent={reload}
        />
      )}
    </>
  );
};

export default InvitationCampaignPopUp;