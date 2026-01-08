// In SalesManagerMasterGrid.js
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
  const toggle = () => {
    setIsOpen(!isopen);
  };

  const [showLeadPopUp, setShowLeadPopUp] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const { user } = useContext(UserContext);

  // Sales Employees List (not managers)
  const { managers: salesEmployees, loading: employeesLoading } = useSalesManagers();
  
  // Initialize with 'all' to show all leads by default
  const [selectedEmployee, setSelectedEmployee] = useState({ _id: 'all', name: 'All Leads' });

  // Filters
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

  // Fetch data based on selected employee
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
      if (data.leads) {
        setAllLeads(data.leads);
      }
    }
    if (error) {
      toast.error(error.message || "An error occurred");
    }
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
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterType]: value || null
    }));
  };

  const handleSearchChange = (e) => {
    const searchTerm = e.target.value;
    setFilters(prevFilters => ({ ...prevFilters, searchTerm }));
  };

  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    
    // If "All Leads" is selected, set selectedEmployee to a special object
    if (employeeId === 'all') {
      setSelectedEmployee({ _id: 'all', name: 'All Leads' });
    } else {
      const employee = salesEmployees.find(emp => emp._id === employeeId);
      setSelectedEmployee(employee || { _id: 'all', name: 'All Leads' });
    }
    
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setFilters({
      status: null,
      date: null,
      callLeads: null,
      source: null,
      searchTerm: ""
    });
  };

  const resetSearch = () => {
    setFilters(prev => ({ ...prev, searchTerm: "" }));
    setAllLeads([]);
  };

  const resetFilters = () => {
    setFilters({
      status: null,
      date: null,
      callLeads: null,
      source: null,
      searchTerm: ""
    });
    setAllLeads([]);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    refetch();
  };

  const handleBgColor = (status) => {
    // Handle null/undefined status
    if (!status) return "badge bg-secondary";
    
    // Normalize status for consistent comparison
    const normalizedStatus = status.toString().trim();
    
    switch (normalizedStatus) {
      case "Won":
        return "badge bg-success text-white";
      case "Ongoing":
        return "badge bg-primary text-white";
      case "Pending":
        return "badge bg-warning text-dark";
      case "Lost":
        return "badge bg-danger text-white";
      default:
        return "badge bg-secondary";
    }
  };

  // Check if user is a manager with proper permissions
  const isManagerWithPermissions = user?.permissions?.includes("viewLead") && 
                                  user?.permissions?.includes("viewSalesManagerMaster");

  // If not a manager with proper permissions, show access denied
  if (!isManagerWithPermissions && user?.user !== 'company') {
    return (
      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="SalesManagerMasterGrid" />
            <div
              className="main-panel"
              style={{
                width: isopen ? "" : "calc(100% - 120px)",
                marginLeft: isopen ? "" : "125px",
              }}
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
              style={{
                width: isopen ? "" : "calc(100% - 120px)",
                marginLeft: isopen ? "" : "125px",
              }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="row px-2 py-1">
                  <div className="col-12 col-lg-6">
                    <h5 className="text-white py-2">Sales Manager Master</h5>
                  </div>
                </div>

                {/* Employee Selection */}
                <div className="row bg-white p-3 m-1 border rounded">
                  <div className="col-12 col-lg-6">
                    <label htmlFor="employeeSelect" className="form-label fw-bold">Select Sales Employee</label>
                    <select
                      id="employeeSelect"
                      className="form-select"
                      value={selectedEmployee?._id || "all"}
                      onChange={handleEmployeeSelect}
                    >
                      <option value="all">-- All Leads --</option>
                      {salesEmployees.map(employee => (
                        <option key={employee._id} value={employee._id}>
                          {employee.name} - {employee.department?.name || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Employee Info Card - Only show when a specific employee is selected */}
                {selectedEmployee && selectedEmployee._id !== 'all' && (
                  <div className="row bg-white p-3 m-1 border rounded">
                    <div className="col-12">
                      <h6 className="fw-bold mb-3">Employee: {selectedEmployee.name}</h6>
                      <div className="row">
                        <div className="col-md-4">
                          <p><strong>Email:</strong> {selectedEmployee.email}</p>
                        </div>
                        <div className="col-md-4">
                          <p><strong>Department:</strong> {selectedEmployee.department?.name || 'N/A'}</p>
                        </div>
                        <div className="col-md-4">
                          <p><strong>Designation:</strong> {selectedEmployee.designation?.name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* All Leads Info Card - Show when "All Leads" is selected */}
                {selectedEmployee && selectedEmployee._id === 'all' && (
                  <div className="row bg-white p-3 m-1 border rounded">
                    <div className="col-12">
                      <h6 className="fw-bold mb-3">Viewing: All Leads</h6>
                      <p className="mb-0">Displaying all leads across all sales employees</p>
                    </div>
                  </div>
                )}

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
                      onTodayFollowUpClick={() => {}}
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

                    <div className="row align-items-center p-2 m-1">
                      <div className="col-12 col-lg-6">
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control bg_edit"
                            placeholder="Search by Mobile Number or Company Name....."
                            value={filters.searchTerm || ""}
                            onChange={handleSearchChange}
                          />
                          {filters.searchTerm && (
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              onClick={resetSearch}
                            >
                              <i className="fa-solid fa-times"></i>
                            </button>
                          )}
                          <button className="btn btn-dark" type="button">
                            <i className="fa-solid fa-search"></i>
                          </button>
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 ms-auto text-end">
                        <div className="row g-2">
                          <div className="col">
                            <input
                              type="date"
                              className="form-control bg_edit"
                              name="date"
                              onChange={(e) => handleChange('date', e.target.value)}
                              value={filters.date || ""}
                            />
                          </div>

                          <div className="col">
                            <select
                              className="form-select bg_edit"
                              name="callLeads"
                              onChange={(e) => handleChange('callLeads', e.target.value)}
                              value={filters.callLeads || ""}
                            >
                              <option value="">Leads....</option>
                              <option value="Hot Leads">Hot Leads</option>
                              <option value="Warm Leads">Warm Leads</option>
                              <option value="Cold Leads">Cold Leads</option>
                              <option value="Invalid Leads">Invalid Leads</option>
                            </select>
                          </div>

                          <div className="col">
                            <select
                              className="form-select bg_edit"
                              name="source"
                              onChange={(e) => handleChange('source', e.target.value)}
                              value={filters.source || ""}
                            >
                              <option value="">Sources....</option>
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
                              className="form-select bg_edit"
                              name="status"
                              onChange={(e) => handleChange('status', e.target.value)}
                              value={filters.status || ""}
                            >
                              <option value="">Status....</option>
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

                    <div className="row bg-white p-2 m-1 border rounded">
                      <div className="col-12 py-2">
                        <div className="table-responsive">
                          <table className="table table-striped table-class" id="table-id">
                            <thead>
                              <tr className="th_border">
                                <th>Sr.No</th>
                                <th>Company Name</th>
                                <th className="align_left_td td_width">Contact Name</th>
                                <th className="align_left_td td_width">Product</th>
                                <th>Sources</th>
                                <th>Mobile</th>
                                <th>Date</th>
                                <th>Status</th>
                                {selectedEmployee._id === 'all' && <th>Assigned To</th>}
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody className="broder my-4">
                              {(isSearchMode ? filteredLeads : data.leads)?.length > 0 ? (
                                (isSearchMode ? filteredLeads : data.leads).map((lead, index) => (
                                  <tr key={lead._id}>
                                    <td>{(pagination.currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="align_left_td td_width">{lead.SENDER_COMPANY || "Not available."}</td>
                                    <td className="align_left_td td_width">{lead.SENDER_NAME || "Not available."}</td>
                                    <td className="align_left_td td_width">{lead.QUERY_PRODUCT_NAME || "Not available."}</td>
                                    <td>{lead.SOURCE}</td>
                                    <td>{lead.SENDER_MOBILE || "Not available."}</td>
                                    <td>{formatDateforTaskUpdate(lead.nextFollowUpDate || lead.createdAt)}</td>
                                    <td>
                                      <span className={handleBgColor(lead.STATUS)}>
                                        {lead.STATUS || "N/A"}
                                      </span>
                                    </td>
                                    {selectedEmployee._id === 'all' && (
                                      <td>{lead.assignedTo?.name || "Not assigned"}</td>
                                    )}
                                    <td>
                                      <span onClick={() => handleDetailsPopUpClick(lead)} title="View Details">
                                        <i className="fa-solid fa-eye text-primary cursor-pointer"></i>
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={selectedEmployee._id === 'all' ? 10 : 9} className="text-center">
                                    {isSearchMode ? "No leads found matching your search." : "No leads found."}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {!isSearchMode && !loading && pagination.totalPages > 1 && (
                      <div className="pagination-container text-center my-3">
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={!pagination.hasPrevPage}
                          className="btn btn-dark btn-sm me-1"
                        >
                          First
                        </button>
                        <button
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={!pagination.hasPrevPage}
                          className="btn btn-dark btn-sm me-1"
                        >
                          Previous
                        </button>
                        <span className="mx-2">Page {pagination.currentPage} of {pagination.totalPages}</span>
                        <button
                          disabled={!pagination.hasNextPage}
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          className="btn btn-dark btn-sm me-1"
                        >
                          Next
                        </button>
                        <button
                          onClick={() => handlePageChange(pagination.totalPages)}
                          disabled={!pagination.hasNextPage}
                          className="btn btn-dark btn-sm"
                        >
                          Last
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
          closePopUp={() => {
            setShowLeadPopUp(false);
            setSelectedLead(null);
          }}
          selectedLead={selectedLead}
        />
      )}
    </>
  );
};

export default SalesManagerMasterGrid;