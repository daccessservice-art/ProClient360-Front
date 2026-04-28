import { useState, useEffect, useContext, useCallback, useRef, useMemo } from "react";
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
import ChatbotDrawer from "./PopUp/ChatbotDrawer";

const ALL_LEADS_URL = `${process.env.REACT_APP_API_URL}/api/leads/my-leads`;

// ── Today's Action hover popup ────────────────────────────────────────────────
const TodayActionHoverPopup = ({ lead, sidebarW, onMouseEnter, onMouseLeave }) => {
  if (!lead) return null;
  const today = new Date().toDateString();
  const todayActions = (lead.previousActions || [])
    .filter(a => new Date(a.createdAt).toDateString() === today)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (todayActions.length === 0) return null;
  const formatTime = (dateStr) => {
    if (!dateStr) return "—";
    try { return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return "—"; }
  };
  const formatFollowUp = (dateStr) => {
    if (!dateStr) return "Not set";
    try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return "—"; }
  };
  const statusColor = (s) => {
    switch (s) {
      case 'Won': return '#198754'; case 'Ongoing': return '#0d6efd';
      case 'Pending': return '#ffc107'; case 'Lost': return '#dc3545'; default: return '#6c757d';
    }
  };
  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{
      position: 'fixed', top: '78px',
      left: `calc(${sidebarW}px + (100vw - ${sidebarW}px) / 2)`,
      transform: 'translateX(-50%)', width: '400px',
      maxWidth: `calc(100vw - ${sidebarW}px - 32px)`, zIndex: 9999,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
      boxShadow: '0 16px 56px rgba(0,0,0,0.25)', fontSize: '0.8rem', animation: 'popupFadeIn 0.18s ease',
    }}>
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', color: '#fff', padding: '12px 16px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className="fa-solid fa-bolt" style={{ fontSize: '0.9rem' }}></i>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.3px' }}>Today's Action{todayActions.length > 1 ? ` (${todayActions.length})` : ''}</span>
        <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.22)', borderRadius: '12px', padding: '2px 10px', fontSize: '0.73rem', fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.SENDER_COMPANY || lead.SENDER_NAME || '—'}</span>
      </div>
      <div style={{ padding: '14px 16px', maxHeight: '340px', overflowY: 'auto' }}>
        {todayActions.map((action, idx) => (
          <div key={action._id || idx} style={{ borderLeft: `3px solid ${statusColor(action.status)}`, paddingLeft: '12px', marginBottom: idx < todayActions.length - 1 ? '14px' : 0, paddingBottom: idx < todayActions.length - 1 ? '14px' : 0, borderBottom: idx < todayActions.length - 1 ? '1px dashed #e9ecef' : 'none' }}>
            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px', fontSize: '0.82rem' }}><i className="fa-solid fa-shoe-prints me-1" style={{ color: '#64748b', fontSize: '0.72rem' }}></i>{action.step || '—'}</div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ background: statusColor(action.status), color: action.status === 'Pending' ? '#000' : '#fff', borderRadius: '4px', padding: '2px 9px', fontWeight: 600, fontSize: '0.72rem' }}>{action.status || '—'}</span>
              {action.completion !== undefined && <span style={{ color: '#475569', fontSize: '0.73rem' }}><i className="fa-solid fa-circle-check me-1" style={{ color: '#22c55e', fontSize: '0.65rem' }}></i>{action.completion}% done</span>}
              {action.callLeads && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 7px', color: '#475569', fontSize: '0.68rem' }}>{action.callLeads}</span>}
            </div>
            {action.quotation > 0 && <div style={{ color: '#16a34a', fontWeight: 600, marginBottom: '5px', fontSize: '0.76rem' }}><i className="fa-solid fa-indian-rupee-sign me-1"></i>{Number(action.quotation).toLocaleString('en-IN')}</div>}
            {action.rem && <div style={{ background: '#f8fafc', borderRadius: '5px', padding: '6px 10px', color: '#334155', marginBottom: '6px', fontSize: '0.73rem', fontStyle: 'italic', maxHeight: '60px', overflow: 'hidden', lineHeight: 1.4 }}><i className="fa-solid fa-quote-left me-1" style={{ color: '#94a3b8', fontSize: '0.65rem' }}></i>{action.rem}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              {action.nextFollowUpDate && <span style={{ color: '#7c3aed', fontSize: '0.71rem' }}><i className="fa-solid fa-calendar-check me-1"></i>{formatFollowUp(action.nextFollowUpDate)}</span>}
              <span style={{ color: '#94a3b8', fontSize: '0.69rem', marginLeft: 'auto' }}><i className="fa-regular fa-clock me-1"></i>{formatTime(action.createdAt)}{action.actionBy?.name && action.actionBy.name !== 'Current User' && <span style={{ marginLeft: '5px', color: '#64748b' }}>· {action.actionBy.name}</span>}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Amount Total Summary Popup ────────────────────────────────────────────────
// Shows when status or source filter is active — sums quotation from all funnel leads
const AmountTotalPopup = ({ funnelLeads, filters }) => {
  const hasFilter = filters.status || filters.source || filters.callLeads;
  if (!hasFilter) return null;

  // Only count leads that have a quotation > 0
  const leadsWithAmount = funnelLeads.filter(l => l.quotation > 0);

  // Totals per status
  const wonTotal     = leadsWithAmount.filter(l => l.STATUS === 'Won').reduce((s, l) => s + (l.quotation || 0), 0);
  const ongoingTotal = leadsWithAmount.filter(l => l.STATUS === 'Ongoing').reduce((s, l) => s + (l.quotation || 0), 0);
  const pendingTotal = leadsWithAmount.filter(l => l.STATUS === 'Pending').reduce((s, l) => s + (l.quotation || 0), 0);
  const lostTotal    = leadsWithAmount.filter(l => l.STATUS === 'Lost').reduce((s, l) => s + (l.quotation || 0), 0);
  const grandTotal   = leadsWithAmount.reduce((s, l) => s + (l.quotation || 0), 0);

  const fmt = (n) => n > 0 ? '₹' + Number(n).toLocaleString('en-IN') : '—';

  // Build active filter label
  const filterParts = [];
  if (filters.status)    filterParts.push(filters.status);
  if (filters.source)    filterParts.push(filters.source);
  if (filters.callLeads) filterParts.push(filters.callLeads);
  const filterLabel = filterParts.join(' · ');

  // Status rows to show (only if that filter is not hiding them)
  const rows = [
    { label: 'Won',     amount: wonTotal,     color: '#198754', bg: '#d1e7dd', show: !filters.status || filters.status === 'Won' },
    { label: 'Ongoing', amount: ongoingTotal, color: '#0d6efd', bg: '#cfe2ff', show: !filters.status || filters.status === 'Ongoing' },
    { label: 'Pending', amount: pendingTotal, color: '#856404', bg: '#fff3cd', show: !filters.status || filters.status === 'Pending' },
    { label: 'Lost',    amount: lostTotal,    color: '#842029', bg: '#f8d7da', show: !filters.status || filters.status === 'Lost' },
  ].filter(r => r.show);

  if (grandTotal === 0 && leadsWithAmount.length === 0) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        background: '#f8f9fa', border: '1px dashed #ced4da', borderRadius: '8px',
        padding: '6px 14px', fontSize: '0.8rem', color: '#6c757d',
      }}>
        <i className="fa-solid fa-indian-rupee-sign"></i>
        <span>No quotation data for <strong>{filterLabel}</strong></span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)',
      border: '1px solid #b8d0fd',
      borderRadius: '10px',
      padding: '10px 16px',
      boxShadow: '0 2px 12px rgba(13,110,253,0.10)',
      minWidth: '260px',
      animation: 'popupFadeIn 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          background: 'linear-gradient(135deg, #0d6efd, #6f42c1)',
          color: '#fff', borderRadius: '6px', padding: '3px 10px',
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.3px',
        }}>
          <i className="fa-solid fa-filter me-1"></i>{filterLabel}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {leadsWithAmount.length} lead{leadsWithAmount.length !== 1 ? 's' : ''} with amount
        </span>
      </div>

      {/* Status breakdown */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {rows.map(r => r.amount > 0 && (
          <span key={r.label} style={{
            background: r.bg, color: r.color,
            borderRadius: '5px', padding: '3px 10px',
            fontSize: '0.75rem', fontWeight: 600,
          }}>
            {r.label}: {fmt(r.amount)}
          </span>
        ))}
      </div>

      {/* Grand total */}
      <div style={{
        borderTop: '1px solid #e2e8f0', paddingTop: '7px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
          <i className="fa-solid fa-sigma me-1" style={{ color: '#0d6efd' }}></i>Total
        </span>
        <span style={{
          fontSize: '0.92rem', fontWeight: 800,
          color: '#0d6efd', letterSpacing: '-0.3px',
        }}>
          <i className="fa-solid fa-indian-rupee-sign me-1" style={{ fontSize: '0.78rem' }}></i>
          {Number(grandTotal).toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const SalesMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);
  const [viewMode, setViewMode] = useState("table");
  const [addpop, setIsAddModalVisible] = useState(false);
  const [UpdatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [showLeadPopUp, setShowLeadPopUp] = useState(false);
  const [assignPopUpShow, setAssignPopUpShow] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [deletePopUpShow, setDeletePopUpShow] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [meetingDrawer, setMeetingDrawer] = useState(false);
  const [hoverLead, setHoverLead] = useState(null);
  const hideTimerRef = useRef(null);
  const { user } = useContext(UserContext);
  const [filters, setFilters] = useState({ status: null, date: null, callLeads: null, source: null, searchTerm: "", followUpToday: false, todayAction: false });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, totalServices: 0, limit: 20, hasNextPage: true, hasPrevPage: false });
  const itemsPerPage = 20;
  const [funnelLeads, setFunnelLeads] = useState([]);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const { data, loading, error, refetch } = useMyLeads(pagination.currentPage, itemsPerPage, filters);
  const { submitEnquiry } = useSubmitEnquiry();
  const { createLead } = useCreateLead();
  const { deleteLead } = useDeleteLead();
  const { reassignLead } = useReassignLead();
  const [allLeads, setAllLeads] = useState([]);

  const fetchAllLeadsForFunnel = useCallback(async () => {
    setFunnelLoading(true);
    try {
      const params = { page: 1, limit: 99999, ...(filters.source && { source: filters.source }), ...(filters.date && { date: filters.date }), ...(filters.status && { status: filters.status }), ...(filters.callLeads && { callLeads: filters.callLeads }), ...(filters.searchTerm && { search: filters.searchTerm }), ...(filters.followUpToday && { followUpToday: 'true' }), ...(filters.todayAction && { todayAction: 'true' }) };
      const response = await axios.get(ALL_LEADS_URL, { params, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (response.data.success) setFunnelLeads(response.data.leads || []); else setFunnelLeads([]);
    } catch (err) { setFunnelLeads([]); } finally { setFunnelLoading(false); }
  }, [filters.source, filters.date, filters.status, filters.callLeads, filters.searchTerm, filters.followUpToday, filters.todayAction]);

  useEffect(() => { fetchAllLeadsForFunnel(); }, [fetchAllLeadsForFunnel]);
  useEffect(() => { if (viewMode === "funnel") fetchAllLeadsForFunnel(); }, [viewMode]);
  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  const formatDateOnly = (dateString) => { if (!dateString) return "N/A"; const date = new Date(dateString); if (isNaN(date.getTime())) return "N/A"; return date.toLocaleDateString('en-GB'); };

  const getFollowUpStatus = (dateString, leadStatus) => {
    if (!dateString) return null; if (leadStatus === 'Won' || leadStatus === 'Lost') return null;
    const date = new Date(dateString); if (isNaN(date.getTime())) return null;
    const now = new Date();
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (date >= s && date <= e) return 'today'; if (date < s) return 'overdue'; return null;
  };

  useEffect(() => { if (data) { setPagination(prev => ({ ...prev, ...data.pagination })); if (data.leads) setAllLeads(data.leads); } if (error) toast.error(error.message || "An error occurred"); }, [data, error]);

  useEffect(() => {
    if (filters.status !== null || filters.date !== null || filters.source !== null || filters.callLeads !== null || filters.followUpToday || filters.todayAction) { setAllLeads([]); setPagination(prev => ({ ...prev, currentPage: 1 })); refetch(); }
  }, [filters.status, filters.date, filters.source, filters.callLeads, filters.followUpToday, filters.todayAction]);

  const isFollowUpTodayMode = filters.followUpToday;
  const isTodayActionMode = filters.todayAction;
  const sidebarW = isopen ? 260 : 125;

  // ── Amount total — computed from funnelLeads (all matching leads) ─────────
  const hasAmountFilter = !!(filters.status || filters.source || filters.callLeads);

  const handlePageChange = (page) => { if (page >= 1 && page <= pagination.totalPages) setPagination(prev => ({ ...prev, currentPage: page })); };
  const handleBgColor = (status) => { switch (status) { case "Won": return "badge bg-success text-white"; case "Ongoing": return "badge bg-primary text-white"; case "Pending": return "badge bg-warning text-dark"; case "Lost": return "badge bg-danger text-white"; default: return "badge bg-secondary"; } };

  const handleUpdate = (lead = null) => { if (lead && (lead.STATUS === 'Won' || lead.STATUS === 'Lost')) { toast.error(`Cannot update a "${lead.STATUS}" lead.`); return; } setSelectedLead(lead); setUpdatePopUpShow(true); };
  const handleAssign = (lead = null) => { const canAssign = user?.permissions?.includes('updateLead') || user?.user === 'company'; if (!canAssign) { toast.error("You don't have permission."); return; } if (lead && (lead.STATUS === 'Won' || lead.STATUS === 'Lost')) { toast.error(`Cannot reassign a "${lead.STATUS}" lead.`); return; } setSelectedLead(lead); setAssignPopUpShow(true); };
  const handleDelete = (leadId) => { const lead = allLeads.find(l => l._id === leadId) || funnelLeads.find(l => l._id === leadId); if (lead && (lead.STATUS === 'Won' || lead.STATUS === 'Lost')) { toast.error(`Cannot delete a "${lead.STATUS}" lead.`); return; } setSelectedLeadId(leadId); setDeletePopUpShow(true); };

  const handleDeleteConfirm = async () => { if (!selectedLeadId) return; try { toast.loading("Deleting lead..."); const res = await deleteLead(selectedLeadId); toast.dismiss(); if (res?.success) { toast.success("Lead deleted!"); setDeletePopUpShow(false); setSelectedLeadId(null); setAllLeads([]); refetch(); fetchAllLeadsForFunnel(); } else { toast.error(res?.error || "Failed"); } } catch { toast.error("Failed to delete"); } };
  const handleAssignSubmit = async (id, assignData) => { try { toast.loading("Reassigning..."); const res = await reassignLead(id, assignData); toast.dismiss(); if (res?.success) { toast.success(res?.message || "Reassigned!"); setAssignPopUpShow(false); setSelectedLead(null); refetch(); fetchAllLeadsForFunnel(); } else { toast.error(res?.error || "Failed"); } } catch { toast.error("Failed to reassign"); } };
  const handleUpdateSubmit = async (id, enquiryData) => { try { if (enquiryData) { const res = await submitEnquiry(id, enquiryData); if (res?.success) toast.success(res?.message); else toast.error(res?.error); refetch(); fetchAllLeadsForFunnel(); } } catch { toast.error("Failed"); } };
  const handleDetailsPopUpClick = (lead) => { setSelectedLead(lead); setShowLeadPopUp(true); };
  const handleMeeting = (lead) => { const freshLead = allLeads.find(l => l._id === lead._id) || funnelLeads.find(l => l._id === lead._id) || lead; setSelectedLead(freshLead); setMeetingDrawer(true); };
  const handleMeetingClose = () => { setMeetingDrawer(false); setSelectedLead(null); refetch(); fetchAllLeadsForFunnel(); };
  const handleChange = (filterType, value) => setFilters(prev => ({ ...prev, [filterType]: value || null }));
  const handleSearchChange = (e) => { setFilters(prev => ({ ...prev, searchTerm: e.target.value })); setPagination(prev => ({ ...prev, currentPage: 1 })); };
  const handleTodayFollowUpClick = () => setFilters(prev => ({ ...prev, followUpToday: true, todayAction: false, date: null, status: null, source: null, callLeads: null }));
  const handleTodayActionClick = () => setFilters(prev => ({ ...prev, todayAction: true, followUpToday: false, date: null, status: null, source: null, callLeads: null }));
  const resetSearch = () => { setFilters(prev => ({ ...prev, searchTerm: "" })); setAllLeads([]); };
  const resetFilters = () => { setFilters({ status: null, date: null, callLeads: null, source: null, searchTerm: "", followUpToday: false, todayAction: false }); setAllLeads([]); setPagination(prev => ({ ...prev, currentPage: 1 })); refetch(); };
  const handleOpenAddModal = () => setIsAddModalVisible(true);
  const handleCloseAddModal = () => setIsAddModalVisible(false);
  const handleAddLeadSubmit = async (leadData) => { toast.loading("Adding lead..."); const res = await createLead(leadData); toast.dismiss(); if (res?.success) { toast.success(res?.message || "Lead added!"); handleCloseAddModal(); setAllLeads([]); setPagination(prev => ({ ...prev, currentPage: 1 })); refetch(); fetchAllLeadsForFunnel(); } else { toast.error(res?.error || "Failed"); } };

  const showPopup = (lead) => { if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; } setHoverLead(lead); };
  const scheduleHide = () => { hideTimerRef.current = setTimeout(() => setHoverLead(null), 250); };
  const handleRowMouseEnter = (lead) => { if (!isTodayActionMode) return; const todayStr = new Date().toDateString(); const has = (lead.previousActions || []).some(a => new Date(a.createdAt).toDateString() === todayStr); if (has) showPopup(lead); };
  const handleRowMouseLeave = () => { if (isTodayActionMode) scheduleHide(); };
  const handlePopupMouseEnter = () => { if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; } };
  const handlePopupMouseLeave = () => scheduleHide();

  const canAssignLead = user?.permissions?.includes('updateLead') || user?.user === 'company';
  const canUpdateLead = user?.permissions?.includes('updateLead') || user?.user === 'company';
  const canDeleteLead = user?.permissions?.includes('deleteLead') || user?.user === 'company';

  const formatAmount = (val) => { if (!val || val <= 0) return null; return '₹' + Number(val).toLocaleString('en-IN'); };

  return (
    <>
      {(loading || funnelLoading) && (<div className="overlay"><span className="loader"></span></div>)}
      {isTodayActionMode && hoverLead && (<TodayActionHoverPopup lead={hoverLead} sidebarW={sidebarW} onMouseEnter={handlePopupMouseEnter} onMouseLeave={handlePopupMouseLeave} />)}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="SalesMasterGrid" />
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                <div className="row px-2 py-1 mb-3">
                  <div className="col-12 col-lg-4"><h5 className="text-white py-2">My Sales Dashboard</h5></div>
                  <div className="col-12 col-lg-8 d-flex align-items-center justify-content-end gap-2 pe-4">
                    <button type="button" className={`btn btn-sm ${isTodayActionMode ? "btn-warning" : "btn-outline-warning"}`} onClick={handleTodayActionClick} title="Show leads with actions done today"><i className="fa-solid fa-bolt me-1"></i>Today's Action</button>
                    <div className="btn-group" role="group">
                      <button type="button" className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setViewMode("table")} title="Table View"><i className="fa-solid fa-table-list"></i> Table</button>
                      <button type="button" className={`btn btn-sm ${viewMode === "funnel" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setViewMode("funnel")} title="Funnel View"><i className="fa-solid fa-filter"></i> Funnel</button>
                    </div>
                    {(user?.permissions?.includes("createLead") || user?.user === 'company') && (<button onClick={handleOpenAddModal} type="button" className="btn btn-primary btn-sm"><i className="fa-solid fa-plus"></i> Add Lead</button>)}
                  </div>
                </div>

                <SalesDashboardCards allLeadsCount={data?.leadCounts?.allLeadsCount || 0} ongogingCount={data?.leadCounts?.ongogingCount || 0} winCount={data?.leadCounts?.winCount || 0} pendingCount={data?.leadCounts?.pendingCount || 0} lostCount={data?.leadCounts?.lostCount || 0} todayCount={data?.leadCounts?.todaysFollowUpCount || 0} hotleadsCount={data?.leadCounts?.hotleadsCount || 0} warmLeadsCount={data?.leadCounts?.warmLeadsCount || 0} coldLeadsCount={data?.leadCounts?.coldLeadsCount || 0} invalidLeadsCount={data?.leadCounts?.invalidLeadsCount || 0} onTodayFollowUpClick={handleTodayFollowUpClick} />

                {data?.quotationFunnel && (<div className="row p-2 m-1"><div className="col-12"><SalesQuotationFunnel totalQuotationAmount={data.quotationFunnel.totalActiveQuotationAmount || 0} activeQuotationLeads={data.quotationFunnel.activeQuotationLeads || []} wonAmount={data.quotationFunnel.totalWonAmount || 0} lostAmount={data.quotationFunnel.totalLostAmount || 0} /></div></div>)}

                {/* ── Filter bar ────────────────────────────────────────── */}
                <div className="row align-items-center p-3 m-1 bg-light rounded mb-2">
                  <div className="col-12 col-lg-6">
                    <div className="input-group">
                      <input type="text" className="form-control" placeholder="Search by Mobile Number or Company Name..." value={filters.searchTerm || ""} onChange={handleSearchChange} />
                      {filters.searchTerm && (<button className="btn btn-outline-secondary" type="button" onClick={resetSearch}><i className="fa-solid fa-times"></i></button>)}
                      <button className="btn btn-primary" type="button"><i className="fa-solid fa-search"></i></button>
                    </div>
                    {isFollowUpTodayMode && (<div className="mt-2"><small className="text-info"><i className="fa-solid fa-info-circle"></i> Showing leads with follow-up scheduled for today</small></div>)}
                    {isTodayActionMode && (<div className="mt-2"><small className="text-warning"><i className="fa-solid fa-bolt me-1"></i>Showing leads with actions submitted today — hover a row to see details</small></div>)}
                  </div>
                  <div className="col-12 col-lg-6 ms-auto text-end">
                    <div className="row g-2">
                      <div className="col"><input type="date" className="form-control" name="date" onChange={e => handleChange('date', e.target.value)} value={filters.date || ""} disabled={isFollowUpTodayMode || isTodayActionMode} /></div>
                      <div className="col"><select className="form-select" name="callLeads" onChange={e => handleChange('callLeads', e.target.value)} value={filters.callLeads || ""} disabled={isFollowUpTodayMode || isTodayActionMode}><option value="">Leads...</option><option value="Hot Leads">Hot Leads</option><option value="Warm Leads">Warm Leads</option><option value="Cold Leads">Cold Leads</option><option value="Invalid Leads">Invalid Leads</option></select></div>
                      <div className="col"><select className="form-select" name="source" onChange={e => handleChange('source', e.target.value)} value={filters.source || ""} disabled={isFollowUpTodayMode || isTodayActionMode}><option value="">Sources...</option><option value="Direct">Direct</option><option value="IndiaMart">IndiaMart</option><option value="TradeIndia">TradeIndia</option><option value="Facebook">Facebook</option><option value="LinkedIn">LinkedIn</option><option value="Google">Google</option><option value="Tender">Tender</option><option value="Exhibitions">Exhibitions</option><option value="JustDial">JustDial</option><option value="Twitter">Twitter</option><option value="YouTube">YouTube</option><option value="WhatsApp">WhatsApp</option><option value="Referral">Referral</option><option value="Email Campaign">Email Campaign</option><option value="Cold Call">Cold Call</option><option value="Website">Website</option><option value="Walk-In">Walk-In</option><option value="Other">Other</option></select></div>
                      <div className="col"><select className="form-select" name="status" onChange={e => handleChange('status', e.target.value)} value={filters.status || ""} disabled={isFollowUpTodayMode || isTodayActionMode}><option value="">Status...</option><option value="Won">Won</option><option value="Ongoing">Ongoing</option><option value="Pending">Pending</option><option value="Lost">Lost</option></select></div>
                      <div className="col"><button className="btn btn-outline-secondary w-100" type="button" onClick={resetFilters} title="Reset all filters"><i className="fa-solid fa-filter-circle-xmark"></i> Reset</button></div>
                    </div>
                  </div>
                </div>

                {/* ── Amount Total Popup — shows below filter bar when filter is active ── */}
                {hasAmountFilter && !funnelLoading && (
                  <div className="row px-3 mb-2" style={{ marginTop: '-2px' }}>
                    <div className="col-12 d-flex align-items-center gap-3 flex-wrap">
                      <AmountTotalPopup funnelLeads={funnelLeads} filters={filters} />
                      <small className="text-muted" style={{ fontSize: '0.73rem' }}>
                        <i className="fa-solid fa-circle-info me-1"></i>
                        Total across all {funnelLeads.length} filtered lead{funnelLeads.length !== 1 ? 's' : ''}
                      </small>
                    </div>
                  </div>
                )}

                {viewMode === "funnel" && (
                  <div className="row bg-white p-3 m-1 border rounded shadow-sm">
                    <div className="col-12" style={{ overflowX: "auto" }}>
                      {funnelLoading ? (<div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}><div className="spinner-border text-primary mb-3" role="status" style={{ width: 40, height: 40 }}></div><div style={{ fontSize: 14 }}>Loading all leads for funnel...</div></div>) : (<SalesFunnelView leads={funnelLeads} onView={handleDetailsPopUpClick} onUpdate={handleUpdate} onAssign={handleAssign} onDelete={handleDelete} onMeeting={handleMeeting} canUpdate={canUpdateLead} canAssign={canAssignLead} canDelete={canDeleteLead} />)}
                    </div>
                  </div>
                )}

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
                              <th style={{ width: '140px' }}>Amount</th>
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
                                const isToday = followUpStatus === 'today';
                                const isOverdue = followUpStatus === 'overdue';
                                const todayStr = new Date().toDateString();
                                const hasTodayAction = isTodayActionMode && (lead.previousActions || []).some(a => new Date(a.createdAt).toDateString() === todayStr);
                                const hasAmount = lead.quotation > 0;
                                return (
                                  <tr key={lead._id} className={hasTodayAction ? "row-today-action" : isToday ? "row-today-followup" : isOverdue ? "row-overdue-followup" : ""} onMouseEnter={() => handleRowMouseEnter(lead)} onMouseLeave={handleRowMouseLeave} style={isTodayActionMode ? { cursor: 'default' } : {}}>
                                    <td className="text-center">{(pagination.currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <span>{lead.SENDER_COMPANY || "Not available."}</span>
                                        {hasTodayAction && (<span className="badge bg-warning text-dark ms-2 badge-today-action"><i className="fa-solid fa-bolt me-1"></i>ACTION TODAY</span>)}
                                        {!hasTodayAction && isToday && (<span className="badge bg-danger text-white ms-2 badge-pulse-red"><i className="fa-solid fa-bell"></i> TODAY FOLLOWUP</span>)}
                                        {!hasTodayAction && isOverdue && (<span className="badge bg-danger text-white ms-2 badge-pulse-dark-red"><i className="fa-solid fa-triangle-exclamation"></i> OVERDUE</span>)}
                                      </div>
                                    </td>
                                    <td className="text-start">{lead.SENDER_NAME || "Not available."}</td>
                                    <td className="text-start">{lead.QUERY_PRODUCT_NAME || "Not available."}</td>
                                    <td><small className="text-muted">{lead.SOURCE}</small></td>
                                    <td><small className="text-muted">{lead.SENDER_MOBILE || "Not available."}</small></td>
                                    <td>
                                      {hasAmount ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px rgba(34,197,94,0.6)', flexShrink: 0, animation: 'greenDotPulse 2s infinite' }}></span>
                                          <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>{formatAmount(lead.quotation)}</span>
                                        </div>
                                      ) : (
                                        <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                                      )}
                                    </td>
                                    <td><small className="text-muted">{formatDateforTaskUpdate(lead.createdAt)}</small></td>
                                    <td>
                                      {lead.nextFollowUpDate ? (
                                        <span className={isToday ? "fw-bold text-danger date-glow-red" : isOverdue ? "fw-bold text-danger date-glow-dark-red" : "text-muted"}>{formatDateOnly(lead.nextFollowUpDate)}</span>
                                      ) : (<span className="text-muted">Not set</span>)}
                                    </td>
                                    <td><span className={handleBgColor(lead.STATUS)}>{lead.STATUS}</span></td>
                                    <td className="text-center">
                                      {lead.STATUS === 'Won' || lead.STATUS === 'Lost' ? (
                                        <div className="btn-group" role="group">
                                          <button className="btn btn-sm btn-outline-info" onClick={() => handleDetailsPopUpClick(lead)} title="View"><i className="fa-solid fa-eye"></i></button>
                                          <button className="btn btn-sm btn-outline-primary" onClick={() => handleMeeting(lead)} title="Schedule Meeting"><i className="fa-solid fa-video"></i></button>
                                        </div>
                                      ) : (
                                        <div className="btn-group" role="group">
                                          {canUpdateLead && (<button className="btn btn-sm btn-outline-success" onClick={() => handleUpdate(lead)} title="Update"><i className="fa-solid fa-pen"></i></button>)}
                                          {canAssignLead && (<button className="btn btn-sm btn-outline-warning" onClick={() => handleAssign(lead)} title="Reassign"><i className="fa-solid fa-share"></i></button>)}
                                          <button className="btn btn-sm btn-outline-primary" onClick={() => handleMeeting(lead)} title="Schedule Meeting"><i className="fa-solid fa-video"></i></button>
                                          {lead.SOURCE === 'Direct' && canDeleteLead && (<button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(lead._id)} title="Delete"><i className="fa-solid fa-trash"></i></button>)}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr><td colSpan="11" className="text-center py-4"><div className="text-muted"><i className="fa-solid fa-inbox fa-2x mb-2"></i><p className="mb-0">No leads found.</p></div></td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {viewMode === "table" && !loading && pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-3">
                    <nav><ul className="pagination mb-0">
                      <li className={`page-item ${!pagination.hasPrevPage ? 'disabled' : ''}`}><button className="page-link" onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage}>First</button></li>
                      <li className={`page-item ${!pagination.hasPrevPage ? 'disabled' : ''}`}><button className="page-link" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage}>Previous</button></li>
                      {(() => { const pageNumbers = []; const max = 5; if (pagination.totalPages <= max) { for (let i = 1; i <= pagination.totalPages; i++) pageNumbers.push(i); } else { let s = Math.max(1, pagination.currentPage - 2); let e = Math.min(pagination.totalPages, s + max - 1); if (e - s < max - 1) s = Math.max(1, e - max + 1); for (let i = s; i <= e; i++) pageNumbers.push(i); } return pageNumbers.map(n => (<li key={n} className={`page-item ${pagination.currentPage === n ? 'active' : ''}`}><button className="page-link" onClick={() => handlePageChange(n)}>{n}</button></li>)); })()}
                      <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}><button className="page-link" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.hasNextPage}>Next</button></li>
                      <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}><button className="page-link" onClick={() => handlePageChange(pagination.totalPages)} disabled={!pagination.hasNextPage}>Last</button></li>
                    </ul></nav>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {addpop && <AddSalesLeadPopUp onAddLead={handleAddLeadSubmit} onClose={handleCloseAddModal} />}
      {UpdatePopUpShow && selectedLead && (<UpdateSalesPopUp selectedLead={selectedLead} onUpdate={handleUpdateSubmit} isCompany={user.user === 'company'} onClose={() => { setUpdatePopUpShow(false); setSelectedLead(null); }} />)}
      {assignPopUpShow && selectedLead && (<AssignSalesLeadPopUp selectedLead={selectedLead} onUpdate={handleAssignSubmit} onClose={() => { setAssignPopUpShow(false); setSelectedLead(null); }} />)}
      {deletePopUpShow && (<DeletePopUP message={"Are you sure you want to delete this lead?"} heading={"Delete Lead"} cancelBtnCallBack={() => setDeletePopUpShow(false)} confirmBtnCallBack={handleDeleteConfirm} />)}
      {showLeadPopUp && selectedLead && (<ViewSalesLeadPopUp closePopUp={() => { setShowLeadPopUp(false); setSelectedLead(null); }} selectedLead={selectedLead} />)}
      {meetingDrawer && selectedLead && <MeetingDrawer lead={selectedLead} onClose={handleMeetingClose} />}
      <ChatbotDrawer page="sales" />

      <style jsx>{`
        .row-today-followup { animation: blinkRed 1s infinite; }
        @keyframes blinkRed { 0%,100% { background-color: rgba(255,50,50,0.08); box-shadow: 0 0 4px rgba(255,0,0,0.25); } 50% { background-color: rgba(255,150,150,0.45); box-shadow: 0 0 18px rgba(255,0,0,0.6); } }
        .badge-pulse-red { animation: badgeRed 1.5s infinite; box-shadow: 0 0 8px rgba(255,0,0,0.6); font-size: .72rem; }
        @keyframes badgeRed { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        .date-glow-red { animation: glowRed 1.2s infinite; }
        @keyframes glowRed { 0%,100% { text-shadow: 0 0 4px rgba(255,0,0,0.5); } 50% { text-shadow: 0 0 12px rgba(255,0,0,0.9); } }
        .row-overdue-followup { animation: blinkDarkRed 1.2s infinite; }
        @keyframes blinkDarkRed { 0%,100% { background-color: rgba(139,0,0,0.10); box-shadow: 0 0 4px rgba(139,0,0,0.3); } 50% { background-color: rgba(139,0,0,0.35); box-shadow: 0 0 16px rgba(139,0,0,0.7); } }
        .badge-pulse-dark-red { animation: badgeDarkRed 1.5s infinite; box-shadow: 0 0 8px rgba(139,0,0,0.6); font-size: .72rem; }
        @keyframes badgeDarkRed { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        .date-glow-dark-red { animation: glowDarkRed 1.2s infinite; }
        @keyframes glowDarkRed { 0%,100% { text-shadow: 0 0 4px rgba(139,0,0,0.5); } 50% { text-shadow: 0 0 12px rgba(139,0,0,0.9); } }
        .table th { border-top: none; font-weight: 600; font-size: .875rem; white-space: nowrap; }
        .table td { vertical-align: middle; font-size: .875rem; }
        .btn-group .btn { padding: .25rem .5rem; font-size: .75rem; }
        .table-hover tbody tr:hover { background-color: rgba(0,0,0,0.05); }
        .row-today-followup:hover { background-color: rgba(255,100,100,0.2) !important; }
        .row-overdue-followup:hover { background-color: rgba(139,0,0,0.2) !important; }
        .row-today-action { background-color: rgba(255,193,7,0.08) !important; box-shadow: inset 3px 0 0 #ffc107; }
        .row-today-action:hover { background-color: rgba(255,193,7,0.18) !important; }
        .badge-today-action { font-size: .7rem; animation: badgeActionPulse 2s infinite; }
        @keyframes badgeActionPulse { 0%,100% { transform: scale(1); box-shadow: 0 0 0 rgba(255,193,7,0.5); } 50% { transform: scale(1.05); box-shadow: 0 0 8px rgba(255,193,7,0.8); } }
        @keyframes popupFadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.96); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
        @keyframes greenDotPulse { 0%,100% { box-shadow: 0 0 4px rgba(34,197,94,0.4); } 50% { box-shadow: 0 0 10px rgba(34,197,94,0.8); } }
      `}</style>
    </>
  );
};

export default SalesMasterGrid;