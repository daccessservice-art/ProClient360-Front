import { useState, useContext, useEffect } from "react";
import { Header } from "../../Header/Header";
import { Sidebar } from "../../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import { UserContext } from "../../../../../context/UserContext";
import ViewSalesLeadPopUp from "../../../CommonPopUp/ViewSalesLeadPopUp";
import { formatDateTimeForDisplay } from "../../../../../utils/formatDate";

export const NotFeasibleLeadsPage = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => {
    setIsOpen(!isopen);
  };

  const [detailsServicePopUp, setDetailsServicePopUp] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const { user } = useContext(UserContext);
  const [filters, setFilters] = useState({ date: null, source: null });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalRecords: 0,
    limit: 20,
    hasNextPage: true,
    hasPrevPage: false,
  });
  const itemsPerPage = 20;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedReasons, setExpandedReasons] = useState({});

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5443';
      const params = {
        page: pagination.currentPage,
        limit: itemsPerPage,
        ...(filters.source && { source: filters.source }),
        ...(filters.date && { date: filters.date }),
      };

      const response = await fetch(`${API_URL}/api/leads/not-feasible?${new URLSearchParams(params)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const responseData = await response.json();

      if (responseData.success) {
        setData(responseData);
        setError(null);
        setPagination(prev => ({ ...prev, ...responseData.pagination }));
      } else {
        throw new Error(responseData.error || 'Failed to fetch not feasible leads');
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch not feasible leads';
      setError(errorMessage);
      setData(null);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [pagination.currentPage, filters.source, filters.date]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: page }));
    }
  };

  const handleDetailsPopUpClick = (lead) => {
    setSelectedLead(lead);
    setDetailsServicePopUp(true);
  };

  const handleChange = (filterType, value) => {
    setFilters(prevFilters => ({ ...prevFilters, [filterType]: value || null }));
    handlePageChange(1);
  };

  const toggleReasonExpansion = (leadId) => {
    setExpandedReasons(prev => ({
      ...prev,
      [leadId]: !prev[leadId]
    }));
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

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
                  <div className="col-12 col-lg-6">
                    <h5 className="text-white py-2">
                      <i className="fa-solid fa-times-circle me-2"></i>
                      Not Feasible Leads
                    </h5>
                  </div>
                </div>

                <div className="row bg-white p-3 m-1 border rounded">
                  <div className="col-md-4">
                    <div className="card border-danger">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="text-muted mb-1">Total Not Feasible</h6>
                            <h3 className="fw-bold text-danger mb-0">
                              {pagination.totalRecords || 0}
                            </h3>
                          </div>
                          <div>
                            <i className="fa-solid fa-times-circle text-danger" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-8">
                    <div className="alert alert-danger mb-0">
                      <i className="fa-solid fa-exclamation-triangle me-2"></i>
                      <strong>About Not Feasible Leads:</strong> These leads have been reviewed and determined to be not feasible for business.
                      They typically have specific reasons for rejection and require no further action.
                    </div>
                  </div>
                </div>

                <div className="row align-items-center p-2 m-1">
                  <div className="col-12 col-lg-4 ms-auto text-end">
                    <div className="row ms-auto">
                      <div className="col-12 col-lg-6 mt-3">
                        <input
                          type="date"
                          className="form-control bg_edit"
                          name="date"
                          onChange={(e) => handleChange('date', e.target.value)}
                          value={filters.date || ""}
                        />
                      </div>

                      <div className="col-12 col-lg-6 mt-3">
                        <select
                          className="form-select bg_edit"
                          name="source"
                          onChange={(e) => handleChange('source', e.target.value)}
                          value={filters.source || ""}
                        >
                          <option value="">All Sources</option>
                          <option value="IndiaMart">IndiaMart</option>
                          <option value="TradeIndia">TradeIndia</option>
                          <option value="Facebook">Facebook</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Email">Email</option>
                          <option value="Google">Google</option>
                          <option value="Direct">Direct</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-hover table-class" id="table-id">
                        <thead className="table-light">
                          <tr className="th_border">
                            <th style={{ width: '60px' }}>Sr.No</th>
                            <th style={{ width: '100px' }}>Source</th>
                            <th style={{ minWidth: '150px' }}>Company Name</th>
                            <th style={{ minWidth: '150px' }}>Contact Name</th>
                            <th style={{ minWidth: '150px' }}>Product</th>
                            <th style={{ width: '130px' }}>Mobile</th>
                            <th style={{ width: '140px' }}>Date</th>
                            <th style={{ width: '300px' }}>Reason</th>
                            <th style={{ width: '80px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {data?.leads?.length > 0 ? (
                            data.leads.map((lead, index) => {
                              const isExpanded = expandedReasons[lead._id] || false;
                              const reasonText = lead.remark || 'No reason provided';
                              const shouldTruncate = reasonText.length > 50;

                              return (
                                <tr key={lead._id}>
                                  <td>{(pagination.currentPage - 1) * itemsPerPage + index + 1}</td>
                                  <td>
                                    <span className="badge bg-secondary">
                                      {lead?.SOURCE}
                                    </span>
                                  </td>
                                  <td className="align_left_td wrap-text-of-col">
                                    {lead?.SENDER_COMPANY || "Not available"}
                                  </td>
                                  <td className="align_left_td wrap-text-of-col">
                                    {lead?.SENDER_NAME || "Not available"}
                                  </td>
                                  <td className="align_left_td wrap-text-of-col">
                                    {lead?.QUERY_PRODUCT_NAME || "Not available"}
                                  </td>
                                  <td>
                                    <a href={`tel:${lead?.SENDER_MOBILE}`} className="text-decoration-none">
                                      <i className="fa-solid fa-phone me-1"></i>
                                      {lead?.SENDER_MOBILE || "Not available"}
                                    </a>
                                  </td>
                                  {/* FIXED: Use QUERY_TIME (actual inquiry time) instead of createdAt */}
                                  <td>{formatDateTimeForDisplay(lead?.QUERY_TIME || lead?.createdAt)}</td>
                                  <td style={{ verticalAlign: 'top', padding: '8px' }}>
                                    <div className="d-flex flex-column">
                                      <span className="badge bg-danger mb-1" style={{ width: 'fit-content' }}>
                                        <i className="fa-solid fa-exclamation-circle me-1"></i>
                                        Not Feasible
                                      </span>
                                      <div
                                        className="reason-text-container"
                                        style={{
                                          fontSize: '0.85rem',
                                          color: '#6c757d',
                                          lineHeight: '1.4',
                                          wordWrap: 'break-word',
                                          padding: '5px',
                                          backgroundColor: '#f8f9fa',
                                          borderRadius: '4px',
                                          border: '1px solid #e9ecef',
                                          cursor: shouldTruncate ? 'pointer' : 'default'
                                        }}
                                        onClick={() => shouldTruncate && toggleReasonExpansion(lead._id)}
                                        title={shouldTruncate ? (isExpanded ? "Click to collapse" : "Click to expand") : ""}
                                      >
                                        {isExpanded || !shouldTruncate ? reasonText : truncateText(reasonText)}
                                        {shouldTruncate && (
                                          <span className="text-primary" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            {isExpanded ? ' Show less' : ' Show more'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      onClick={() => handleDetailsPopUpClick(lead)}
                                      title="View Details"
                                      className="cursor-pointer"
                                    >
                                      <i className="fa-solid fa-eye text-primary mx-1"></i>
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="9" className="text-center py-4">
                                <i className="fa-solid fa-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                                <p className="text-muted mt-2">No not feasible leads found</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

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

      {detailsServicePopUp && selectedLead && (
        <ViewSalesLeadPopUp
          closePopUp={() => {
            setDetailsServicePopUp(false);
            setSelectedLead(null);
          }}
          selectedLead={selectedLead}
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