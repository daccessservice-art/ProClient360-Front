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
import SalesFunnelView from "../SalesMaster/PopUp/SalesFunnelView";

const ALL_LEADS_URL  = `${process.env.REACT_APP_API_URL}/api/leads/all-leads`;
const EMP_LEADS_URL  = `${process.env.REACT_APP_API_URL}/api/leads/employee-leads`;

export const SalesManagerMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  /* ── View mode ── */
  const [viewMode, setViewMode] = useState("table");

  const [showLeadPopUp, setShowLeadPopUp] = useState(false);
  const [selectedLead,  setSelectedLead]  = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete,      setLeadToDelete]      = useState(null);

  const { user } = useContext(UserContext);

  const { managers: salesEmployees, loading: employeesLoading } = useSalesManagers();
  const [selectedEmployee, setSelectedEmployee] = useState({ _id: "all", name: "All Leads" });

  const { deleteLead, loading: deleteLoading } = useDeleteLead();

  const [filters, setFilters] = useState({
    status: null, date: null, callLeads: null, source: null, searchTerm: "",
  });

  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 0, totalRecords: 0,
    limit: 20, hasNextPage: true, hasPrevPage: false,
  });
  const itemsPerPage = 20;

  /* ── ALL leads for funnel (no pagination) ── */
  const [funnelLeads,   setFunnelLeads]   = useState([]);
  const [funnelLoading, setFunnelLoading] = useState(false);

  const { data, loading, error, refetch } = useSalesManagerTeam(
    selectedEmployee?._id,
    pagination.currentPage,
    itemsPerPage,
    filters
  );

  /* ═══════════════════════════════════════════════════
     Fetch ALL leads for funnel (no page limit)
     Uses the same employee filter as the table view.
  ═══════════════════════════════════════════════════ */
  const fetchFunnelLeads = useCallback(async () => {
    setFunnelLoading(true);
    try {
      const isAll = selectedEmployee?._id === "all";
      const url   = isAll
        ? ALL_LEADS_URL
        : `${EMP_LEADS_URL}/${selectedEmployee._id}`;

      const params = {
        page:  1,
        limit: 99999,
        ...(filters.source    && { source:    filters.source    }),
        ...(filters.date      && { date:      filters.date      }),
        ...(filters.status    && { status:    filters.status    }),
        ...(filters.callLeads && { callLeads: filters.callLeads }),
        ...(filters.searchTerm && { search:  filters.searchTerm }),
      };

      const response = await axios.get(url, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (response.data.success) {
        setFunnelLeads(response.data.leads || []);
      } else {
        setFunnelLeads([]);
      }
    } catch (err) {
      console.error("Funnel leads fetch error:", err);
      setFunnelLeads([]);
    } finally {
      setFunnelLoading(false);
    }
  }, [
    selectedEmployee?._id,
    filters.source, filters.date, filters.status,
    filters.callLeads, filters.searchTerm,
  ]);

  /* Auto-fetch funnel leads whenever employee or filters change */
  useEffect(() => { fetchFunnelLeads(); }, [fetchFunnelLeads]);

  /* Also re-fetch when switching to funnel view */
  useEffect(() => {
    if (viewMode === "funnel") fetchFunnelLeads();
  }, [viewMode]);

  /* ── Helpers ── */
  const formatDateOnly = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-GB");
  };

  useEffect(() => {
    if (data) setPagination(prev => ({ ...prev, ...data.pagination }));
    if (error) toast.error(error.message || "An error occurred");
  }, [data, error]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [filters.status, filters.date, filters.source, filters.callLeads, filters.searchTerm]);

  const isAllMode = selectedEmployee._id === "all";

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages)
      setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleDetailsPopUpClick = (lead) => { setSelectedLead(lead); setShowLeadPopUp(true); };

  const handleChange = (filterType, value) =>
    setFilters(prev => ({ ...prev, [filterType]: value || null }));

  const handleSearchChange = (e) =>
    setFilters(prev => ({ ...prev, searchTerm: e.target.value }));

  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    if (employeeId === "all") {
      setSelectedEmployee({ _id: "all", name: "All Leads" });
    } else {
      const employee = salesEmployees.find(emp => emp._id === employeeId);
      setSelectedEmployee(employee || { _id: "all", name: "All Leads" });
    }
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setFilters({ status: null, date: null, callLeads: null, source: null, searchTerm: "" });
  };

  const resetSearch  = () => setFilters(prev => ({ ...prev, searchTerm: "" }));
  const resetFilters = () => {
    setFilters({ status: null, date: null, callLeads: null, source: null, searchTerm: "" });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    refetch();
  };

  /* ── Delete ── */
  const handleDeleteClick = (lead) => { setLeadToDelete(lead); setShowDeleteConfirm(true); };
  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;
    const result = await deleteLead(leadToDelete._id);
    if (result?.success) {
      toast.success("Lead deleted successfully");
      setShowDeleteConfirm(false);
      setLeadToDelete(null);
      refetch();
      fetchFunnelLeads();
    } else {
      toast.error(result?.error || "Failed to delete lead");
    }
  };
  const handleDeleteCancel = () => { setShowDeleteConfirm(false); setLeadToDelete(null); };

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

  const displayLeads = data?.leads;
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

                {/* ── Title + view toggle ── */}
                <div className="row px-2 py-1 mb-3">
                  <div className="col-12 col-lg-4">
                    <h5 className="text-white py-2">Sales Manager Dashboard</h5>
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
                      winCount={data.leadCounts?.wonCount     || 0}
                      pendingCount={data.leadCounts?.pendingCount  || 0}
                      lostCount={data.leadCounts?.lostCount    || 0}
                      todayCount={data.leadCounts?.todaysFollowUpCount || 0}
                      hotleadsCount={data.leadCounts?.hotLeadsCount   || 0}
                      warmLeadsCount={data.leadCounts?.warmLeadsCount  || 0}
                      coldLeadsCount={data.leadCounts?.coldLeadsCount  || 0}
                      invalidLeadsCount={data.leadCounts?.invalidLeadsCount || 0}
                    />

                    {/* ── Quotation funnel card ── */}
                    {data.quotationFunnel && (
                      <div className="row p-2 m-1">
                        <div className="col-12">
                          <SalesQuotationFunnel
                            totalQuotationAmount={data.quotationFunnel.totalActiveQuotationAmount || 0}
                            activeQuotationLeads={data.quotationFunnel.activeQuotationLeads || []}
                            wonAmount={data.quotationFunnel.totalWonAmount  || 0}
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
                      </div>
                      <div className="col-12 col-lg-6 ms-auto text-end">
                        <div className="row g-2">
                          <div className="col">
                            <input type="date" className="form-control" onChange={e => handleChange("date", e.target.value)} value={filters.date || ""}/>
                          </div>
                          <div className="col">
                            <select className="form-select" onChange={e => handleChange("callLeads", e.target.value)} value={filters.callLeads || ""}>
                              <option value="">Leads...</option>
                              <option value="Hot Leads">Hot Leads</option>
                              <option value="Warm Leads">Warm Leads</option>
                              <option value="Cold Leads">Cold Leads</option>
                              <option value="Invalid Leads">Invalid Leads</option>
                            </select>
                          </div>
                          <div className="col">
                            <select className="form-select" onChange={e => handleChange("source", e.target.value)} value={filters.source || ""}>
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
                            <select className="form-select" onChange={e => handleChange("status", e.target.value)} value={filters.status || ""}>
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

                    {/* ══════════════════════════════════
                        FUNNEL VIEW — uses funnelLeads (ALL)
                    ══════════════════════════════════ */}
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
                              onUpdate={() => {}}
                              onAssign={() => {}}
                              onDelete={() => {}}
                              canUpdate={false}
                              canAssign={false}
                              canDelete={false}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* ══════════════════════════════════
                        TABLE VIEW — paginated 20/page
                    ══════════════════════════════════ */}
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
                                  <th style={{ width:"120px" }}>Created Date</th>
                                  <th style={{ width:"120px" }}>Follow-up Date</th>
                                  <th style={{ width:"80px" }}>Status</th>
                                  {isAllMode && <th style={{ width:"120px" }}>Assigned To</th>}
                                  <th className="text-center" style={{ width:"110px" }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {displayLeads?.length > 0 ? (
                                  displayLeads.map((lead, index) => {
                                    const followUpStatus = getFollowUpStatus(lead.nextFollowUpDate, lead.STATUS);
                                    const isToday   = followUpStatus === "today";
                                    const isOverdue = followUpStatus === "overdue";
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
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteClick(lead)} title="Delete">
                                              <i className="fa-solid fa-trash"></i>
                                            </button>
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

                    {/* ── Pagination (table only) ── */}
                    {viewMode === "table" && !loading && pagination.totalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
                        <nav>
                          <ul className="pagination mb-0">
                            <li className={`page-item ${!pagination.hasPrevPage ? "disabled" : ""}`}>
                              <button className="page-link" onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage}>First</button>
                            </li>
                            <li className={`page-item ${!pagination.hasPrevPage ? "disabled" : ""}`}>
                              <button className="page-link" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage}>Previous</button>
                            </li>
                            {(() => {
                              const pages = [];
                              const max = 5;
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
                          </ul>
                        </nav>
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
        .table-hover tbody tr:hover{background-color:rgba(0,0,0,.05);}
        .row-today-followup:hover{background-color:rgba(255,100,100,.2)!important;}
        .row-overdue-followup:hover{background-color:rgba(139,0,0,.2)!important;}
      `}</style>
    </>
  );
};

export default SalesManagerMasterGrid;