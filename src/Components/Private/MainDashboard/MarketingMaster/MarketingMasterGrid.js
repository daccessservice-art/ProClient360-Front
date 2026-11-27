import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast'
import axios from 'axios';

import MarketingDashboardCards from './MarketingDashboardCards';
import { UserContext } from "../../../../context/UserContext";

import ViewSalesLeadPopUp from "../../CommonPopUp/ViewSalesLeadPopUp";
import useLeads from "../../../../hooks/leads/useLeads";
import AssignMarketingLeadPopUp from "./PopUp/AssignLeadPopUp";
import useAssignLead from "../../../../hooks/leads/useAssignLead";
import { formatDateTimeForDisplay } from "../../../../utils/formatDate";
import AddLeadMaster from "../SalesMaster/PopUp/AddLeadMaster";
import useCreateLead from "../../../../hooks/leads/useCreateLead";
import useDeleteLead from "../../../../hooks/leads/useDeleteLead";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
// ✅ NEW — Landing pages (DAccess / CafeLive / WorkBridge)
import { getLandingLeadStats } from "../../../../hooks/leads/useLandingPageLeads";
// AI CALLING – NEW — Tripti (AI calling agent)
import AiAgentLeadPopUp from "./PopUp/AiAgentLeadPopUp";
import AiAgentDashboardPopUp from "./PopUp/AiAgentDashboardPopUp";
import { getAiConfig, getAiStatus, callBadge } from "../../../../hooks/aiCalling/aiAgentApi";

// ── TIME FIX: accepts full lead object, picks QUERY_TIME → createdAt ──
// Both are stored as UTC in MongoDB.
// toLocaleString with timeZone:"Asia/Kolkata" always converts correctly to IST.
const formatLeadTime = (lead) => {
  const rawDate = lead?.QUERY_TIME || lead?.createdAt;
  if (!rawDate) return "—";
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return "—";
  const datePart = d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata",
  });
  return `${datePart} ${timePart}`;
};

// ✅ NEW — Created By display
const getCreatedBy = (lead) => {
  if (lead?.createdByName) return lead.createdByName;
  if (lead?.SOURCE === 'IndiaMart' || lead?.SOURCE === 'TradeIndia') return `${lead.SOURCE} (Auto)`;
  if (lead?.isCampaignLead) return 'WhatsApp Campaign';
  return '—';
};

