import { useState, useContext, useEffect, useCallback } from "react";
import axios from "axios";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import AddSalesLeadPopUp from "./PopUp/AddSalesLeadPopUp";
import { formatDateforTaskUpdate } from "../../../../utils/formatDate";
import SalesDashboardCards from './SalesDashboardCards';
import SalesQuotationFunnel from './SalesQuotationFunnel';
import SalesFunnelView from './PopUp/SalesFunnelView';
import { UserContext } from "../../../../context/UserContext";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import ViewSalesLeadPopUp from "../../CommonPopUp/ViewSalesLeadPopUp";
import UpdateSalesPopUp from "./PopUp/UpdateSalesPopUp";
import AssignSalesLeadPopUp from "./PopUp/AssignSalesLeadPopUp";
import useMyLeads from "../../../../hooks/leads/useMyLeads";
import useSubmitEnquiry from "../../../../hooks/leads/useSubmitEnquiry";
import useCreateLead from "../../../../hooks/leads/useCreateLead";
import useDeleteLead from "../../../../hooks/leads/useDeleteLead";
import useReassignLead from "../../../../hooks/leads/useReassignLead";
import MeetingDrawer from "./PopUp/MeetingDrawer";

const ALL_LEADS_URL = `${process.env.REACT_APP_API_URL}/api/leads/my-leads`;

