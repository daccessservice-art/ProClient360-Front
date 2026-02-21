import { useState, useEffect, useMemo, useContext } from "react";
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

export const SalesManagerMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [showLeadPopUp, setShowLeadPopUp] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const { user } = useContext(UserContext);

  const { managers: salesEmployees, loading: employeesLoading } = useSalesManagers();
  const [selectedEmployee, setSelectedEmployee] = useState({ _id: 'all', name: 'All Leads' });

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

  const [allLeads, setAllLeads] = useState([]);

  useEffect(() => {
    if (data) {
      setPagination(prev => ({ ...prev, ...data.pagination }));
      if (data.leads) setAllLeads(data.leads);
    }
    if (error) toast.error(error.message || "An error occurred");
  }, [data, error]);

  useEffect(() => {
    if (filters.status !== null || filters.date !== null || filters.source !== null || filters.callLeads !== null) {
      setAllLeads([]);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      refetch();
    }
  }, [filters.status, filters.date, filters.source, filters.callLeads]);

  const filteredLeads = useMemo(() => {
    if (!filters.searchTerm) return allLeads;
    const searchLower = filters.searchTerm.toLowerCase();
    return allLeads.filter(lead =>
      (lead.SENDER_COMPANY && lead.SENDER_COMPANY.toLowerCase().includes(searchLower)) ||
      (lead.SENDER_MOBILE && lead.SENDER_MOBILE.toLowerCase().includes(searchLower))
    );
  }, [allLeads, filters.searchTerm]);

  const isSearchMode = filters.searchTerm !== "";
  const isAllMode = selectedEmployee._id === 'all';

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: page }));
    }
  };

  const handleDetailsPopUpClick = (lead) => {
    setSelectedLead(lead);
    setShowLeadPopUp(true);
  };

  const handleChange = (filterType, value) => {
    setFilters(prevFilters => ({ ...prevFilters, [filterType]: value || null }));
  };

  const handleSearchChange = (e) => {
    setFilters(prevFilters => ({ ...prevFilters, searchTerm: e.target.value }));
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
    setFilters(prevFilters => ({ ...prevFilters, searchTerm: "" }));
    setAllLeads([]);
  };

  const resetFilters = () => {
    setFilters({ status: null, date: null, callLeads: null, source: null, searchTerm: "" });
    setAllLeads([]);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    refetch();
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

  const isToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isManagerWithPermissions =
    user?.permissions?.includes("viewLead") &&
    user?.permissions?.includes("viewSalesManagerMaster");

  // Access Denied
  if (!isManagerWithPermissions && user?.user !== 'company') {
    return (
      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="SalesManagerMasterGrid" />
            <div
              className="main-panel"
              style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="row px-2 py-1">
                  <div className="col-12">
                    <div className="alert alert-danger" role="alert">
                      <h4 className="alert-heading">Access Denied</h4>
                      <p>You don't have permission to access the Sales Manager Master page.</p>
                      <hr />
                      <p className="mb-0">Please contact your administrator if you believe this is an error.</p>
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

  const displayLeads = isSearchMode ? filteredLeads : data?.leads;
  const colSpan = isAllMode ? 11 : 10;

  return (
    <>
      {(loading || employeesLoading) && (
        <div className="overlay">
          <span className="loader"></span>
        </div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="SalesManagerMasterGrid" />
            <div
              className="main-panel"
              style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* ── Page Header ── */}
                <div className="row px-2 py-1 mb-3">
                  <div className="col-12 col-lg-4">
                    <h5 className="text-white py-2">Sales Manager Dashboard</h5>
                  </div>
                </div>

                {/* ── Employee Selector ── */}
                <div className="row align-items-center p-3 m-1 bg-light rounded mb-3">
                  <div className="col-12 col-lg-5 mb-2 mb-lg-0">
                    <label className="form-label fw-semibold mb-1">
                      <i className="fa-solid fa-user-tie me-2 text-primary"></i>Select Sales Employee
                    </label>
                    <select
                      id="employeeSelect"
                      className="form-select"
                      value={selectedEmployee?._id || "all"}
                      onChange={handleEmployeeSelect}
                    >
                      <option value="all">— All Leads —</option>
                      {salesEmployees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} — {emp.department?.name || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Employee detail pills — only when a specific employee is selected */}
                  {selectedEmployee && !isAllMode && (
                    <div className="col-12 col-lg-7 mt-2 mt-lg-3">
                      <div className="d-flex flex-wrap gap-2">
                        <span className="badge bg-light text-dark border">
                          <i className="fa-solid fa-envelope me-1 text-primary"></i>
                          {selectedEmployee.email || 'N/A'}
                        </span>
                        <span className="badge bg-light text-dark border">
                          <i className="fa-solid fa-building me-1 text-primary"></i>
                          {selectedEmployee.department?.name || 'N/A'}
                        </span>
                        <span className="badge bg-light text-dark border">
                          <i className="fa-solid fa-id-badge me-1 text-primary"></i>
                          {selectedEmployee.designation?.name || 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedEmployee && isAllMode && (
                    <div className="col-12 col-lg-7 mt-2 mt-lg-3">
                      <small className="text-info">
                        <i className="fa-solid fa-layer-group me-1"></i>
                        Displaying all leads across all sales employees
                      </small>
                    </div>
                  )}
                </div>

                {selectedEmployee && data && (
                  <>
                    {/* ── Dashboard Cards ── */}
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
                      onTodayFollowUpClick={() => {}}
                    />

                    {/* ── Quotation Funnel ── */}
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

                    {/* ── Filter Bar ── (matches SalesMasterGrid exactly) */}
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
                        {isSearchMode && (
                          <div className="mt-2">
                            <small className="text-muted">
                              Searching through {allLeads.length} leads. {filteredLeads.length} matches found.
                            </small>
                          </div>
                        )}
                      </div>

                      <div className="col-12 col-lg-6 ms-auto text-end">
                        <div className="row g-2">
                          <div className="col">
                            <input
                              type="date"
                              className="form-control"
                              name="date"
                              onChange={(e) => handleChange('date', e.target.value)}
                              value={filters.date || ""}
                            />
                          </div>
                          <div className="col">
                            <select
                              className="form-select"
                              name="callLeads"
                              onChange={(e) => handleChange('callLeads', e.target.value)}
                              value={filters.callLeads || ""}
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
                              className="form-select"
                              name="source"
                              onChange={(e) => handleChange('source', e.target.value)}
                              value={filters.source || ""}
                            >
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
                            <select
                              className="form-select"
                              name="status"
                              onChange={(e) => handleChange('status', e.target.value)}
                              value={filters.status || ""}
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
                              className="btn btn-outline-secondary w-100"
                              type="button"
                              onClick={resetFilters}
                              title="Reset all filters"
                            >
                              <i className="fa-solid fa-filter-circle-xmark"></i> Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Table ── (matches SalesMasterGrid exactly) */}
                    <div className="row bg-white p-3 m-1 border rounded shadow-sm">
                      <div className="col-12">
                        <div className="table-responsive">
                          <table className="table table-hover table-striped" id="table-id">
                            <thead className="table-dark">
                              <tr>
                                <th className="text-center" style={{ width: '60px' }}>Sr.No</th>
                                <th style={{ minWidth: '150px' }}>Company Name</th>
                                <th style={{ minWidth: '120px' }}>Contact Name</th>
                                <th style={{ minWidth: '120px' }}>Product</th>
                                <th style={{ width: '100px' }}>Source</th>
                                <th style={{ width: '120px' }}>Mobile</th>
                                <th style={{ width: '120px' }}>Created Date</th>
                                <th style={{ width: '120px' }}>Follow-up Date</th>
                                <th style={{ width: '80px' }}>Status</th>
                                {isAllMode && <th style={{ width: '120px' }}>Assigned To</th>}
                                <th className="text-center" style={{ width: '80px' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayLeads?.length > 0 ? (
                                displayLeads.map((lead, index) => {
                                  const hasTodayFollowUp = isToday(lead.nextFollowUpDate);
                                  return (
                                    <tr
                                      key={lead._id}
                                      className={hasTodayFollowUp ? "today-followup-row" : ""}
                                    >
                                      <td className="text-center">
                                        {(pagination.currentPage - 1) * itemsPerPage + index + 1}
                                      </td>

                                      <td className="position-relative">
                                        <div className="d-flex align-items-center">
                                          <span>{lead.SENDER_COMPANY || "Not available."}</span>
                                          {hasTodayFollowUp && (
                                            <span className="badge bg-danger text-white ms-2 today-badge">
                                              <i className="fa-solid fa-bell"></i> TODAY
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      <td>{lead.SENDER_NAME || "Not available."}</td>
                                      <td>{lead.QUERY_PRODUCT_NAME || "Not available."}</td>

                                      <td>
                                        <small className="text-muted">{lead.SOURCE}</small>
                                      </td>
                                      <td>
                                        <small className="text-muted">{lead.SENDER_MOBILE || "Not available."}</small>
                                      </td>
                                      <td>
                                        <small className="text-muted">{formatDateforTaskUpdate(lead.createdAt)}</small>
                                      </td>

                                      <td>
                                        {lead.nextFollowUpDate ? (
                                          <span className={hasTodayFollowUp ? "fw-bold text-danger today-date" : "text-muted"}>
                                            {formatDateforTaskUpdate(lead.nextFollowUpDate)}
                                          </span>
                                        ) : (
                                          <span className="text-muted">Not set</span>
                                        )}
                                      </td>

                                      <td>
                                        <span className={handleBgColor(lead.STATUS)}>
                                          {lead.STATUS || "N/A"}
                                        </span>
                                      </td>

                                      {isAllMode && (
                                        <td>
                                          <small className="text-muted">
                                            {lead.assignedTo?.name || "Not assigned"}
                                          </small>
                                        </td>
                                      )}

                                      <td className="text-center">
                                        <button
                                          className="btn btn-sm btn-outline-info"
                                          onClick={() => handleDetailsPopUpClick(lead)}
                                          title="View Lead Details"
                                        >
                                          <i className="fa-solid fa-eye"></i>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={colSpan} className="text-center py-4">
                                    <div className="text-muted">
                                      <i className="fa-solid fa-inbox fa-2x mb-2"></i>
                                      <p className="mb-0">
                                        {isSearchMode
                                          ? "No leads found matching your search."
                                          : "No leads found."}
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* ── Pagination ── (matches SalesMasterGrid exactly) */}
                    {!isSearchMode && !loading && pagination.totalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
                        <nav>
                          <ul className="pagination mb-0">
                            <li className={`page-item ${!pagination.hasPrevPage ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage}>
                                First
                              </button>
                            </li>
                            <li className={`page-item ${!pagination.hasPrevPage ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage}>
                                Previous
                              </button>
                            </li>
                            {(() => {
                              const pageNumbers = [];
                              const maxPagesToShow = 5;
                              let startPage, endPage;
                              if (pagination.totalPages <= maxPagesToShow) {
                                startPage = 1; endPage = pagination.totalPages;
                              } else if (pagination.currentPage <= 3) {
                                startPage = 1; endPage = maxPagesToShow;
                              } else if (pagination.currentPage >= pagination.totalPages - 2) {
                                startPage = pagination.totalPages - maxPagesToShow + 1; endPage = pagination.totalPages;
                              } else {
                                startPage = pagination.currentPage - 2; endPage = pagination.currentPage + 2;
                              }
                              startPage = Math.max(1, startPage);
                              endPage = Math.min(pagination.totalPages, endPage);
                              for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
                              return pageNumbers.map(number => (
                                <li key={number} className={`page-item ${pagination.currentPage === number ? 'active' : ''}`}>
                                  <button className="page-link" onClick={() => handlePageChange(number)}>
                                    {number}
                                  </button>
                                </li>
                              ));
                            })()}
                            <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.hasNextPage}>
                                Next
                              </button>
                            </li>
                            <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => handlePageChange(pagination.totalPages)} disabled={!pagination.hasNextPage}>
                                Last
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    )}

                    {isSearchMode && !loading && pagination.hasNextPage && (
                      <div className="text-center mt-3">
                        <button className="btn btn-primary" onClick={() => handlePageChange(pagination.currentPage + 1)}>
                          Load More Results
                        </button>
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
        <ViewSalesLeadPopUp
          closePopUp={() => { setShowLeadPopUp(false); setSelectedLead(null); }}
          selectedLead={selectedLead}
        />
      )}

      <style jsx>{`
        .today-followup-row {
          position: relative;
          animation: intenseBlink 1s infinite;
          border-radius: 4px;
        }

        @keyframes intenseBlink {
          0%   { background-color: rgba(255, 50, 50, 0.1);  box-shadow: 0 0 5px rgba(255, 0, 0, 0.3); }
          25%  { background-color: rgba(255, 100, 100, 0.3); box-shadow: 0 0 15px rgba(255, 0, 0, 0.5); }
          50%  { background-color: rgba(255, 150, 150, 0.5); box-shadow: 0 0 20px rgba(255, 0, 0, 0.7); }
          75%  { background-color: rgba(255, 100, 100, 0.3); box-shadow: 0 0 15px rgba(255, 0, 0, 0.5); }
          100% { background-color: rgba(255, 50, 50, 0.1);  box-shadow: 0 0 5px rgba(255, 0, 0, 0.3); }
        }

        .today-badge {
          animation: badgePulse 1.5s infinite;
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.7);
          font-weight: bold;
          font-size: 0.75rem;
        }

        @keyframes badgePulse {
          0%   { transform: scale(1);   box-shadow: 0 0 5px rgba(255, 0, 0, 0.5); }
          50%  { transform: scale(1.1); box-shadow: 0 0 15px rgba(255, 0, 0, 0.8); }
          100% { transform: scale(1);   box-shadow: 0 0 5px rgba(255, 0, 0, 0.5); }
        }

        .today-date {
          animation: textGlow 1.2s infinite;
          text-shadow: 0 0 5px rgba(255, 0, 0, 0.8);
        }

        @keyframes textGlow {
          0%   { text-shadow: 0 0 5px rgba(255, 0, 0, 0.5); }
          50%  { text-shadow: 0 0 15px rgba(255, 0, 0, 0.9); }
          100% { text-shadow: 0 0 5px rgba(255, 0, 0, 0.5); }
        }

        .table th {
          border-top: none;
          font-weight: 600;
          font-size: 0.875rem;
          white-space: nowrap;
        }

        .table td {
          vertical-align: middle;
          font-size: 0.875rem;
        }

        .table-hover tbody tr:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .today-followup-row:hover {
          background-color: rgba(255, 100, 100, 0.2) !important;
        }
      `}</style>
    </>
  );
};

export default SalesManagerMasterGrid;