export const MarketingMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [addpop, setIsAddModalVisible] = useState(false);
  const [UpdatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [detailsServicePopUp, setDetailsServicePopUp] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [deletePopUpShow, setDeletePopUpShow] = useState(false);
  const [processingStaleLeads, setProcessingStaleLeads] = useState(false);
  // ✅ NEW — Landing page leads count
  const [landingStats, setLandingStats] = useState({ total: 0, newCount: 0 });
  // AI CALLING – NEW
  const [aiConfig, setAiConfig] = useState(null);
  const [aiStatus, setAiStatus] = useState({});
  const [aiLead, setAiLead] = useState(null);
  const [aiDashboardOpen, setAiDashboardOpen] = useState(false);

  const { user } = useContext(UserContext);
  const [filters, setFilters] = useState({ date: null, source: null });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalServices: 0,
    limit: 20,
    hasNextPage: true,
    hasPrevPage: false,
  });
  const itemsPerPage = 20;

  const { data, loading, error, refetch } = useLeads(pagination.currentPage, itemsPerPage, filters);
  const { assignLead } = useAssignLead();
  const { createLead } = useCreateLead();
  const { deleteLead } = useDeleteLead();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5443';

  const handleProcessStaleLeads = async () => {
    if (!user?.permissions?.includes('admin')) {
      toast.error('You do not have permission to perform this action.');
      return;
    }
    setProcessingStaleLeads(true);
    try {
      const response = await axios.post(`${API_URL}/api/leads/process-stale-leads`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.data && response.data.success) {
        toast.success(response.data.message);
        refetch();
      } else {
        toast.error(response.data.error || 'Failed to process stale leads');
      }
    } catch (error) {
      console.error('Error processing stale leads:', error);
      toast.error('Failed to process stale leads');
    } finally {
      setProcessingStaleLeads(false);
    }
  };

  useEffect(() => {
    if (data) {
      setPagination(prev => ({ ...prev, ...data.pagination }));
    }
    if (error) {
      toast.error(error.message || "An error occurred");
    }
  }, [data, error]);

  // ✅ NEW — Landing page leads count for card (refreshes whenever leads reload)
  useEffect(() => {
    getLandingLeadStats().then((r) => {
      if (r?.success) setLandingStats({ total: r.total || 0, newCount: r.newCount || 0 });
    });
  }, [data]);

  // AI CALLING – NEW — load Tripti settings once
  useEffect(() => {
    getAiConfig().then((r) => { if (r?.success) setAiConfig(r); });
  }, []);

  // AI CALLING – NEW — AI call badges for the leads on this page
  const loadAiStatus = () => {
    const ids = (data?.leads || []).map((l) => l._id);
    if (!aiConfig?.enabled || !ids.length) return;
    getAiStatus(ids).then((r) => { if (r?.success) setAiStatus(r.status || {}); });
  };
  useEffect(() => { loadAiStatus(); }, [data, aiConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: page }));
    }
  };

  const handleUpdate = (lead = null) => {
    setSelectedLead(lead);
    setUpdatePopUpShow(true);
  };

  const handleDelete = (leadId) => {
    setSelectedLeadId(leadId);
    setDeletePopUpShow(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLeadId) return;
    try {
      toast.loading("Deleting lead...");
      const data = await deleteLead(selectedLeadId);
      toast.dismiss();
      if (data?.success) {
        toast.success("Lead deleted successfully!");
        setDeletePopUpShow(false);
        setSelectedLeadId(null);
        refetch();
      } else {
        toast.error(data?.error || "Failed to delete lead");
      }
    } catch (error) {
      toast.error("Failed to delete lead");
    }
  };

  const handleAddLeadSubmit = async (leadData) => {
    toast.loading("Adding lead...");
    const data = await createLead(leadData);
    if (data?.success) {
      toast.dismiss();
      toast.success(data?.message || "Lead added successfully!");
      handleCloseAddModal();
      refetch();
    } else {
      toast.dismiss();
      toast.error(data?.error || "Failed to add lead");
    }
  };

  const handleUpdateSubmit = async (id, actionData) => {
    try {
      if (actionData) {
        toast.loading("Assigning lead...");
        const data = await assignLead(id, actionData);
        toast.dismiss();
        if (data?.success) {
          toast.success(data?.message);
        } else {
          toast.error(data?.error);
        }
        refetch();
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update lead");
    }
  };

  const handleOpenAddModal = () => setIsAddModalVisible(true);
  const handleCloseAddModal = () => setIsAddModalVisible(false);

  const handleDetailsPopUpClick = (lead) => {
    setSelectedLead(lead);
    setDetailsServicePopUp(true);
  };

  const handleChange = (filterType, value) => {
    setFilters(prevFilters => ({ ...prevFilters, [filterType]: value || null }));
    handlePageChange(1);
  };

  const pendingLeadsCount =
    (data?.allLeadsCount || 0) -
    (data?.feasibleCount || 0) -
    (data?.notFeasibleCount || 0) -
    (data?.callUnansweredCount || 0);

  return (
    <>
      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="MarketingMasterGrid" />
            <div
              className="main-panel"
              style={{
                width: isopen ? "" : "calc(100% - 120px)",
                marginLeft: isopen ? "" : "125px",
              }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="row px-2 py-1">
                  <div className="col-12 col-lg-4">
                    <h5 className="text-white py-2">Marketing Dashboard</h5>
                  </div>
                  <div className="col-12 col-lg-8 d-flex justify-content-end align-items-center">
                    {user?.permissions?.includes("admin") && (
                      <div className="me-3">
                        <button
                          onClick={handleProcessStaleLeads}
                          disabled={processingStaleLeads}
                          className="btn btn-warning btn-sm"
                          title="Process leads older than 30 days and mark them as not-feasible"
                        >
                          {processingStaleLeads ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Processing...
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-clock me-2"></i>
                              Process Stale Leads
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {/* AI CALLING – NEW — AI Agent button */}
                    {aiConfig?.enabled && (
                      <div className="me-3">
                        <button onClick={() => setAiDashboardOpen(true)} type="button" className="btn btn-primary btn-sm"
                          title="Tripti — AI calling agent">
                          <i className="fa-solid fa-robot me-2"></i>AI Agent
                          {aiConfig.dryRun && <span className="badge bg-warning text-dark ms-2">TEST</span>}
                        </button>
                      </div>
                    )}
                    {user?.permissions?.includes("createLead") || user?.user === 'company' ? (
                      <div>
                        <button onClick={handleOpenAddModal} type="button" className="btn adbtn btn-dark">
                          <i className="fa-solid fa-plus"></i> Add
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* ✅ UPDATED — added landingPageLeads + landingPageNewLeads */}
                <MarketingDashboardCards
                  allLeads={data?.allLeadsCount || 0}
                  feasibleLeads={data?.feasibleCount || 0}
                  notFeasibleLeads={data?.notFeasibleCount || 0}
                  callUnansweredLeads={data?.callUnansweredCount || 0}
                  pendingLeads={pendingLeadsCount >= 0 ? pendingLeadsCount : 0}
                  landingPageLeads={landingStats.total}
                  landingPageNewLeads={landingStats.newCount}
                />

                <div className="row align-items-center p-2 m-1">
                  <div className="col-12 col-lg-4 ms-auto text-end">
                    <div className="row ms-auto">
                      <div className="col-12 col-lg-6 mt-4">
                        <input
                          type="date"
                          className="form-control bg_edit"
                          name="date"
                          onChange={(e) => handleChange('date', e.target.value)}
                          value={filters.date || ""}
                        />
                      </div>
                      <div className="col-12 col-lg-6 mt-4">
                        <select
                          className="form-select bg_edit"
                          name="source"
                          onChange={(e) => handleChange('source', e.target.value)}
                          value={filters.source || ""}
                        >
                          <option value="">Sources....</option>
                          <option value="IndiaMart">IndiaMart</option>
                          <option value="TradeIndia">TradeIndia</option>
                          <option value="Google">Google</option>
                          <option value="Tender">Tender</option>
                          <option value="Exhibitions">Exhibitions</option>
                          <option value="JustDial">JustDial</option>
                          <option value="Facebook">Facebook</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Twitter">Twitter</option>
                          <option value="YouTube">YouTube</option>
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Referral">Referral</option>
                          <option value="Email Campaign">Email Campaign</option>
                          <option value="Cold Call">Cold Call</option>
                          <option value="Website">Website</option>
                          <option value="Walk-In">Walk-In</option>
                          <option value="Direct">Direct</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            <th>Sr.No</th>
                            <th>Sources</th>
                            <th className="align_left_td td_width">Company Name</th>
                            <th className="align_left_td td_width">Contact Name</th>
                            <th className="align_left_td td_width">Product</th>
                            <th>Mobile</th>
                            <th>Date</th>
                            <th>Created By</th>
                            <th>Call Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {data?.leads?.length > 0 ? (
                            data.leads.map((lead, index) => (
                              <tr key={lead._id}>
                                <td>{(pagination.currentPage - 1) * itemsPerPage + index + 1}</td>
                                <td>
                                  {lead?.SOURCE}
                                  {/* ✅ NEW — WhatsApp campaign badge */}
                                  {lead?.isCampaignLead && (
                                    <span className="badge bg-success ms-1" style={{ fontSize: '0.65rem' }}>
                                      <i className="fa-brands fa-whatsapp me-1"></i>Campaign
                                    </span>
                                  )}
                                </td>
                                <td className="align_left_td td_width wrap-text-of-col">{lead?.SENDER_COMPANY || "Not available."}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{lead?.SENDER_NAME || "Not available."}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{lead?.QUERY_PRODUCT_NAME || "Not available."}</td>
                                <td>{lead?.SENDER_MOBILE || "Not available."}</td>

                                <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                  {formatLeadTime(lead)}
                                </td>

                                {/* ✅ NEW — Created By */}
                                <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                  {lead?.createdByName ? (
                                    <span className="fw-semibold">
                                      <i className="fa-solid fa-user-pen me-1 text-primary"></i>
                                      {getCreatedBy(lead)}
                                    </span>
                                  ) : (
                                    <span className="text-muted">{getCreatedBy(lead)}</span>
                                  )}
                                </td>

                                <td className="text-center">
                                  {lead?.callHistory && lead.callHistory.length > 0 ? (
                                    <span title={`${lead.callHistory.length} call attempt(s) recorded`}>
                                      <i className="fa-solid fa-phone-volume text-warning me-1"></i>
                                      <span className="fw-bold text-warning" style={{ fontSize: '0.85rem' }}>
                                        {lead.callHistory.length}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Pending</span>
                                  )}
                                  {/* AI CALLING – NEW — Tripti badge */}
                                  {aiStatus[lead._id] && (
                                    <div>
                                      <span className={`badge ${callBadge({ outcome: aiStatus[lead._id].lastOutcome, status: aiStatus[lead._id].lastStatus, providerCallId: aiStatus[lead._id].dryRun ? 'dryrun-' : '' }).cls} mt-1`}
                                        style={{ fontSize: '0.65rem', cursor: 'pointer' }} onClick={() => setAiLead(lead)}
                                        title={`${aiStatus[lead._id].calls} AI call(s) — click for history`}>
                                        <i className="fa-solid fa-robot me-1"></i>
                                        {callBadge({ outcome: aiStatus[lead._id].lastOutcome, status: aiStatus[lead._id].lastStatus, providerCallId: aiStatus[lead._id].dryRun ? 'dryrun-' : '' }).text}
                                      </span>
                                    </div>
                                  )}
                                </td>

                                <td>
                                  {user?.permissions?.includes('assignLead') && (
                                    <span onClick={() => handleUpdate(lead)} title="Assign Lead" style={{ cursor: 'pointer' }}>
                                      <i className="mx-1 fa-solid fa-share"></i>
                                    </span>
                                  )}
                                  {lead.SOURCE === 'Direct' && (user?.permissions?.includes('deleteLead') || user?.user === 'company') && (
                                    <span onClick={() => handleDelete(lead._id)} title="Delete Lead" style={{ cursor: 'pointer' }}>
                                      <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                    </span>
                                  )}
                                  <span onClick={() => handleDetailsPopUpClick(lead)} title="View Details" style={{ cursor: 'pointer' }}>
                                    <i className="fa-solid fa-eye cursor-pointer text-primary mx-1"></i>
                                  </span>
                                  {/* AI CALLING – NEW — AI Agent (Tripti) */}
                                  {aiConfig?.enabled && (
                                    <span onClick={() => setAiLead(lead)} title="AI Agent (Tripti) — call & history" style={{ cursor: 'pointer' }}>
                                      <i className="fa-solid fa-robot text-success mx-1"></i>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="10" className="text-center">No data found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Pagination */}
                {!loading && pagination.totalPages > 1 && (
                  <div className="pagination-container text-center my-3">
                    <button onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage} className="btn btn-dark btn-sm me-1" style={{ borderRadius: "4px" }}>First</button>
                    <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage} className="btn btn-dark btn-sm me-1" style={{ borderRadius: "4px" }}>Previous</button>
                    {(() => {
                      const pageNumbers = [];
                      const maxPagesToShow = 5;
                      if (pagination.totalPages <= maxPagesToShow) {
                        for (let i = 1; i <= pagination.totalPages; i++) pageNumbers.push(i);
                      } else {
                        let startPage, endPage;
                        if (pagination.currentPage <= 3) { startPage = 1; endPage = maxPagesToShow; }
                        else if (pagination.currentPage >= pagination.totalPages - 2) { startPage = pagination.totalPages - maxPagesToShow + 1; endPage = pagination.totalPages; }
                        else { startPage = pagination.currentPage - 2; endPage = pagination.currentPage + 2; }
                        for (let i = Math.max(1, startPage); i <= Math.min(pagination.totalPages, endPage); i++) pageNumbers.push(i);
                      }
                      return pageNumbers.map((number) => (
                        <button key={number} onClick={() => handlePageChange(number)} className={`btn btn-sm me-1 ${pagination.currentPage === number ? "btn-primary" : "btn-dark"}`} style={{ minWidth: "35px", borderRadius: "4px" }}>{number}</button>
                      ));
                    })()}
                    <button disabled={!pagination.hasNextPage} onClick={() => handlePageChange(pagination.currentPage + 1)} className="btn btn-dark btn-sm me-1">Next</button>
                    <button onClick={() => handlePageChange(pagination.totalPages)} disabled={!pagination.hasNextPage} className="btn btn-dark btn-sm" style={{ borderRadius: "4px" }}>Last</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {UpdatePopUpShow && selectedLead && (
        <AssignMarketingLeadPopUp
          selectedLead={selectedLead}
          currentUser={user}
          onUpdate={handleUpdateSubmit}
          onDetailsSaved={refetch}   // ✅ NEW
          onClose={() => { setUpdatePopUpShow(false); setSelectedLead(null); }}
        />
      )}

      {addpop && (
        <AddLeadMaster onAddLead={handleAddLeadSubmit} onClose={handleCloseAddModal} />
      )}

      {deletePopUpShow && (
        <DeletePopUP
          message={"Are you sure you want to delete this lead?"}
          heading={"Delete Lead"}
          cancelBtnCallBack={() => setDeletePopUpShow(false)}
          confirmBtnCallBack={handleDeleteConfirm}
        />
      )}

      {detailsServicePopUp && selectedLead && (
        <ViewSalesLeadPopUp
          closePopUp={() => { setDetailsServicePopUp(false); setSelectedLead(null); }}
          selectedLead={selectedLead}
        />
      )}

      {/* AI CALLING – NEW — popups */}
      {aiDashboardOpen && (
        <AiAgentDashboardPopUp
          pageLeads={data?.leads || []}
          onClose={() => setAiDashboardOpen(false)}
          onOpenLead={(l) => setAiLead(l)}
          onQueued={loadAiStatus}
        />
      )}
      {aiLead && (
        <AiAgentLeadPopUp
          lead={aiLead}
          onClose={() => { setAiLead(null); loadAiStatus(); }}
          onCalled={loadAiStatus}
        />
      )}

      {loading && (
        <div className="overlay">
          <span className="loader"></span>
        </div>
      )}
    </>
  );
};