export const SalesMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [viewMode, setViewMode] = useState("table");

  const [addpop,           setIsAddModalVisible] = useState(false);
  const [UpdatePopUpShow,  setUpdatePopUpShow]   = useState(false);
  const [showLeadPopUp,    setShowLeadPopUp]     = useState(false);
  const [assignPopUpShow,  setAssignPopUpShow]   = useState(false);
  const [selectedLead,     setSelectedLead]      = useState(null);
  const [deletePopUpShow,  setDeletePopUpShow]   = useState(false);
  const [selectedLeadId,   setSelectedLeadId]    = useState(null);
  const [meetingDrawer,    setMeetingDrawer]     = useState(false);

  const { user } = useContext(UserContext);

  const [filters, setFilters] = useState({
    status: null, date: null, callLeads: null,
    source: null, searchTerm: "", followUpToday: false,
  });

  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 0, totalServices: 0,
    limit: 20, hasNextPage: true, hasPrevPage: false,
  });
  const itemsPerPage = 20;

  const [funnelLeads,   setFunnelLeads]   = useState([]);
  const [funnelLoading, setFunnelLoading] = useState(false);

  const { data, loading, error, refetch } = useMyLeads(
    pagination.currentPage, itemsPerPage, filters
  );
  const { submitEnquiry } = useSubmitEnquiry();
  const { createLead }    = useCreateLead();
  const { deleteLead }    = useDeleteLead();
  const { reassignLead }  = useReassignLead();
  const [allLeads, setAllLeads] = useState([]);

  const fetchAllLeadsForFunnel = useCallback(async () => {
    setFunnelLoading(true);
    try {
      const params = {
        page: 1, limit: 99999,
        ...(filters.source      && { source:        filters.source      }),
        ...(filters.date        && { date:           filters.date        }),
        ...(filters.status      && { status:         filters.status      }),
        ...(filters.callLeads   && { callLeads:      filters.callLeads   }),
        ...(filters.searchTerm  && { search:         filters.searchTerm  }),
        ...(filters.followUpToday && { followUpToday: 'true'             }),
      };
      const response = await axios.get(ALL_LEADS_URL, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.data.success) setFunnelLeads(response.data.leads || []);
      else setFunnelLeads([]);
    } catch (err) {
      console.error("Funnel leads fetch error:", err);
      setFunnelLeads([]);
    } finally {
      setFunnelLoading(false);
    }
  }, [filters.source, filters.date, filters.status, filters.callLeads, filters.searchTerm, filters.followUpToday]);

  useEffect(() => { fetchAllLeadsForFunnel(); }, [fetchAllLeadsForFunnel]);
  useEffect(() => { if (viewMode === "funnel") fetchAllLeadsForFunnel(); }, [viewMode]);

  const formatDateOnly = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString('en-GB');
  };

  const getFollowUpStatus = (dateString, leadStatus) => {
    if (!dateString) return null;
    if (leadStatus === 'Won' || leadStatus === 'Lost') return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const now = new Date();
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (date >= s && date <= e) return 'today';
    if (date < s) return 'overdue';
    return null;
  };

  useEffect(() => {
    if (data) {
      setPagination(prev => ({ ...prev, ...data.pagination }));
      if (data.leads) setAllLeads(data.leads);
    }
    if (error) toast.error(error.message || "An error occurred");
  }, [data, error]);

  useEffect(() => {
    if (
      filters.status    !== null ||
      filters.date      !== null ||
      filters.source    !== null ||
      filters.callLeads !== null ||
      filters.followUpToday
    ) {
      setAllLeads([]);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      refetch();
    }
  }, [filters.status, filters.date, filters.source, filters.callLeads, filters.followUpToday]);

  const isFollowUpTodayMode = filters.followUpToday;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages)
      setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleBgColor = (status) => {
    switch (status) {
      case "Won":     return "badge bg-success text-white";
      case "Ongoing": return "badge bg-primary text-white";
      case "Pending": return "badge bg-warning text-dark";
      case "Lost":    return "badge bg-danger text-white";
      default:        return "badge bg-secondary";
    }
  };

  const handleUpdate = (lead = null) => {
    if (lead && (lead.STATUS === 'Won' || lead.STATUS === 'Lost')) {
      toast.error(`Cannot update a "${lead.STATUS}" lead. Already finalized.`); return;
    }
    setSelectedLead(lead); setUpdatePopUpShow(true);
  };

  const handleAssign = (lead = null) => {
    const canAssign = user?.permissions?.includes('updateLead') || user?.user === 'company';
    if (!canAssign) { toast.error("You don't have permission to reassign leads."); return; }
    if (lead && (lead.STATUS === 'Won' || lead.STATUS === 'Lost')) {
      toast.error(`Cannot reassign a "${lead.STATUS}" lead. Already finalized.`); return;
    }
    setSelectedLead(lead); setAssignPopUpShow(true);
  };

  const handleDelete = (leadId) => {
    const lead = allLeads.find(l => l._id === leadId) || funnelLeads.find(l => l._id === leadId);
    if (lead && (lead.STATUS === 'Won' || lead.STATUS === 'Lost')) {
      toast.error(`Cannot delete a "${lead.STATUS}" lead. Already finalized.`); return;
    }
    setSelectedLeadId(leadId); setDeletePopUpShow(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLeadId) return;
    try {
      toast.loading("Deleting lead...");
      const res = await deleteLead(selectedLeadId);
      toast.dismiss();
      if (res?.success) {
        toast.success("Lead deleted successfully!");
        setDeletePopUpShow(false); setSelectedLeadId(null);
        setAllLeads([]); refetch(); fetchAllLeadsForFunnel();
      } else { toast.error(res?.error || "Failed to delete lead"); }
    } catch { toast.error("Failed to delete lead"); }
  };

  const handleAssignSubmit = async (id, assignData) => {
    try {
      toast.loading("Reassigning lead...");
      const res = await reassignLead(id, assignData);
      toast.dismiss();
      if (res?.success) {
        toast.success(res?.message || "Lead reassigned successfully!");
        setAssignPopUpShow(false); setSelectedLead(null);
        refetch(); fetchAllLeadsForFunnel();
      } else { toast.error(res?.error || "Failed to reassign lead"); }
    } catch { toast.error("Failed to reassign lead"); }
  };

  const handleUpdateSubmit = async (id, enquiryData) => {
    try {
      if (enquiryData) {
        const res = await submitEnquiry(id, enquiryData);
        if (res?.success) toast.success(res?.message); else toast.error(res?.error);
        refetch(); fetchAllLeadsForFunnel();
      }
    } catch { toast.error("Failed to Submit Enquiry"); }
  };

  const handleDetailsPopUpClick = (lead) => { setSelectedLead(lead); setShowLeadPopUp(true); };

  // ── Open meeting drawer — always use the freshest lead from allLeads/funnelLeads
  const handleMeeting = (lead) => {
    // Try to get the latest version of this lead from the already-fetched lists
    const freshLead =
      allLeads.find(l => l._id === lead._id) ||
      funnelLeads.find(l => l._id === lead._id) ||
      lead;
    setSelectedLead(freshLead);
    setMeetingDrawer(true);
  };

  // ── Close meeting drawer — refetch so next open has updated previousActions
  const handleMeetingClose = () => {
    setMeetingDrawer(false);
    setSelectedLead(null);
    // Refetch ensures the lead objects in allLeads and funnelLeads
    // include the new previousActions entries just saved by MeetingDrawer
    refetch();
    fetchAllLeadsForFunnel();
  };

  const handleChange = (filterType, value) =>
    setFilters(prev => ({ ...prev, [filterType]: value || null }));

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, searchTerm: e.target.value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleTodayFollowUpClick = () =>
    setFilters(prev => ({
      ...prev, followUpToday: true, date: null, status: null, source: null, callLeads: null,
    }));

  const resetSearch  = () => { setFilters(prev => ({ ...prev, searchTerm: "" })); setAllLeads([]); };
  const resetFilters = () => {
    setFilters({ status: null, date: null, callLeads: null, source: null, searchTerm: "", followUpToday: false });
    setAllLeads([]);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    refetch();
  };

  const handleOpenAddModal  = () => setIsAddModalVisible(true);
  const handleCloseAddModal = () => setIsAddModalVisible(false);

  const handleAddLeadSubmit = async (leadData) => {
    toast.loading("Adding lead...");
    const res = await createLead(leadData);
    toast.dismiss();
    if (res?.success) {
      toast.success(res?.message || "Lead added successfully!");
      handleCloseAddModal();
      setAllLeads([]);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      refetch(); fetchAllLeadsForFunnel();
    } else { toast.error(res?.error || "Failed to add lead"); }
  };

  const canAssignLead = user?.permissions?.includes('updateLead') || user?.user === 'company';
  const canUpdateLead = user?.permissions?.includes('updateLead') || user?.user === 'company';
  const canDeleteLead = user?.permissions?.includes('deleteLead') || user?.user === 'company';

  return (
    <>
      {(loading || funnelLoading) && (
        <div className="overlay"><span className="loader"></span></div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="SalesMasterGrid" />
            <div
              className="main-panel"
              style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* ── Title + toggle + add ── */}
                <div className="row px-2 py-1 mb-3">
                  <div className="col-12 col-lg-4">
                    <h5 className="text-white py-2">My Sales Dashboard</h5>
                  </div>
                  <div className="col-12 col-lg-8 d-flex align-items-center justify-content-end gap-2 pe-4">
                    <div className="btn-group" role="group">
                      <button
                        type="button"
                        className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => setViewMode("table")} title="Table View"
                      >
                        <i className="fa-solid fa-table-list"></i> Table
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${viewMode === "funnel" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => setViewMode("funnel")} title="Funnel View"
                      >
                        <i className="fa-solid fa-filter"></i> Funnel
                      </button>
                    </div>
                    {(user?.permissions?.includes("createLead") || user?.user === 'company') && (
                      <button onClick={handleOpenAddModal} type="button" className="btn btn-primary btn-sm">
                        <i className="fa-solid fa-plus"></i> Add Lead
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Dashboard Cards ── */}
                <SalesDashboardCards
                  allLeadsCount={data?.leadCounts?.allLeadsCount || 0}
                  ongogingCount={data?.leadCounts?.ongogingCount || 0}
                  winCount={data?.leadCounts?.winCount || 0}
                  pendingCount={data?.leadCounts?.pendingCount || 0}
                  lostCount={data?.leadCounts?.lostCount || 0}
                  todayCount={data?.leadCounts?.todaysFollowUpCount || 0}
                  hotleadsCount={data?.leadCounts?.hotleadsCount || 0}
                  warmLeadsCount={data?.leadCounts?.warmLeadsCount || 0}
                  coldLeadsCount={data?.leadCounts?.coldLeadsCount || 0}
                  invalidLeadsCount={data?.leadCounts?.invalidLeadsCount || 0}
                  onTodayFollowUpClick={handleTodayFollowUpClick}
                />

                {/* ── Quotation Funnel ── */}
                {data?.quotationFunnel && (
                  <div className="row p-2 m-1">
                    <div className="col-12">
                      <SalesQuotationFunnel
                        totalQuotationAmount={data.quotationFunnel.totalActiveQuotationAmount || 0}
                        activeQuotationLeads={data.quotationFunnel.activeQuotationLeads || []}
                        wonAmount={data.quotationFunnel.totalWonAmount || 0}
                        lostAmount={data.quotationFunnel.totalLostAmount || 0}
                      />
                    </div>
                  </div>
                )}

                {/* ── Filters ── */}
                <div className="row align-items-center p-3 m-1 bg-light rounded mb-3">
                  <div className="col-12 col-lg-6">
                    <div className="input-group">
                      <input
                        type="text" className="form-control"
                        placeholder="Search by Mobile Number or Company Name..."
                        value={filters.searchTerm || ""} onChange={handleSearchChange}
                      />
                      {filters.searchTerm && (
                        <button className="btn btn-outline-secondary" type="button" onClick={resetSearch}>
                          <i className="fa-solid fa-times"></i>
                        </button>
                      )}
                      <button className="btn btn-primary" type="button">
                        <i className="fa-solid fa-search"></i>
                      </button>
                    </div>
                    {isFollowUpTodayMode && (
                      <div className="mt-2">
                        <small className="text-info">
                          <i className="fa-solid fa-info-circle"></i> Showing leads with follow-up scheduled for today
                        </small>
                      </div>
                    )}
                  </div>
                  <div className="col-12 col-lg-6 ms-auto text-end">
                    <div className="row g-2">
                      <div className="col">
                        <input
                          type="date" className="form-control" name="date"
                          onChange={e => handleChange('date', e.target.value)}
                          value={filters.date || ""} disabled={isFollowUpTodayMode}
                        />
                      </div>
                      <div className="col">
                        <select
                          className="form-select" name="callLeads"
                          onChange={e => handleChange('callLeads', e.target.value)}
                          value={filters.callLeads || ""} disabled={isFollowUpTodayMode}
                        >
                          <option value="">Leads...</option>
                          <option value="Hot Leads">Hot Leads</option>
                          <option value="Warm Leads">Warm Leads</option>
                          <option value="Cold Leads">Cold Leads</option>
                          <option value="Invalid Leads">Invalid Leads</option>
                        </select>
                      </div>
                      <div className="col">
                        <select
                          className="form-select" name="source"
                          onChange={e => handleChange('source', e.target.value)}
                          value={filters.source || ""} disabled={isFollowUpTodayMode}
                        >
                          <option value="">Sources...</option>
                          <option value="Direct">Direct</option>
                          <option value="IndiaMart">IndiaMart</option>
                          <option value="TradeIndia">TradeIndia</option>
                          <option value="Facebook">Facebook</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Google">Google</option>
                          <option value="Tender">Tender</option>
                          <option value="Exhibitions">Exhibitions</option>
                          <option value="JustDial">JustDial</option>
                          <option value="Twitter">Twitter</option>
                          <option value="YouTube">YouTube</option>
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Referral">Referral</option>
                          <option value="Email Campaign">Email Campaign</option>
                          <option value="Cold Call">Cold Call</option>
                          <option value="Website">Website</option>
                          <option value="Walk-In">Walk-In</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="col">
                        <select
                          className="form-select" name="status"
                          onChange={e => handleChange('status', e.target.value)}
                          value={filters.status || ""} disabled={isFollowUpTodayMode}
                        >
                          <option value="">Status...</option>
                          <option value="Won">Won</option>
                          <option value="Ongoing">Ongoing</option>
                          <option value="Pending">Pending</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </div>
                      <div className="col">
                        <button
                          className="btn btn-outline-secondary w-100" type="button"
                          onClick={resetFilters} title="Reset all filters"
                        >
                          <i className="fa-solid fa-filter-circle-xmark"></i> Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ══ FUNNEL VIEW ══ */}
                {viewMode === "funnel" && (
                  <div className="row bg-white p-3 m-1 border rounded shadow-sm">
                    <div className="col-12" style={{ overflowX: "auto" }}>
                      {funnelLoading ? (
                        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
                          <div className="spinner-border text-primary mb-3" role="status" style={{ width: 40, height: 40 }}></div>
                          <div style={{ fontSize: 14 }}>Loading all leads for funnel...</div>
                        </div>
                      ) : (
                        <SalesFunnelView
                          leads={funnelLeads}
                          onView={handleDetailsPopUpClick}
                          onUpdate={handleUpdate}
                          onAssign={handleAssign}
                          onDelete={handleDelete}
                          onMeeting={handleMeeting}
                          canUpdate={canUpdateLead}
                          canAssign={canAssignLead}
                          canDelete={canDeleteLead}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* ══ TABLE VIEW ══ */}
                {viewMode === "table" && (
                  <div className="row bg-white p-3 m-1 border rounded shadow-sm">
                    <div className="col-12">
                      <div className="table-responsive">
                        <table className="table table-hover table-striped" id="table-id">
                          <thead className="table-dark">
                            <tr>
                              <th className="text-center" style={{ width: '60px' }}>Sr.No</th>
                              <th style={{ minWidth: '150px' }}>Company Name</th>
                              <th style={{ minWidth: '120px' }} className="text-start">Contact Name</th>
                              <th style={{ minWidth: '120px' }} className="text-start">Product</th>
                              <th style={{ width: '100px' }}>Source</th>
                              <th style={{ width: '120px' }}>Mobile</th>
                              <th style={{ width: '120px' }}>Created Date</th>
                              <th style={{ width: '120px' }}>Follow-up Date</th>
                              <th style={{ width: '80px' }}>Status</th>
                              <th className="text-center" style={{ width: '120px' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data?.leads?.length > 0 ? (
                              data.leads.map((lead, index) => {
                                const followUpStatus = getFollowUpStatus(lead.nextFollowUpDate, lead.STATUS);
                                const isToday   = followUpStatus === 'today';
                                const isOverdue = followUpStatus === 'overdue';
                                return (
                                  <tr
                                    key={lead._id}
                                    className={isToday ? "row-today-followup" : isOverdue ? "row-overdue-followup" : ""}
                                  >
                                    <td className="text-center">
                                      {(pagination.currentPage - 1) * itemsPerPage + index + 1}
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <span>{lead.SENDER_COMPANY || "Not available."}</span>
                                        {isToday && (
                                          <span className="badge bg-danger text-white ms-2 badge-pulse-red">
                                            <i className="fa-solid fa-bell"></i> TODAY FOLLOWUP
                                          </span>
                                        )}
                                        {isOverdue && (
                                          <span className="badge bg-danger text-white ms-2 badge-pulse-dark-red">
                                            <i className="fa-solid fa-triangle-exclamation"></i> OVERDUE
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="text-start">{lead.SENDER_NAME || "Not available."}</td>
                                    <td className="text-start">{lead.QUERY_PRODUCT_NAME || "Not available."}</td>
                                    <td><small className="text-muted">{lead.SOURCE}</small></td>
                                    <td><small className="text-muted">{lead.SENDER_MOBILE || "Not available."}</small></td>
                                    <td><small className="text-muted">{formatDateforTaskUpdate(lead.createdAt)}</small></td>
                                    <td>
                                      {lead.nextFollowUpDate ? (
                                        <span className={
                                          isToday   ? "fw-bold text-danger date-glow-red" :
                                          isOverdue ? "fw-bold text-danger date-glow-dark-red" : "text-muted"
                                        }>
                                          {formatDateOnly(lead.nextFollowUpDate)}
                                        </span>
                                      ) : <span className="text-muted">Not set</span>}
                                    </td>
                                    <td>
                                      <span className={handleBgColor(lead.STATUS)}>{lead.STATUS}</span>
                                    </td>

                                    {/* ── Action column ── */}
                                    <td className="text-center">
                                      {lead.STATUS === 'Won' || lead.STATUS === 'Lost' ? (
                                        <div className="btn-group" role="group">
                                          <button
                                            className="btn btn-sm btn-outline-info"
                                            onClick={() => handleDetailsPopUpClick(lead)} title="View"
                                          >
                                            <i className="fa-solid fa-eye"></i>
                                          </button>
                                          <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => handleMeeting(lead)}
                                            title="Schedule Meeting"
                                          >
                                            <i className="fa-solid fa-video"></i>
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="btn-group" role="group">
                                          {canUpdateLead && (
                                            <button
                                              className="btn btn-sm btn-outline-success"
                                              onClick={() => handleUpdate(lead)} title="Update"
                                            >
                                              <i className="fa-solid fa-pen"></i>
                                            </button>
                                          )}
                                          {canAssignLead && (
                                            <button
                                              className="btn btn-sm btn-outline-warning"
                                              onClick={() => handleAssign(lead)} title="Reassign"
                                            >
                                              <i className="fa-solid fa-share"></i>
                                            </button>
                                          )}
                                          <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => handleMeeting(lead)}
                                            title="Schedule Meeting"
                                          >
                                            <i className="fa-solid fa-video"></i>
                                          </button>
                                          {lead.SOURCE === 'Direct' && canDeleteLead && (
                                            <button
                                              className="btn btn-sm btn-outline-danger"
                                              onClick={() => handleDelete(lead._id)} title="Delete"
                                            >
                                              <i className="fa-solid fa-trash"></i>
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="10" className="text-center py-4">
                                  <div className="text-muted">
                                    <i className="fa-solid fa-inbox fa-2x mb-2"></i>
                                    <p className="mb-0">No leads found.</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Pagination ── */}
                {viewMode === "table" && !loading && pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-3">
                    <nav>
                      <ul className="pagination mb-0">
                        <li className={`page-item ${!pagination.hasPrevPage ? 'disabled' : ''}`}>
                          <button className="page-link"
                            onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage}>First</button>
                        </li>
                        <li className={`page-item ${!pagination.hasPrevPage ? 'disabled' : ''}`}>
                          <button className="page-link"
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={!pagination.hasPrevPage}>Previous</button>
                        </li>
                        {(() => {
                          const pageNumbers = [];
                          const maxPagesToShow = 5;
                          if (pagination.totalPages <= maxPagesToShow) {
                            for (let i = 1; i <= pagination.totalPages; i++) pageNumbers.push(i);
                          } else {
                            let startPage = Math.max(1, pagination.currentPage - 2);
                            let endPage   = Math.min(pagination.totalPages, startPage + maxPagesToShow - 1);
                            if (endPage - startPage < maxPagesToShow - 1)
                              startPage = Math.max(1, endPage - maxPagesToShow + 1);
                            for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
                          }
                          return pageNumbers.map(number => (
                            <li key={number} className={`page-item ${pagination.currentPage === number ? 'active' : ''}`}>
                              <button className="page-link" onClick={() => handlePageChange(number)}>
                                {number}
                              </button>
                            </li>
                          ));
                        })()}
                        <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}>
                          <button className="page-link"
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            disabled={!pagination.hasNextPage}>Next</button>
                        </li>
                        <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}>
                          <button className="page-link"
                            onClick={() => handlePageChange(pagination.totalPages)}
                            disabled={!pagination.hasNextPage}>Last</button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ POPUPS ══ */}
      {addpop && (
        <AddSalesLeadPopUp onAddLead={handleAddLeadSubmit} onClose={handleCloseAddModal} />
      )}
      {UpdatePopUpShow && selectedLead && (
        <UpdateSalesPopUp
          selectedLead={selectedLead} onUpdate={handleUpdateSubmit}
          isCompany={user.user === 'company'}
          onClose={() => { setUpdatePopUpShow(false); setSelectedLead(null); }}
        />
      )}
      {assignPopUpShow && selectedLead && (
        <AssignSalesLeadPopUp
          selectedLead={selectedLead} onUpdate={handleAssignSubmit}
          onClose={() => { setAssignPopUpShow(false); setSelectedLead(null); }}
        />
      )}
      {deletePopUpShow && (
        <DeletePopUP
          message={"Are you sure you want to delete this lead?"} heading={"Delete Lead"}
          cancelBtnCallBack={() => setDeletePopUpShow(false)}
          confirmBtnCallBack={handleDeleteConfirm}
        />
      )}
      {showLeadPopUp && selectedLead && (
        <ViewSalesLeadPopUp
          closePopUp={() => { setShowLeadPopUp(false); setSelectedLead(null); }}
          selectedLead={selectedLead}
        />
      )}

      {/* ── Meeting Drawer ── */}
      {/* handleMeetingClose calls refetch() + fetchAllLeadsForFunnel()
          so the next time this lead is opened in MeetingDrawer it
          carries the fresh previousActions with saved meeting history */}
      {meetingDrawer && selectedLead && (
        <MeetingDrawer
          lead={selectedLead}
          onClose={handleMeetingClose}
        />
      )}

      {/* ── Global CSS ── */}
      <style jsx>{`
        .row-today-followup { animation: blinkRed 1s infinite; }
        @keyframes blinkRed {
          0%,100% { background-color: rgba(255,50,50,0.08);  box-shadow: 0 0 4px  rgba(255,0,0,0.25); }
          50%      { background-color: rgba(255,150,150,0.45); box-shadow: 0 0 18px rgba(255,0,0,0.6);  }
        }
        .badge-pulse-red { animation: badgeRed 1.5s infinite; box-shadow: 0 0 8px rgba(255,0,0,0.6); font-size: .72rem; }
        @keyframes badgeRed { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        .date-glow-red { animation: glowRed 1.2s infinite; }
        @keyframes glowRed {
          0%,100% { text-shadow: 0 0 4px  rgba(255,0,0,0.5); }
          50%      { text-shadow: 0 0 12px rgba(255,0,0,0.9); }
        }
        .row-overdue-followup { animation: blinkDarkRed 1.2s infinite; }
        @keyframes blinkDarkRed {
          0%,100% { background-color: rgba(139,0,0,0.10); box-shadow: 0 0 4px  rgba(139,0,0,0.3); }
          50%      { background-color: rgba(139,0,0,0.35); box-shadow: 0 0 16px rgba(139,0,0,0.7); }
        }
        .badge-pulse-dark-red { animation: badgeDarkRed 1.5s infinite; box-shadow: 0 0 8px rgba(139,0,0,0.6); font-size: .72rem; }
        @keyframes badgeDarkRed { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        .date-glow-dark-red { animation: glowDarkRed 1.2s infinite; }
        @keyframes glowDarkRed {
          0%,100% { text-shadow: 0 0 4px  rgba(139,0,0,0.5); }
          50%      { text-shadow: 0 0 12px rgba(139,0,0,0.9); }
        }
        .table th { border-top: none; font-weight: 600; font-size: .875rem; white-space: nowrap; }
        .table td { vertical-align: middle; font-size: .875rem; }
        .btn-group .btn { padding: .25rem .5rem; font-size: .75rem; }
        .table-hover tbody tr:hover { background-color: rgba(0,0,0,0.05); }
        .row-today-followup:hover   { background-color: rgba(255,100,100,0.2) !important; }
        .row-overdue-followup:hover { background-color: rgba(139,0,0,0.2)   !important; }
      `}</style>
    </>
  );
};

export default SalesMasterGrid;