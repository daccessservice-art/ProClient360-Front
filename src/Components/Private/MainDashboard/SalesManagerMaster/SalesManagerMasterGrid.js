import { useState, useEffect, useContext } from "react";
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

export const SalesManagerMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [showLeadPopUp, setShowLeadPopUp] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);

  const { user } = useContext(UserContext);

  const { managers: salesEmployees, loading: employeesLoading } = useSalesManagers();
  const [selectedEmployee, setSelectedEmployee] = useState({ _id: 'all', name: 'All Leads' });

  const { deleteLead, loading: deleteLoading } = useDeleteLead();

  const [filters, setFilters] = useState({
    status: null,
    date: null,
    callLeads: null,
    source: null,
    searchTerm: ""
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalRecords: 0,
    limit: 20,
    hasNextPage: true,
    hasPrevPage: false,
  });

  const itemsPerPage = 20;

  const { data, loading, error, refetch } = useSalesManagerTeam(
    selectedEmployee?._id,
    pagination.currentPage,
    itemsPerPage,
    filters
  );

  const formatDateOnly = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString('en-GB');
  };

  useEffect(() => {
    if (data) {
      setPagination(prev => ({ ...prev, ...data.pagination }));
    }
    if (error) toast.error(error.message || "An error occurred");
  }, [data, error]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [filters.status, filters.date, filters.source, filters.callLeads, filters.searchTerm]);

  const isAllMode = selectedEmployee._id === 'all';

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: page }));
    }
  };

  const handleDetailsPopUpClick = (lead) => { setSelectedLead(lead); setShowLeadPopUp(true); };

  const handleChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value || null }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, searchTerm: e.target.value }));
  };

  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    if (employeeId === 'all') {
      setSelectedEmployee({ _id: 'all', name: 'All Leads' });
    } else {
      const employee = salesEmployees.find(emp => emp._id === employeeId);
      setSelectedEmployee(employee || { _id: 'all', name: 'All Leads' });
    }
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setFilters({ status: null, date: null, callLeads: null, source: null, searchTerm: "" });
  };

  const resetSearch = () => {
    setFilters(prev => ({ ...prev, searchTerm: "" }));
  };

  const resetFilters = () => {
    setFilters({ status: null, date: null, callLeads: null, source: null, searchTerm: "" });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    refetch();
  };

  // ── Delete handlers ──
  const handleDeleteClick = (lead) => {
    setLeadToDelete(lead);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;
    const result = await deleteLead(leadToDelete._id);
    if (result?.success) {
      toast.success('Lead deleted successfully');
      setShowDeleteConfirm(false);
      setLeadToDelete(null);
      refetch();
    } else {
      toast.error(result?.error || 'Failed to delete lead');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setLeadToDelete(null);
  };

  const handleBgColor = (status) => {
    if (!status) return "badge bg-secondary";
    switch (status.toString().trim()) {
      case "Won":     return "badge bg-success text-white";
      case "Ongoing": return "badge bg-primary text-white";
      case "Pending": return "badge bg-warning text-dark";
      case "Lost":    return "badge bg-danger text-white";
      default:        return "badge bg-secondary";
    }
  };

  const getFollowUpStatus = (dateString, leadStatus) => {
    if (!dateString) return null;
    if (leadStatus === 'Won' || leadStatus === 'Lost') return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (date >= startOfToday && date <= endOfToday) return 'today';
    if (date < startOfToday) return 'overdue';
    return null;
  };

  const isManagerWithPermissions =
    user?.permissions?.includes("viewLead") &&
    user?.permissions?.includes("viewSalesManagerMaster");

  if (!isManagerWithPermissions && user?.user !== 'company') {
    return (
      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="SalesManagerMasterGrid" />
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="row px-2 py-1">
                  <div className="col-12">
                    <div className="alert alert-danger" role="alert">
                      <h4 className="alert-heading">Access Denied</h4>
                      <p>You don't have permission to access the Sales Manager Master page.</p>
                    </div>
                  </div>
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
      {(loading || employeesLoading || deleteLoading) && (
        <div className="overlay"><span className="loader"></span></div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="SalesManagerMasterGrid" />
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                <div className="row px-2 py-1 mb-3">
                  <div className="col-12 col-lg-4">
                    <h5 className="text-white py-2">Sales Manager Dashboard</h5>
                  </div>
                </div>

                <div className="row align-items-center p-3 m-1 bg-light rounded mb-3">
                  <div className="col-12 col-lg-5 mb-2 mb-lg-0">
                    <label className="form-label fw-semibold mb-1">
                      <i className="fa-solid fa-user-tie me-2 text-primary"></i>Select Sales Employee
                    </label>
                    <select id="employeeSelect" className="form-select" value={selectedEmployee?._id || "all"} onChange={handleEmployeeSelect}>
                      <option value="all">— All Leads —</option>
                      {salesEmployees.map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.name} — {emp.department?.name || 'N/A'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedEmployee && data && (
                  <>
                    <SalesDashboardCards
                      allLeadsCount={data.leadCounts?.allLeadsCount || 0}
                      ongogingCount={data.leadCounts?.ongoingCount || 0}
                      winCount={data.leadCounts?.wonCount || 0}
                      pendingCount={data.leadCounts?.pendingCount || 0}
                      lostCount={data.leadCounts?.lostCount || 0}
                      todayCount={data.leadCounts?.todaysFollowUpCount || 0}
                      hotleadsCount={data.leadCounts?.hotLeadsCount || 0}
                      warmLeadsCount={data.leadCounts?.warmLeadsCount || 0}
                      coldLeadsCount={data.leadCounts?.coldLeadsCount || 0}
                      invalidLeadsCount={data.leadCounts?.invalidLeadsCount || 0}
                    />

                    {data.quotationFunnel && (
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

                    <div className="row align-items-center p-3 m-1 bg-light rounded mb-3">
                      <div className="col-12 col-lg-6">
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search by Mobile Number or Company Name..."
                            value={filters.searchTerm || ""}
                            onChange={handleSearchChange}
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
                        {filters.searchTerm && (
                          <div className="mt-2">
                            <small className="text-info">
                              <i className="fa-solid fa-info-circle"></i> Searching across all pages
                            </small>
                          </div>
                        )}
                      </div>

                      <div className="col-12 col-lg-6 ms-auto text-end">
                        <div className="row g-2">
                          <div className="col">
                            <input type="date" className="form-control" name="date" onChange={(e) => handleChange('date', e.target.value)} value={filters.date || ""} />
                          </div>
                          <div className="col">
                            <select className="form-select" name="callLeads" onChange={(e) => handleChange('callLeads', e.target.value)} value={filters.callLeads || ""}>
                              <option value="">Leads...</option>
                              <option value="Hot Leads">Hot Leads</option>
                              <option value="Warm Leads">Warm Leads</option>
                              <option value="Cold Leads">Cold Leads</option>
                              <option value="Invalid Leads">Invalid Leads</option>
                            </select>
                          </div>
                          <div className="col">
                            <select className="form-select" name="source" onChange={(e) => handleChange('source', e.target.value)} value={filters.source || ""}>
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
                            <select className="form-select" name="status" onChange={(e) => handleChange('status', e.target.value)} value={filters.status || ""}>
                              <option value="">Status...</option>
                              <option value="Won">Won</option>
                              <option value="Ongoing">Ongoing</option>
                              <option value="Pending">Pending</option>
                              <option value="Lost">Lost</option>
                            </select>
                          </div>
                          <div className="col">
                            <button className="btn btn-outline-secondary w-100" type="button" onClick={resetFilters} title="Reset all filters">
                              <i className="fa-solid fa-filter-circle-xmark"></i> Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

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
                                {isAllMode && <th style={{ width: '120px' }}>Assigned To</th>}
                                <th className="text-center" style={{ width: '110px' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayLeads?.length > 0 ? (
                                displayLeads.map((lead, index) => {
                                  const followUpStatus = getFollowUpStatus(lead.nextFollowUpDate, lead.STATUS);
                                  const isToday   = followUpStatus === 'today';
                                  const isOverdue = followUpStatus === 'overdue';
                                  return (
                                    <tr
                                      key={lead._id}
                                      className={
                                        isToday   ? "row-today-followup"   :
                                        isOverdue ? "row-overdue-followup" : ""
                                      }
                                    >
                                      <td className="text-center">{(pagination.currentPage - 1) * itemsPerPage + index + 1}</td>
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
                                            isToday   ? "fw-bold text-danger date-glow-red"     :
                                            isOverdue ? "fw-bold text-danger date-glow-dark-red" :
                                            "text-muted"
                                          }>
                                            {formatDateOnly(lead.nextFollowUpDate)}
                                          </span>
                                        ) : (
                                          <span className="text-muted">Not set</span>
                                        )}
                                      </td>
                                      <td><span className={handleBgColor(lead.STATUS)}>{lead.STATUS || "N/A"}</span></td>
                                      {isAllMode && <td><small className="text-muted">{lead.assignedTo?.name || "Not assigned"}</small></td>}
                                      <td className="text-center">
                                        <div className="d-flex justify-content-center gap-1">
                                          <button
                                            className="btn btn-sm btn-outline-info"
                                            onClick={() => handleDetailsPopUpClick(lead)}
                                            title="View Lead Details"
                                          >
                                            <i className="fa-solid fa-eye"></i>
                                          </button>
                                          <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => handleDeleteClick(lead)}
                                            title="Delete Lead"
                                          >
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

                    {!loading && pagination.totalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
                        <nav>
                          <ul className="pagination mb-0">
                            <li className={`page-item ${!pagination.hasPrevPage ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage}>First</button>
                            </li>
                            <li className={`page-item ${!pagination.hasPrevPage ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage}>Previous</button>
                            </li>
                            {(() => {
                              const pageNumbers = [];
                              const maxPagesToShow = 5;
                              let startPage = Math.max(1, pagination.currentPage - 2);
                              let endPage = Math.min(pagination.totalPages, startPage + maxPagesToShow - 1);
                              if (endPage - startPage < maxPagesToShow - 1) startPage = Math.max(1, endPage - maxPagesToShow + 1);
                              for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
                              return pageNumbers.map(number => (
                                <li key={number} className={`page-item ${pagination.currentPage === number ? 'active' : ''}`}>
                                  <button className="page-link" onClick={() => handlePageChange(number)}>{number}</button>
                                </li>
                              ));
                            })()}
                            <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.hasNextPage}>Next</button>
                            </li>
                            <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}>
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

      {showLeadPopUp && selectedLead && (
        <ViewSalesLeadPopUp closePopUp={() => { setShowLeadPopUp(false); setSelectedLead(null); }} selectedLead={selectedLead} />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && leadToDelete && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
                  <p className="mb-1"><strong>Contact:</strong> {leadToDelete.SENDER_NAME || "N/A"}</p>
                  <p className="mb-0"><strong>Mobile:</strong> {leadToDelete.SENDER_MOBILE || "N/A"}</p>
                </div>
                <p className="text-danger mt-3 mb-0 small">
                  <i className="fa-solid fa-circle-info me-1"></i>This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleDeleteCancel}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm} disabled={deleteLoading}>
                  {deleteLoading ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Deleting...</>
                  ) : (
                    <><i className="fa-solid fa-trash me-1"></i>Delete</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* ─── TODAY → RED blink ─── */
        .row-today-followup { animation: blinkRed 1s infinite; }
        @keyframes blinkRed {
          0%,100% { background-color: rgba(255,50,50,0.08);   box-shadow: 0 0 4px  rgba(255,0,0,0.25); }
          50%     { background-color: rgba(255,150,150,0.45); box-shadow: 0 0 18px rgba(255,0,0,0.6);  }
        }
        .badge-pulse-red { animation: badgeRed 1.5s infinite; box-shadow: 0 0 8px rgba(255,0,0,0.6); font-size: 0.72rem; }
        @keyframes badgeRed {
          0%,100% { transform: scale(1);    box-shadow: 0 0 5px  rgba(255,0,0,0.5); }
          50%     { transform: scale(1.08); box-shadow: 0 0 14px rgba(255,0,0,0.8); }
        }
        .date-glow-red { animation: glowRed 1.2s infinite; }
        @keyframes glowRed {
          0%,100% { text-shadow: 0 0 4px  rgba(255,0,0,0.5); }
          50%     { text-shadow: 0 0 12px rgba(255,0,0,0.9); }
        }

        /* ─── OVERDUE → DARK RED blink ─── */
        .row-overdue-followup { animation: blinkDarkRed 1.2s infinite; }
        @keyframes blinkDarkRed {
          0%,100% { background-color: rgba(139, 0, 0, 0.1); box-shadow: 0 0 4px  rgba(139, 0, 0, 0.3); }
          50%     { background-color: rgba(139, 0, 0, 0.35); box-shadow: 0 0 16px rgba(139, 0, 0, 0.7);  }
        }
        .badge-pulse-dark-red { animation: badgeDarkRed 1.5s infinite; box-shadow: 0 0 8px rgba(139, 0, 0, 0.6); font-size: 0.72rem; }
        @keyframes badgeDarkRed {
          0%,100% { transform: scale(1);    box-shadow: 0 0 5px  rgba(139, 0, 0, 0.5); }
          50%     { transform: scale(1.08); box-shadow: 0 0 14px rgba(139, 0, 0, 0.8); }
        }
        .date-glow-dark-red { animation: glowDarkRed 1.2s infinite; }
        @keyframes glowDarkRed {
          0%,100% { text-shadow: 0 0 4px  rgba(139, 0, 0, 0.5); }
          50%     { text-shadow: 0 0 12px rgba(139, 0, 0, 0.9); }
        }

        /* ─── Table base ─── */
        .table th { border-top: none; font-weight: 600; font-size: 0.875rem; white-space: nowrap; }
        .table td { vertical-align: middle; font-size: 0.875rem; }
        .table-hover tbody tr:hover { background-color: rgba(0,0,0,0.05); }
        .row-today-followup:hover   { background-color: rgba(255,100,100,0.2) !important; }
        .row-overdue-followup:hover { background-color: rgba(139, 0, 0, 0.2)   !important; }
      `}</style>
    </>
  );
};

export default SalesManagerMasterGrid;