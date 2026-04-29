import { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import { formatDateforTaskUpdate } from "../../../../utils/formatDate";
import SalesDashboardCards from "../SalesMaster/SalesDashboardCards";
import SalesQuotationFunnel from "../SalesMaster/SalesQuotationFunnel";
import { UserContext } from "../../../../context/UserContext";
import ViewSalesLeadPopUp from "../../CommonPopUp/ViewSalesLeadPopUp";
import useSalesManagers from "../../../../hooks/leads/useSalesManagers";
import useSalesManagerTeam from "../../../../hooks/leads/useSalesManagerTeam";
import useDeleteLead from "../../../../hooks/leads/useDeleteLead";
import useSubmitEnquiry from "../../../../hooks/leads/useSubmitEnquiry";
import SalesFunnelView from "../SalesMaster/PopUp/SalesFunnelView";
import ChatbotDrawer from "../SalesMaster/PopUp/ChatbotDrawer";
import UpdateSalesPopUp from "../SalesMaster/PopUp/UpdateSalesPopUp";
// ── NEW IMPORT ──
import TransferOwnershipPopUp from "../SalesMaster/PopUp/TransferOwnershipPopUp";

const ALL_LEADS_URL = `${process.env.REACT_APP_API_URL}/api/leads/all-leads`;
const EMP_LEADS_URL = `${process.env.REACT_APP_API_URL}/api/leads/employee-leads`;

// ── Amount Total Summary Popup ────────────────────────────────────────────────
const AmountTotalPopup = ({ funnelLeads, filters }) => {
  const hasFilter = filters.status || filters.source || filters.callLeads;
  if (!hasFilter) return null;

  const leadsWithAmount = funnelLeads.filter(l => l.quotation > 0);
  const wonTotal     = leadsWithAmount.filter(l => l.STATUS === 'Won').reduce((s, l) => s + (l.quotation || 0), 0);
  const ongoingTotal = leadsWithAmount.filter(l => l.STATUS === 'Ongoing').reduce((s, l) => s + (l.quotation || 0), 0);
  const pendingTotal = leadsWithAmount.filter(l => l.STATUS === 'Pending').reduce((s, l) => s + (l.quotation || 0), 0);
  const lostTotal    = leadsWithAmount.filter(l => l.STATUS === 'Lost').reduce((s, l) => s + (l.quotation || 0), 0);
  const grandTotal   = leadsWithAmount.reduce((s, l) => s + (l.quotation || 0), 0);

  const fmt = (n) => n > 0 ? '₹' + Number(n).toLocaleString('en-IN') : '—';
  const filterParts = [];
  if (filters.status)    filterParts.push(filters.status);
  if (filters.source)    filterParts.push(filters.source);
  if (filters.callLeads) filterParts.push(filters.callLeads);
  const filterLabel = filterParts.join(' · ');

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
      border: '1px solid #b8d0fd', borderRadius: '10px',
      padding: '10px 16px', boxShadow: '0 2px 12px rgba(13,110,253,0.10)',
      minWidth: '260px', animation: 'amountFadeIn 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          background: 'linear-gradient(135deg, #0d6efd, #6f42c1)', color: '#fff',
          borderRadius: '6px', padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700,
        }}>
          <i className="fa-solid fa-filter me-1"></i>{filterLabel}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {leadsWithAmount.length} lead{leadsWithAmount.length !== 1 ? 's' : ''} with amount
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {rows.map(r => r.amount > 0 && (
          <span key={r.label} style={{
            background: r.bg, color: r.color,
            borderRadius: '5px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600,
          }}>
            {r.label}: {fmt(r.amount)}
          </span>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '7px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
          <i className="fa-solid fa-sigma me-1" style={{ color: '#0d6efd' }}></i>Total
        </span>
        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0d6efd' }}>
          <i className="fa-solid fa-indian-rupee-sign me-1" style={{ fontSize: '0.78rem' }}></i>
          {Number(grandTotal).toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const SalesManagerMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [viewMode,          setViewMode]          = useState("table");
  const [showLeadPopUp,     setShowLeadPopUp]     = useState(false);
  const [selectedLead,      setSelectedLead]      = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete,      setLeadToDelete]      = useState(null);
  const [generatingPDF,     setGeneratingPDF]     = useState(false);
  const [UpdatePopUpShow,   setUpdatePopUpShow]   = useState(false);
  // ── NEW STATE ──
  const [transferOwnershipShow, setTransferOwnershipShow] = useState(false);

  const { user } = useContext(UserContext);

  const { managers: salesEmployees, loading: employeesLoading, refetch: refetchEmployees } = useSalesManagers();
  const [selectedEmployee, setSelectedEmployee] = useState({ _id: "all", name: "All Leads" });

  const { deleteLead, loading: deleteLoading } = useDeleteLead();
  const { submitEnquiry } = useSubmitEnquiry();

  const [filters, setFilters] = useState({
    status: null, date: null, callLeads: null, source: null, searchTerm: "",
  });

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.searchTerm), 500);
    return () => clearTimeout(t);
  }, [filters.searchTerm]);

  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 0, totalRecords: 0,
    limit: 20, hasNextPage: true, hasPrevPage: false,
  });
  const itemsPerPage = 20;

  const [funnelLeads,   setFunnelLeads]   = useState([]);
  const [funnelLoading, setFunnelLoading] = useState(false);

  const { data, loading, error, refetch } = useSalesManagerTeam(
    selectedEmployee?._id, pagination.currentPage, itemsPerPage,
    { ...filters, searchTerm: debouncedSearch }
  );

  const fetchFunnelLeads = useCallback(async () => {
    setFunnelLoading(true);
    try {
      const isAll = selectedEmployee?._id === "all";
      const url   = isAll ? ALL_LEADS_URL : `${EMP_LEADS_URL}/${selectedEmployee._id}`;
      const params = {
        page: 1, limit: 99999,
        ...(filters.source    && { source:    filters.source    }),
        ...(filters.date      && { date:      filters.date      }),
        ...(filters.status    && { status:    filters.status    }),
        ...(filters.callLeads && { callLeads: filters.callLeads }),
        ...(debouncedSearch   && { search:    debouncedSearch   }),
      };
      const response = await axios.get(url, {
        params, headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.data.success) setFunnelLeads(response.data.leads || []);
      else setFunnelLeads([]);
    } catch (err) {
      console.error("Funnel leads fetch error:", err);
      setFunnelLeads([]);
    } finally { setFunnelLoading(false); }
  }, [selectedEmployee?._id, filters.source, filters.date, filters.status, filters.callLeads, debouncedSearch]);

  useEffect(() => { fetchFunnelLeads(); }, [fetchFunnelLeads]);
  useEffect(() => { if (viewMode === "funnel") fetchFunnelLeads(); }, [viewMode]);

  const formatDateOnly = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-GB");
  };

  const formatLeadTimeIST = (rawDate) => {
    if (!rawDate) return "—";
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric", timeZone:"Asia/Kolkata" })
      + " " + d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:false, timeZone:"Asia/Kolkata" });
  };

  const formatAmount = (val) => (!val || val <= 0) ? null : '₹' + Number(val).toLocaleString('en-IN');

  useEffect(() => {
    if (data) setPagination(prev => ({ ...prev, ...data.pagination }));
    if (error) toast.error(error.message || "An error occurred");
  }, [data, error]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [filters.status, filters.date, filters.source, filters.callLeads, debouncedSearch]);

  const isAllMode      = selectedEmployee._id === "all";
  const hasAmountFilter = !!(filters.status || filters.source || filters.callLeads);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages)
      setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleDetailsPopUpClick = (lead) => { setSelectedLead(lead); setShowLeadPopUp(true); };
  const handleChange = (filterType, value) => setFilters(prev => ({ ...prev, [filterType]: value || null }));
  const handleSearchChange = (e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }));

  const handleUpdate = (lead = null) => {
    if (lead && (lead.STATUS === 'Won' || lead.STATUS === 'Lost')) {
      toast.error(`Cannot update a "${lead.STATUS}" lead.`); return;
    }
    setSelectedLead(lead); setUpdatePopUpShow(true);
  };

  const handleUpdateSubmit = async (id, enquiryData) => {
    try {
      if (enquiryData) {
        const res = await submitEnquiry(id, enquiryData);
        if (res?.success) toast.success(res?.message); else toast.error(res?.error);
        refetch(); fetchFunnelLeads();
      }
    } catch { toast.error("Failed to update lead"); }
  };

  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    if (employeeId === "all") setSelectedEmployee({ _id: "all", name: "All Leads" });
    else {
      const employee = salesEmployees.find(emp => emp._id === employeeId);
      setSelectedEmployee(employee || { _id: "all", name: "All Leads" });
    }
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setFilters({ status: null, date: null, callLeads: null, source: null, searchTerm: "" });
    setDebouncedSearch("");
  };

  const resetSearch  = () => { setFilters(prev => ({ ...prev, searchTerm: "" })); setDebouncedSearch(""); };
  const resetFilters = () => {
    setFilters({ status: null, date: null, callLeads: null, source: null, searchTerm: "" });
    setDebouncedSearch(""); setPagination(prev => ({ ...prev, currentPage: 1 })); refetch();
  };

  const handleDeleteClick   = (lead) => { setLeadToDelete(lead); setShowDeleteConfirm(true); };
  const handleDeleteCancel  = () => { setShowDeleteConfirm(false); setLeadToDelete(null); };
  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;
    const result = await deleteLead(leadToDelete._id);
    if (result?.success) {
      toast.success("Lead deleted successfully");
      setShowDeleteConfirm(false); setLeadToDelete(null);
      refetch(); fetchFunnelLeads();
    } else { toast.error(result?.error || "Failed to delete lead"); }
  };

  const handleBgColor = (status) => {
    switch ((status || "").toString().trim()) {
      case "Won":     return "badge bg-success text-white";
      case "Ongoing": return "badge bg-primary text-white";
      case "Pending": return "badge bg-warning text-dark";
      case "Lost":    return "badge bg-danger text-white";
      default:        return "badge bg-secondary";
    }
  };

  const getFollowUpStatus = (dateString, leadStatus) => {
    if (!dateString || leadStatus === "Won" || leadStatus === "Lost") return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const now = new Date();
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (date >= s && date <= e) return "today";
    if (date < s) return "overdue";
    return null;
  };

  const fetchAllLeadsForPDF = async () => {
    try {
      const isAll = selectedEmployee?._id === "all";
      const url   = isAll ? ALL_LEADS_URL : `${EMP_LEADS_URL}/${selectedEmployee._id}`;
      const params = {
        page: 1, limit: 99999,
        ...(filters.source    && { source:    filters.source    }),
        ...(filters.date      && { date:      filters.date      }),
        ...(filters.status    && { status:    filters.status    }),
        ...(filters.callLeads && { callLeads: filters.callLeads }),
        ...(debouncedSearch   && { search:    debouncedSearch   }),
      };
      const response = await axios.get(url, {
        params, headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return response.data.success ? (response.data.leads || []) : [];
    } catch (err) { console.error("PDF fetch error:", err); return []; }
  };

  const handlePrintReport = async () => {
    setGeneratingPDF(true); toast.loading("Preparing report...");
    try {
      const leads = await fetchAllLeadsForPDF(); toast.dismiss();
      const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const employeeName = selectedEmployee._id === "all" ? "All Employees" : selectedEmployee.name;
      const filterSummary = [
        `Employee: ${employeeName}`,
        filters.date      ? `Date: ${filters.date}`       : null,
        filters.source    ? `Source: ${filters.source}`   : null,
        filters.status    ? `Status: ${filters.status}`   : null,
        filters.callLeads ? `Leads: ${filters.callLeads}` : null,
        debouncedSearch   ? `Search: "${debouncedSearch}"`: null,
      ].filter(Boolean).join(' | ');
      const counts = {
        total:   leads.length,
        pending: leads.filter(l => l.STATUS === 'Pending').length,
        ongoing: leads.filter(l => l.STATUS === 'Ongoing').length,
        won:     leads.filter(l => l.STATUS === 'Won').length,
        lost:    leads.filter(l => l.STATUS === 'Lost').length,
      };
      const rowsHTML = leads.map((lead, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${lead.SENDER_COMPANY || '—'}</td>
          <td>${lead.SENDER_NAME    || '—'}</td>
          <td>${lead.QUERY_PRODUCT_NAME || '—'}</td>
          <td>${lead.SOURCE || '—'}</td>
          <td>${lead.SENDER_MOBILE || '—'}</td>
          <td>${lead.quotation > 0 ? '₹' + Number(lead.quotation).toLocaleString('en-IN') : '—'}</td>
          <td style="white-space:nowrap">${formatLeadTimeIST(lead.createdAt)}</td>
          <td style="white-space:nowrap">${lead.nextFollowUpDate ? formatLeadTimeIST(lead.nextFollowUpDate) : '—'}</td>
          <td>${lead.assignedTo?.name || 'Unassigned'}</td>
          <td><span class="status-badge status-${(lead.STATUS || 'Pending').toLowerCase()}">${lead.STATUS || 'Pending'}</span></td>
        </tr>`).join('');
      const printContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Sales Manager Report</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a2e;background:#fff;}
          .report-header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);color:white;padding:22px 28px 18px;display:flex;justify-content:space-between;align-items:flex-start;}
          .header-left .title{font-size:20px;font-weight:700;letter-spacing:1px;margin-bottom:4px;}.header-left .sub{font-size:12px;opacity:.8;}
          .header-right{text-align:right;font-size:9.5px;opacity:.85;line-height:1.9;}.header-right .gen{font-size:11px;font-weight:600;opacity:1;}
          .filter-bar{background:#f0f4ff;border-left:4px solid #0f3460;padding:8px 28px;font-size:10px;color:#444;display:flex;gap:16px;flex-wrap:wrap;align-items:center;}
          .filter-bar strong{color:#0f3460;}.summary-section{padding:14px 28px 8px;}
          .section-title{font-size:11px;font-weight:700;color:#0f3460;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #0f3460;padding-bottom:4px;margin-bottom:10px;}
          .summary-cards{display:flex;gap:10px;}.s-card{flex:1;border-radius:6px;padding:10px 12px;text-align:center;border:1px solid #e0e0e0;}
          .s-card .cnt{font-size:24px;font-weight:800;line-height:1;margin-bottom:3px;}.s-card .lbl{font-size:8.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;opacity:.7;}
          .c-total{background:#e8f4fd;color:#1565C0;}.c-pending{background:#fff8e1;color:#F57F17;}.c-ongoing{background:#e3f2fd;color:#0277BD;}.c-won{background:#e8f5e9;color:#2E7D32;}.c-lost{background:#fce4ec;color:#B71C1C;}
          .table-section{padding:8px 28px 20px;}table{width:100%;border-collapse:collapse;}thead tr{background:#0f3460;color:white;}
          thead th{padding:8px 7px;text-align:left;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap;}
          tbody tr{border-bottom:1px solid #eef0f5;}tbody tr:nth-child(even){background:#f8f9ff;}tbody td{padding:6px 7px;font-size:9.5px;color:#333;vertical-align:middle;}
          .status-badge{padding:2px 7px;border-radius:10px;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;}
          .status-pending{background:#fff3cd;color:#856404;}.status-ongoing{background:#cfe2ff;color:#084298;}.status-won{background:#d1e7dd;color:#0f5132;}.status-lost{background:#f8d7da;color:#842029;}
          .report-footer{background:#f8f9ff;border-top:2px solid #0f3460;padding:10px 28px;display:flex;justify-content:space-between;font-size:9px;color:#666;}
          .confidential{color:#B71C1C;font-weight:700;font-size:9.5px;}
          @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{size:A4 landscape;margin:8mm;}}
        </style></head><body>
        <div class="report-header">
          <div class="header-left"><div class="title">&#x1F4CA; Sales Manager Report</div><div class="sub">Sales Dashboard — Lead Analysis by Employee</div></div>
          <div class="header-right"><div class="gen">Generated: ${now}</div><div>Prepared By: ${user?.name || 'System'}</div><div>Employee: ${employeeName}</div><div>Total Records: ${counts.total}</div></div>
        </div>
        <div class="filter-bar"><span><strong>Filters:</strong> ${filterSummary}</span><span><strong>Date:</strong> ${now}</span></div>
        <div class="summary-section"><div class="section-title">Executive Summary</div>
          <div class="summary-cards">
            <div class="s-card c-total"><div class="cnt">${counts.total}</div><div class="lbl">Total Leads</div></div>
            <div class="s-card c-pending"><div class="cnt">${counts.pending}</div><div class="lbl">Pending</div></div>
            <div class="s-card c-ongoing"><div class="cnt">${counts.ongoing}</div><div class="lbl">Ongoing</div></div>
            <div class="s-card c-won"><div class="cnt">${counts.won}</div><div class="lbl">Won</div></div>
            <div class="s-card c-lost"><div class="cnt">${counts.lost}</div><div class="lbl">Lost</div></div>
          </div>
        </div>
        <div class="table-section"><div class="section-title">Detailed Leads Data (${counts.total} Records)</div>
          <table><thead><tr>
            <th>#</th><th>Company Name</th><th>Contact Name</th><th>Product</th>
            <th>Source</th><th>Mobile</th><th>Amount</th>
            <th>Created Date</th><th>Follow-up Date</th><th>Assigned To</th><th>Status</th>
          </tr></thead>
          <tbody>${rowsHTML || '<tr><td colspan="11" style="text-align:center;padding:16px;color:#999;">No leads found</td></tr>'}</tbody>
          </table>
        </div>
        <div class="report-footer">
          <div><span class="confidential">CONFIDENTIAL</span> — For Internal Use Only</div>
          <div>Sales Manager Report &nbsp;|&nbsp; ${counts.total} records &nbsp;|&nbsp; ${now}</div>
        </div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
        </body></html>`;
      const pw = window.open('', '_blank', 'width=1200,height=850');
      if (!pw) { toast.error('Popup blocked! Please allow popups.'); return; }
      pw.document.write(printContent); pw.document.close();
      toast.success("Report ready — Save as PDF using Ctrl+P");
    } catch (err) {
      toast.dismiss(); toast.error("Failed to generate report."); console.error("PDF Error:", err);
    } finally { setGeneratingPDF(false); }
  };

  const isManagerWithPermissions =
    user?.permissions?.includes("viewLead") &&
    user?.permissions?.includes("viewSalesManagerMaster");

  if (!isManagerWithPermissions && user?.user !== "company") {
    return (
      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen}/>
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="SalesManagerMasterGrid"/>
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="alert alert-danger m-3">
                  <h4 className="alert-heading">Access Denied</h4>
                  <p>You don't have permission to access the Sales Manager Master page.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canUpdateLead = user?.permissions?.includes('updateLead') || user?.user === 'company';
  const canDeleteLead = user?.permissions?.includes('deleteLead') || user?.user === 'company';
  // ── NEW: only company or users with updateLead can transfer ownership ──
  const canTransferOwnership = user?.user === 'company' || user?.permissions?.includes('updateLead');
  const displayLeads  = data?.leads;
  const colSpan = isAllMode ? 12 : 11;

  return (
    <>
      {(loading || employeesLoading || deleteLoading || funnelLoading) && (
        <div className="overlay"><span className="loader"></span></div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen}/>
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="SalesManagerMasterGrid"/>
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* ── Title + view toggle + PDF + Transfer Ownership ── */}
                <div className="row px-2 py-1 mb-3">
                  <div className="col-12 col-lg-4">
                    <h5 className="text-white py-2">Sales Manager Dashboard</h5>
                  </div>
                  <div className="col-12 col-lg-8 d-flex align-items-center justify-content-end gap-2 pe-4">
                    <button
                      className="btn btn-danger btn-sm d-flex align-items-center gap-2"
                      onClick={handlePrintReport} disabled={generatingPDF}
                      style={{ borderRadius:'6px', fontWeight:600, minWidth:160 }}
                    >
                      {generatingPDF
                        ? <><span className="spinner-border spinner-border-sm" role="status"></span> Generating...</>
                        : <><i className="fa-solid fa-file-pdf"></i> Download PDF</>}
                    </button>

                    {/* ── NEW: Transfer Ownership Button ── */}
                    {canTransferOwnership && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-info"
                        onClick={() => setTransferOwnershipShow(true)}
                        title="Transfer lead ownership from one employee to another"
                      >
                        <i className="fa-solid fa-people-arrows me-1"></i>Transfer Ownership
                      </button>
                    )}

                    <div className="btn-group" role="group">
                      <button type="button"
                        className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => setViewMode("table")} title="Table View">
                        <i className="fa-solid fa-table-list"></i> Table
                      </button>
                      <button type="button"
                        className={`btn btn-sm ${viewMode === "funnel" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => setViewMode("funnel")} title="Funnel View">
                        <i className="fa-solid fa-filter"></i> Funnel
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Employee selector ── */}
                <div className="row align-items-center p-3 m-1 bg-light rounded mb-3">
                  <div className="col-12 col-lg-5 mb-2 mb-lg-0">
                    <label className="form-label fw-semibold mb-1">
                      <i className="fa-solid fa-user-tie me-2 text-primary"></i>Select Sales Employee
                    </label>
                    <select className="form-select" value={selectedEmployee?._id || "all"} onChange={handleEmployeeSelect}>
                      <option value="all">— All Leads —</option>
                      {salesEmployees.map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.name} — {emp.department?.name || "N/A"}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedEmployee && data && (
                  <>
                    {/* ── Dashboard Cards ── */}
                    <SalesDashboardCards
                      allLeadsCount={data.leadCounts?.allLeadsCount || 0}
                      ongogingCount={data.leadCounts?.ongoingCount  || 0}
                      winCount={data.leadCounts?.wonCount           || 0}
                      pendingCount={data.leadCounts?.pendingCount   || 0}
                      lostCount={data.leadCounts?.lostCount         || 0}
                      todayCount={data.leadCounts?.todaysFollowUpCount || 0}
                      hotleadsCount={data.leadCounts?.hotLeadsCount    || 0}
                      warmLeadsCount={data.leadCounts?.warmLeadsCount  || 0}
                      coldLeadsCount={data.leadCounts?.coldLeadsCount  || 0}
                      invalidLeadsCount={data.leadCounts?.invalidLeadsCount || 0}
                    />

                    {/* ── Quotation Funnel ── */}
                    {data.quotationFunnel && (
                      <div className="row p-2 m-1"><div className="col-12">
                        <SalesQuotationFunnel
                          totalQuotationAmount={data.quotationFunnel.totalActiveQuotationAmount || 0}
                          activeQuotationLeads={data.quotationFunnel.activeQuotationLeads || []}
                          wonAmount={data.quotationFunnel.totalWonAmount   || 0}
                          lostAmount={data.quotationFunnel.totalLostAmount || 0}
                        />
                      </div></div>
                    )}

                    {/* ── Filters ── */}
                    <div className="row align-items-center p-3 m-1 bg-light rounded mb-2">
                      <div className="col-12 col-lg-6">
                        <div className="input-group">
                          <input type="text" className="form-control"
                            placeholder="Search company, mobile, contact, assigned to..."
                            value={filters.searchTerm || ""} onChange={handleSearchChange} />
                          {filters.searchTerm && (
                            <button className="btn btn-outline-secondary" type="button" onClick={resetSearch}>
                              <i className="fa-solid fa-times"></i>
                            </button>
                          )}
                          <button className="btn btn-primary" type="button"><i className="fa-solid fa-search"></i></button>
                        </div>
                        {debouncedSearch && (
                          <small className="text-info mt-1 d-block">
                            <i className="fa-solid fa-info-circle me-1"></i>
                            Searching for "<strong>{debouncedSearch}</strong>"
                          </small>
                        )}
                      </div>
                      <div className="col-12 col-lg-6 ms-auto text-end">
                        <div className="row g-2">
                          <div className="col">
                            <input type="date" className="form-control"
                              onChange={e => handleChange("date", e.target.value)} value={filters.date || ""}/>
                          </div>
                          <div className="col">
                            <select className="form-select"
                              onChange={e => handleChange("callLeads", e.target.value)} value={filters.callLeads || ""}>
                              <option value="">Leads...</option>
                              <option value="Hot Leads">Hot Leads</option>
                              <option value="Warm Leads">Warm Leads</option>
                              <option value="Cold Leads">Cold Leads</option>
                              <option value="Invalid Leads">Invalid Leads</option>
                            </select>
                          </div>
                          <div className="col">
                            <select className="form-select"
                              onChange={e => handleChange("source", e.target.value)} value={filters.source || ""}>
                              <option value="">Sources...</option>
                              <option value="Direct">Direct</option>
                              <option value="IndiaMart">IndiaMart</option>
                              <option value="TradeIndia">TradeIndia</option>
                              <option value="Facebook">Facebook</option>
                              <option value="LinkedIn">LinkedIn</option>
                              <option value="Google">Google</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="col">
                            <select className="form-select"
                              onChange={e => handleChange("status", e.target.value)} value={filters.status || ""}>
                              <option value="">Status...</option>
                              <option value="Won">Won</option>
                              <option value="Ongoing">Ongoing</option>
                              <option value="Pending">Pending</option>
                              <option value="Lost">Lost</option>
                            </select>
                          </div>
                          <div className="col">
                            <button className="btn btn-outline-secondary w-100" type="button" onClick={resetFilters}>
                              <i className="fa-solid fa-filter-circle-xmark"></i> Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Amount Total Popup ── */}
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

                    {/* ── Funnel View ── */}
                    {viewMode === "funnel" && (
                      <div className="row bg-white p-3 m-1 border rounded shadow-sm">
                        <div className="col-12" style={{ overflowX:"auto" }}>
                          {funnelLoading ? (
                            <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>
                              <div className="spinner-border text-primary mb-3" role="status" style={{ width:40, height:40 }}></div>
                              <div style={{ fontSize:14 }}>Loading all leads for funnel...</div>
                            </div>
                          ) : (
                            <SalesFunnelView
                              leads={funnelLeads}
                              onView={handleDetailsPopUpClick}
                              onUpdate={handleUpdate}
                              onAssign={() => {}}
                              onDelete={() => {}}
                              canUpdate={canUpdateLead}
                              canAssign={false}
                              canDelete={false}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Table View ── */}
                    {viewMode === "table" && (
                      <div className="row bg-white p-3 m-1 border rounded shadow-sm">
                        <div className="col-12">
                          <div className="table-responsive">
                            <table className="table table-hover table-striped">
                              <thead className="table-dark">
                                <tr>
                                  <th className="text-center" style={{ width:"60px" }}>Sr.No</th>
                                  <th style={{ minWidth:"150px" }}>Company Name</th>
                                  <th style={{ minWidth:"120px" }} className="text-start">Contact Name</th>
                                  <th style={{ minWidth:"120px" }} className="text-start">Product</th>
                                  <th style={{ width:"100px" }}>Source</th>
                                  <th style={{ width:"120px" }}>Mobile</th>
                                  <th style={{ width:"140px" }}>Amount</th>
                                  <th style={{ width:"120px" }}>Created Date</th>
                                  <th style={{ width:"120px" }}>Follow-up Date</th>
                                  <th style={{ width:"80px" }}>Status</th>
                                  {isAllMode && <th style={{ width:"120px" }}>Assigned To</th>}
                                  <th className="text-center" style={{ width:"130px" }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {displayLeads?.length > 0 ? (
                                  displayLeads.map((lead, index) => {
                                    const followUpStatus = getFollowUpStatus(lead.nextFollowUpDate, lead.STATUS);
                                    const isToday    = followUpStatus === "today";
                                    const isOverdue  = followUpStatus === "overdue";
                                    const isFinalized = lead.STATUS === 'Won' || lead.STATUS === 'Lost';
                                    const hasAmount  = lead.quotation > 0;

                                    return (
                                      <tr key={lead._id} className={isToday ? "row-today-followup" : isOverdue ? "row-overdue-followup" : ""}>
                                        <td className="text-center">{(pagination.currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td>
                                          <div className="d-flex align-items-center">
                                            <span>{lead.SENDER_COMPANY || "Not available."}</span>
                                            {isToday   && <span className="badge bg-danger text-white ms-2 badge-pulse-red"><i className="fa-solid fa-bell"></i> TODAY FOLLOWUP</span>}
                                            {isOverdue && <span className="badge bg-danger text-white ms-2 badge-pulse-dark-red"><i className="fa-solid fa-triangle-exclamation"></i> OVERDUE</span>}
                                          </div>
                                        </td>
                                        <td className="text-start">{lead.SENDER_NAME || "Not available."}</td>
                                        <td className="text-start">{lead.QUERY_PRODUCT_NAME || "Not available."}</td>
                                        <td><small className="text-muted">{lead.SOURCE}</small></td>
                                        <td><small className="text-muted">{lead.SENDER_MOBILE || "Not available."}</small></td>
                                        <td>
                                          {hasAmount ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span style={{
                                                width: '9px', height: '9px', borderRadius: '50%',
                                                background: '#22c55e', display: 'inline-block',
                                                boxShadow: '0 0 8px rgba(34,197,94,0.6)', flexShrink: 0,
                                                animation: 'greenDotPulse 2s infinite',
                                              }}></span>
                                              <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                                                {formatAmount(lead.quotation)}
                                              </span>
                                            </div>
                                          ) : (
                                            <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                                          )}
                                        </td>
                                        <td><small className="text-muted">{formatDateforTaskUpdate(lead.createdAt)}</small></td>
                                        <td>
                                          {lead.nextFollowUpDate ? (
                                            <span className={isToday ? "fw-bold text-danger date-glow-red" : isOverdue ? "fw-bold text-danger date-glow-dark-red" : "text-muted"}>
                                              {formatDateOnly(lead.nextFollowUpDate)}
                                            </span>
                                          ) : <span className="text-muted">Not set</span>}
                                        </td>
                                        <td><span className={handleBgColor(lead.STATUS)}>{lead.STATUS || "N/A"}</span></td>
                                        {isAllMode && <td><small className="text-muted">{lead.assignedTo?.name || "Not assigned"}</small></td>}
                                        <td className="text-center">
                                          <div className="d-flex justify-content-center gap-1">
                                            <button className="btn btn-sm btn-outline-info" onClick={() => handleDetailsPopUpClick(lead)} title="View">
                                              <i className="fa-solid fa-eye"></i>
                                            </button>
                                            {canUpdateLead && !isFinalized && (
                                              <button className="btn btn-sm btn-outline-success" onClick={() => handleUpdate(lead)} title="Update Lead">
                                                <i className="fa-solid fa-pen"></i>
                                              </button>
                                            )}
                                            {canDeleteLead && (
                                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteClick(lead)} title="Delete">
                                                <i className="fa-solid fa-trash"></i>
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={colSpan} className="text-center py-4">
                                      <div className="text-muted">
                                        <i className="fa-solid fa-inbox fa-2x mb-2"></i>
                                        <p className="mb-0">{debouncedSearch ? `No leads found for "${debouncedSearch}"` : "No leads found."}</p>
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
                        <nav><ul className="pagination mb-0">
                          <li className={`page-item ${!pagination.hasPrevPage ? "disabled" : ""}`}>
                            <button className="page-link" onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage}>First</button>
                          </li>
                          <li className={`page-item ${!pagination.hasPrevPage ? "disabled" : ""}`}>
                            <button className="page-link" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage}>Previous</button>
                          </li>
                          {(() => {
                            const pages = []; const max = 5;
                            let start = Math.max(1, pagination.currentPage - 2);
                            let end   = Math.min(pagination.totalPages, start + max - 1);
                            if (end - start < max - 1) start = Math.max(1, end - max + 1);
                            for (let i = start; i <= end; i++) pages.push(i);
                            return pages.map(n => (
                              <li key={n} className={`page-item ${pagination.currentPage === n ? "active" : ""}`}>
                                <button className="page-link" onClick={() => handlePageChange(n)}>{n}</button>
                              </li>
                            ));
                          })()}
                          <li className={`page-item ${!pagination.hasNextPage ? "disabled" : ""}`}>
                            <button className="page-link" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.hasNextPage}>Next</button>
                          </li>
                          <li className={`page-item ${!pagination.hasNextPage ? "disabled" : ""}`}>
                            <button className="page-link" onClick={() => handlePageChange(pagination.totalPages)} disabled={!pagination.hasNextPage}>Last</button>
                          </li>
                        </ul></nav>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Popups ── */}
      {showLeadPopUp && selectedLead && (
        <ViewSalesLeadPopUp closePopUp={() => { setShowLeadPopUp(false); setSelectedLead(null); }} selectedLead={selectedLead}/>
      )}

      {UpdatePopUpShow && selectedLead && (
        <UpdateSalesPopUp
          selectedLead={selectedLead}
          onUpdate={handleUpdateSubmit}
          isCompany={user?.user === 'company'}
          onClose={() => { setUpdatePopUpShow(false); setSelectedLead(null); }}
        />
      )}

      {showDeleteConfirm && leadToDelete && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor:"rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-danger">
                <h5 className="modal-title text-danger">
                  <i className="fa-solid fa-triangle-exclamation me-2"></i>Delete Lead
                </h5>
                <button type="button" className="btn-close" onClick={handleDeleteCancel}></button>
              </div>
              <div className="modal-body">
                <p className="mb-1">Are you sure you want to delete this lead?</p>
                <div className="bg-light rounded p-3 mt-2">
                  <p className="mb-1"><strong>Company:</strong> {leadToDelete.SENDER_COMPANY || "N/A"}</p>
                  <p className="mb-1"><strong>Contact:</strong> {leadToDelete.SENDER_NAME    || "N/A"}</p>
                  <p className="mb-0"><strong>Mobile:</strong>  {leadToDelete.SENDER_MOBILE  || "N/A"}</p>
                </div>
                <p className="text-danger mt-3 mb-0 small">
                  <i className="fa-solid fa-circle-info me-1"></i>This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleDeleteCancel}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm} disabled={deleteLoading}>
                  {deleteLoading
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Deleting...</>
                    : <><i className="fa-solid fa-trash me-1"></i>Delete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW: Transfer Ownership Popup ── */}
      {transferOwnershipShow && (
        <TransferOwnershipPopUp
          onClose={() => setTransferOwnershipShow(false)}
          onSuccess={() => { refetch(); fetchFunnelLeads(); refetchEmployees?.(); }}
        />
      )}

      <ChatbotDrawer page="manager" employeeId={selectedEmployee?._id} />

      <style jsx>{`
        .row-today-followup{animation:blinkRed 1s infinite;}
        @keyframes blinkRed{0%,100%{background-color:rgba(255,50,50,.08);box-shadow:0 0 4px rgba(255,0,0,.25);}50%{background-color:rgba(255,150,150,.45);box-shadow:0 0 18px rgba(255,0,0,.6);}}
        .badge-pulse-red{animation:badgeRed 1.5s infinite;box-shadow:0 0 8px rgba(255,0,0,.6);font-size:.72rem;}
        @keyframes badgeRed{0%,100%{transform:scale(1);}50%{transform:scale(1.08);}}
        .date-glow-red{animation:glowRed 1.2s infinite;}
        @keyframes glowRed{0%,100%{text-shadow:0 0 4px rgba(255,0,0,.5);}50%{text-shadow:0 0 12px rgba(255,0,0,.9);}}
        .row-overdue-followup{animation:blinkDarkRed 1.2s infinite;}
        @keyframes blinkDarkRed{0%,100%{background-color:rgba(139,0,0,.1);box-shadow:0 0 4px rgba(139,0,0,.3);}50%{background-color:rgba(139,0,0,.35);box-shadow:0 0 16px rgba(139,0,0,.7);}}
        .badge-pulse-dark-red{animation:badgeDarkRed 1.5s infinite;box-shadow:0 0 8px rgba(139,0,0,.6);font-size:.72rem;}
        @keyframes badgeDarkRed{0%,100%{transform:scale(1);}50%{transform:scale(1.08);}}
        .date-glow-dark-red{animation:glowDarkRed 1.2s infinite;}
        @keyframes glowDarkRed{0%,100%{text-shadow:0 0 4px rgba(139,0,0,.5);}50%{text-shadow:0 0 12px rgba(139,0,0,.9);}}
        .table th{border-top:none;font-weight:600;font-size:.875rem;white-space:nowrap;}
        .table td{vertical-align:middle;font-size:.875rem;}
        .btn-group .btn{padding:.25rem .5rem;font-size:.75rem;}
        .table-hover tbody tr:hover{background-color:rgba(0,0,0,.05);}
        .row-today-followup:hover{background-color:rgba(255,100,100,.2)!important;}
        .row-overdue-followup:hover{background-color:rgba(139,0,0,.2)!important;}
        @keyframes greenDotPulse{0%,100%{box-shadow:0 0 4px rgba(34,197,94,0.4);}50%{box-shadow:0 0 10px rgba(34,197,94,0.8);}}
        @keyframes amountFadeIn{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}
      `}</style>
    </>
  );
};

export default SalesManagerMasterGrid;