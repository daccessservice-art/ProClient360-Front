import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../Header/Header";
import { Sidebar } from "../../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import { UserContext } from "../../../../../context/UserContext";
import ViewSalesLeadPopUp from "../../../CommonPopUp/ViewSalesLeadPopUp";
import useCallUnansweredLeads from "../../../../../hooks/leads/CallUnansweredLeadPage";

// ── IST time formatter ──
const formatLeadTime = (rawDate) => {
  if (!rawDate) return "—";
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return "—";
  const datePart = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
  return `${datePart} ${timePart}`;
};

export const CallUnansweredLeadsPage = () => {
  const navigate = useNavigate();
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

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

  const { data, loading, error, refetch } = useCallUnansweredLeads(
    pagination.currentPage,
    itemsPerPage,
    filters
  );

  useEffect(() => {
    if (data) {
      setPagination(prev => ({ ...prev, ...data.pagination }));
    }
    if (error) {
      toast.error(error || "An error occurred");
    }
  }, [data, error]);

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

  const getCallAttemptBadge = (lead) => {
    if (lead.callHistory && lead.callHistory.length > 0) {
      return (
        <span className={`badge ${lead.callHistory.length >= 9 ? 'bg-danger' : lead.callHistory.length >= 6 ? 'bg-warning' : 'bg-info'}`}>
          <i className="fa-solid fa-phone me-1"></i>
          {lead.callHistory.length} Call{lead.callHistory.length > 1 ? 's' : ''}
        </span>
      );
    }
    return <span className="badge bg-secondary">No Calls</span>;
  };

  const getUniqueDaysCount = (lead) => {
    if (lead.callHistory && lead.callHistory.length > 0) {
      const uniqueDays = [...new Set(lead.callHistory.map(call => call.day))];
      return (
        <span className="badge bg-primary">
          <i className="fa-solid fa-calendar-days me-1"></i>
          {uniqueDays.length} Day{uniqueDays.length > 1 ? 's' : ''}
        </span>
      );
    }
    return <span className="badge bg-secondary">-</span>;
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

                {/* Header with Back Button */}
                <div className="row px-2 py-1 align-items-center">
                  <div className="col-12 col-lg-6 d-flex align-items-center gap-3">
                    <button
                      onClick={() => navigate('/MarketingMasterGrid')}
                      className="btn btn-sm btn-light border"
                      title="Back to Marketing Dashboard"
                      style={{ borderRadius: '6px', fontWeight: 500 }}
                    >
                      <i className="fa-solid fa-arrow-left me-1"></i> Back
                    </button>
                    <h5 className="text-white py-2 mb-0">
                      <i className="fa-solid fa-phone-slash me-2"></i>
                      Call Unanswered Leads
                    </h5>
                  </div>
                </div>

                {/* Stats */}
                <div className="row bg-white p-3 m-1 border rounded">
                  <div className="col-md-4">
                    <div className="card border-warning">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="text-muted mb-1">Total Call Unanswered</h6>
                            <h3 className="fw-bold text-warning mb-0">{pagination.totalRecords || 0}</h3>
                          </div>
                          <i className="fa-solid fa-phone-slash text-warning" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-8">
                    <div className="alert alert-info mb-0">
                      <i className="fa-solid fa-info-circle me-2"></i>
                      <strong>About Call Unanswered Leads:</strong> These leads have been attempted multiple times (typically 3 calls per day for 3 days) but remain unanswered.
                    </div>
                  </div>
                </div>

                {/* Filters */}
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

                {/* Table */}
                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-hover table-class" id="table-id">
                        <thead className="table-light">
                          <tr className="th_border">
                            <th>Sr.No</th>
                            <th>Source</th>
                            <th className="align_left_td td_width">Company Name</th>
                            <th className="align_left_td td_width">Contact Name</th>
                            <th className="align_left_td td_width">Product</th>
                            <th>Mobile</th>
                            <th style={{ width: '160px' }}>Date & Time</th>
                            <th>Days Attempted</th>
                            <th>Total Calls</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data?.leads?.length > 0 ? (
                            data.leads.map((lead, index) => (
                              <tr key={lead._id}>
                                <td>{(pagination.currentPage - 1) * itemsPerPage + index + 1}</td>
                                <td><span className="badge bg-secondary">{lead?.SOURCE}</span></td>
                                <td className="align_left_td td_width wrap-text-of-col">{lead?.SENDER_COMPANY || "Not available"}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{lead?.SENDER_NAME || "Not available"}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{lead?.QUERY_PRODUCT_NAME || "Not available"}</td>
                                <td>
                                  <a href={`tel:${lead?.SENDER_MOBILE}`} className="text-decoration-none">
                                    <i className="fa-solid fa-phone me-1"></i>
                                    {lead?.SENDER_MOBILE || "Not available"}
                                  </a>
                                </td>
                                {/* Proper IST time */}
                                <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                                  {formatLeadTime(lead?.QUERY_TIME || lead?.createdAt)}
                                </td>
                                <td className="text-center">{getUniqueDaysCount(lead)}</td>
                                <td className="text-center">{getCallAttemptBadge(lead)}</td>
                                <td>
                                  <span onClick={() => handleDetailsPopUpClick(lead)} title="View Details" style={{ cursor: 'pointer' }}>
                                    <i className="fa-solid fa-eye text-primary mx-1"></i>
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="10" className="text-center py-4">
                                <i className="fa-solid fa-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                                <p className="text-muted mt-2">No call unanswered leads found</p>
                              </td>
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

      {detailsServicePopUp && selectedLead && (
        <ViewSalesLeadPopUp
          closePopUp={() => { setDetailsServicePopUp(false); setSelectedLead(null); }}
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