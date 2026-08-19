import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddEditCampaignTemplatePopUp from "./PopUp/AddEditCampaignTemplatePopUp";
import SendCampaignPopUp from "./PopUp/SendCampaignPopUp";
import {
  getCampaignTemplates,
  deleteCampaignTemplate,
  submitCampaignTemplate,
  syncCampaignTemplateStatus,
  getCampaignLogs,
  getCampaignReplies,
} from "../../../../hooks/useCampaign";
import { UserContext } from "../../../../context/UserContext";
import toast from "react-hot-toast";

const statusBadge = (status) => {
  const map = {
    DRAFT:    { color: "secondary", label: "Draft" },
    PENDING:  { color: "warning", label: "Pending Review" },
    APPROVED: { color: "success", label: "Approved" },
    REJECTED: { color: "danger", label: "Rejected" },
  };
  const s = map[status] || map.DRAFT;
  return <span className={`badge bg-${s.color}`}>{s.label}</span>;
};

export const CampaignMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => { setIsOpen(!isopen); };

  const { user } = useContext(UserContext);

  const [tab, setTab] = useState("templates"); // 'templates' | 'history' | 'replies'
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [replies, setReplies] = useState([]);
  const [repliesPage, setRepliesPage] = useState(1);
  const REPLIES_PER_PAGE = 10;
  const [loading, setLoading] = useState(true);

  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showSendPopup, setShowSendPopup] = useState(false);

  const [deletePopUpShow, setDeletePopUpShow] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const canCreate = user?.user === "company" || user?.permissions?.includes("createCampaign");
  const canUpdate = user?.user === "company" || user?.permissions?.includes("updateCampaign");
  const canDelete = user?.user === "company" || user?.permissions?.includes("deleteCampaign");
  const canSend   = user?.user === "company" || user?.permissions?.includes("sendCampaign");
  const canView   = user?.user === "company" || user?.permissions?.includes("viewCampaign");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [tplData, logData, replyData] = await Promise.all([getCampaignTemplates(), getCampaignLogs(), getCampaignReplies()]);
      if (tplData?.success) setTemplates(tplData.templates || []);
      if (logData?.success) setLogs(logData.logs || []);
      if (replyData?.success) setReplies(replyData.replies || []);
      setLoading(false);
    };
    fetchData();
  }, [refetchTrigger]);

  const handleAdd = () => { setEditingTemplate(null); setShowAddEdit(true); };
  const handleEdit = (tpl) => { setEditingTemplate(tpl); setShowAddEdit(true); };
  const handleCloseAddEdit = () => { setShowAddEdit(false); setEditingTemplate(null); };
  const handleSaved = () => { setShowAddEdit(false); setEditingTemplate(null); setRefetchTrigger((n) => n + 1); };

  const handleDeleteClick = (id) => { setSelectedId(id); setDeletePopUpShow(true); };
  const handleDeleteConfirm = async () => {
    const data = await deleteCampaignTemplate(selectedId);
    if (data?.success) toast.success(data.message); else toast.error(data?.error || "Failed to delete");
    setDeletePopUpShow(false);
    setRefetchTrigger((n) => n + 1);
  };

  const handleSync = async (id) => {
    const data = await syncCampaignTemplateStatus(id);
    if (data?.success) {
      toast.success(`Status: ${data.template.status}`);
      setRefetchTrigger((n) => n + 1);
    }
  };

  const handleSubmit = async (id) => {
    toast.loading("Submitting to Meta for review...");
    const data = await submitCampaignTemplate(id);
    toast.dismiss();
    if (data?.success) {
      toast.success(data.message);
      setRefetchTrigger((n) => n + 1);
    } else {
      toast.error(data?.error || "Failed to submit to Meta");
    }
  };

  const handleSendClose = () => setShowSendPopup(false);
  const handleSent = () => setRefetchTrigger((n) => n + 1);

  if (!canView) {
    return (
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card mt-5">
              <div className="card-body text-center">
                <h4 className="card-title">Access Denied</h4>
                <p className="card-text">You don't have permission to access WhatsApp Campaigns.</p>
                <p className="card-text">Please contact your administrator if you believe this is an error.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className="overlay"><span className="loader"></span></div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="CampaignMasterGrid" />
            <div
              className="main-panel"
              style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* ── Top bar ── */}
                <div className="row px-2 py-1 align-items-center">
                  <div className="col-12 col-lg-6">
                    <h5 className="text-white py-2 mb-0">
                      <i className="fa-brands fa-whatsapp me-2" style={{ color: "#25D366" }}></i>
                      WhatsApp Campaigns
                    </h5>
                  </div>
                  <div className="col-12 col-lg-6 text-end">
                    <div className="btn-group me-2" role="group">
                      <button
                        type="button"
                        className={`btn btn-sm ${tab === "templates" ? "btn-primary" : "btn-outline-light"}`}
                        onClick={() => setTab("templates")}
                      >
                        Templates
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${tab === "history" ? "btn-primary" : "btn-outline-light"}`}
                        onClick={() => setTab("history")}
                      >
                        History
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${tab === "replies" ? "btn-primary" : "btn-outline-light"}`}
                        onClick={() => setTab("replies")}
                      >
                        Replies {replies.length > 0 && <span className="badge bg-danger ms-1">{replies.length}</span>}
                      </button>
                    </div>
                    {canSend && (
                      <button onClick={() => setShowSendPopup(true)} type="button" className="btn btn-sm btn-success me-1">
                        <i className="fa-brands fa-whatsapp me-1"></i> Send Campaign
                      </button>
                    )}
                    {canCreate && (
                      <button onClick={handleAdd} type="button" className="btn btn-sm btn-dark">
                        <i className="fa-solid fa-plus"></i> Add Template
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Templates tab ── */}
                {tab === "templates" && (
                  <div className="row bg-white p-2 m-1 border rounded">
                    <div className="col-12 py-2">
                      <div className="table-responsive">
                        <table className="table table-striped table-class" id="table-id">
                          <thead>
                            <tr className="th_border">
                              <th className="text-center align-middle">Sr. No</th>
                              <th className="align_left_td td_width align-middle">Product</th>
                              <th className="text-center align-middle">Meta Template Name</th>
                              <th className="text-center align-middle">Category</th>
                              <th className="text-center align-middle">Status</th>
                              <th className="text-center align-middle">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {templates.length > 0 ? (
                              templates.map((tpl, index) => (
                                <tr className="border my-4" key={tpl._id}>
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>{index + 1}</td>
                                  <td className="align_left_td td_width" style={{ verticalAlign: "middle" }}>{tpl.title}</td>
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}><code>{tpl.metaTemplateName}</code></td>
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>{tpl.category}</td>
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                                    {statusBadge(tpl.status)}
                                    {tpl.status === "REJECTED" && tpl.rejectionReason && (
                                      <div className="text-danger" style={{ fontSize: "11px" }}>{tpl.rejectionReason}</div>
                                    )}
                                  </td>
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                                    {canUpdate && (
                                      <span onClick={() => handleEdit(tpl)} className="update me-2" style={{ cursor: "pointer" }}>
                                        <i className="fa-solid fa-pen text-success"></i>
                                      </span>
                                    )}
                                    {tpl.status === "DRAFT" && canCreate && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-success me-2 py-0 px-2"
                                        onClick={() => handleSubmit(tpl._id)}
                                        title="Submit to Meta for review"
                                      >
                                        <i className="fa-solid fa-paper-plane me-1"></i>Submit
                                      </button>
                                    )}
                                    {(tpl.status === "PENDING" || tpl.status === "APPROVED") && (
                                      <span onClick={() => handleSync(tpl._id)} className="me-2" style={{ cursor: "pointer" }} title="Refresh status from Meta">
                                        <i className="fa-solid fa-rotate text-primary"></i>
                                      </span>
                                    )}
                                    {canDelete && (
                                      <span onClick={() => handleDeleteClick(tpl._id)} className="delete" style={{ cursor: "pointer" }}>
                                        <i className="fa-solid fa-trash text-danger"></i>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr><td colSpan="6" style={{ textAlign: "center", verticalAlign: "middle" }}>No campaign templates found</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── History tab ── */}
                {tab === "history" && (
                  <div className="row bg-white p-2 m-1 border rounded">
                    <div className="col-12 py-2">
                      <div className="table-responsive">
                        <table className="table table-striped table-class" id="table-id">
                          <thead>
                            <tr className="th_border">
                              <th className="text-center align-middle">Sr. No</th>
                              <th className="align_left_td td_width align-middle">Product</th>
                              <th className="text-center align-middle">Sent</th>
                              <th className="text-center align-middle">Skipped</th>
                              <th className="text-center align-middle">Sent By</th>
                              <th className="text-center align-middle">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.length > 0 ? (
                              logs.map((log, index) => (
                                <tr className="border my-4" key={log._id}>
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>{index + 1}</td>
                                  <td className="align_left_td td_width" style={{ verticalAlign: "middle" }}>{log.templateTitle}</td>
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}><span className="badge bg-success">{log.sentCount}</span></td>
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}><span className="badge bg-danger">{log.skippedCount}</span></td>
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>{log.sentBy?.name || "—"}</td>
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>{new Date(log.createdAt).toLocaleString()}</td>
                                </tr>
                              ))
                            ) : (
                              <tr><td colSpan="6" style={{ textAlign: "center", verticalAlign: "middle" }}>No campaigns sent yet</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Replies tab — original flat list, with pagination added ── */}
                {tab === "replies" && (() => {
                  const totalPages = Math.max(1, Math.ceil(replies.length / REPLIES_PER_PAGE));
                  const pageItems = replies.slice((repliesPage - 1) * REPLIES_PER_PAGE, repliesPage * REPLIES_PER_PAGE);
                  return (
                    <div className="row bg-white p-2 m-1 border rounded">
                      <div className="col-12 py-2">
                        {replies.length === 0 && (
                          <div className="text-muted text-center py-4">No customer replies yet.</div>
                        )}
                        {pageItems.map((r) => (
                          <div key={r._id} className="border rounded p-3 mb-2" style={{ background: r.isButtonClick ? "#eff6ff" : "#f0fdf4" }}>
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="fw-bold">
                                {r.customer?.custName || "Unknown customer"}
                                <small className="text-muted ms-2">{r.customer?.phoneNumber1 || r.phone}</small>
                                {r.isButtonClick && (
                                  <span className="badge bg-primary ms-2">
                                    <i className="fa-solid fa-computer-mouse me-1"></i>Tapped a button
                                  </span>
                                )}
                              </div>
                              <small className="text-muted">{new Date(r.createdAt).toLocaleString()}</small>
                            </div>
                            <div className="mt-1" style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>{r.message}</div>
                          </div>
                        ))}

                        {replies.length > REPLIES_PER_PAGE && (
                          <div className="d-flex justify-content-between align-items-center mt-3 px-1">
                            <button
                              className="btn btn-sm btn-outline-dark"
                              disabled={repliesPage <= 1}
                              onClick={() => setRepliesPage((p) => p - 1)}
                            >
                              <i className="fa-solid fa-chevron-left me-1"></i>Prev
                            </button>
                            <small className="text-muted">
                              Page {repliesPage} of {totalPages} — {replies.length} total
                            </small>
                            <button
                              className="btn btn-sm btn-outline-dark"
                              disabled={repliesPage >= totalPages}
                              onClick={() => setRepliesPage((p) => p + 1)}
                            >
                              Next<i className="fa-solid fa-chevron-right ms-1"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Popups ── */}
      {deletePopUpShow && (
        <DeletePopUP
          message={"Are you sure! Do you want to Delete this template?"}
          cancelBtnCallBack={() => setDeletePopUpShow(false)}
          confirmBtnCallBack={handleDeleteConfirm}
          heading="Delete"
        />
      )}

      {showAddEdit && (
        <AddEditCampaignTemplatePopUp
          handleClose={handleCloseAddEdit}
          template={editingTemplate}
          onSaved={handleSaved}
        />
      )}

      {showSendPopup && (
        <SendCampaignPopUp handleClose={handleSendClose} onSent={handleSent} />
      )}
    </>
  );
};