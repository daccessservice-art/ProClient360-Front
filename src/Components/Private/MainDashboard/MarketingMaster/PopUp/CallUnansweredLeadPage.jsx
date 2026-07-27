import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { Header } from "../../Header/Header";
import { Sidebar } from "../../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import { UserContext } from "../../../../../context/UserContext";
import ViewSalesLeadPopUp from "../../../CommonPopUp/ViewSalesLeadPopUp";
import useCallUnansweredLeads from "../../../../../hooks/leads/CallUnansweredLeadPage";

// ── IST time formatter (for table cells) ──
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

// ── Plain string version for Excel cells (no "—" glyph issues, no JSX) ──
const formatLeadTimeForExcel = (rawDate) => {
  if (!rawDate) return "Not available";
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return "Not available";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
};

export const CallUnansweredLeadsPage = () => {
  const navigate = useNavigate();
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [detailsServicePopUp, setDetailsServicePopUp] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);

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

  // ══════════════════════════════════════════════════════════════
  //  EXCEL EXPORT — fetches ALL matching leads (ignores pagination)
  // ══════════════════════════════════════════════════════════════
  const fetchAllCallUnansweredLeads = async () => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5443';
    const params = new URLSearchParams({
      page: 1,
      limit: 99999,
      ...(filters.source && { source: filters.source }),
      ...(filters.date && { date: filters.date }),
    });

    const res = await fetch(`${API_URL}/api/leads/call-unanswered?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Failed to fetch leads for export');
    }
    return json.leads || [];
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    const toastId = toast.loading("Preparing Excel file...");

    try {
      const leads = await fetchAllCallUnansweredLeads();

      if (leads.length === 0) {
        toast.dismiss(toastId);
        toast.error("No call unanswered leads to export.");
        return;
      }

      const rows = leads.map((lead, index) => {
        const uniqueDays = lead.callHistory
          ? [...new Set(lead.callHistory.map(c => c.day))].length
          : 0;
        const totalCalls = lead.callHistory ? lead.callHistory.length : 0;

        // Build a compact "Day1: 2, Day2: 3, Day3: 3" style summary
        const callBreakdown = lead.callHistory && lead.callHistory.length > 0
          ? [1, 2, 3]
              .map(day => {
                const count = lead.callHistory.filter(c => c.day === day).length;
                return count > 0 ? `Day ${day}: ${count}/3` : null;
              })
              .filter(Boolean)
              .join(', ')
          : 'No calls recorded';

        return {
          "Sr.No": index + 1,
          "Source": lead.SOURCE || "Not available",
          "Company Name": lead.SENDER_COMPANY || "Not available",
          "Contact Name": lead.SENDER_NAME || "Not available",
          "Product": lead.QUERY_PRODUCT_NAME || "Not available",
          "Mobile": lead.SENDER_MOBILE || "Not available",
          "Email": lead.SENDER_EMAIL || "Not available",
          "Date & Time": formatLeadTimeForExcel(lead.QUERY_TIME || lead.createdAt),
          "Days Attempted": uniqueDays,
          "Total Calls": totalCalls,
          "Call Breakdown": callBreakdown,
          "First Call Date": formatLeadTimeForExcel(lead.firstCallDate),
          "Remark": lead.remark || "",
          "Assigned By": lead.assignedBy?.name || "—",
          "Assigned To": lead.assignedTo?.name || "Unassigned",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Reasonable column widths so it doesn't look cramped in Excel
      worksheet["!cols"] = [
        { wch: 6 },  // Sr.No
        { wch: 12 }, // Source
        { wch: 24 }, // Company Name
        { wch: 20 }, // Contact Name
        { wch: 24 }, // Product
        { wch: 14 }, // Mobile
        { wch: 24 }, // Email
        { wch: 20 }, // Date & Time
        { wch: 14 }, // Days Attempted
        { wch: 12 }, // Total Calls
        { wch: 28 }, // Call Breakdown
        { wch: 20 }, // First Call Date
        { wch: 30 }, // Remark
        { wch: 18 }, // Assigned By
        { wch: 18 }, // Assigned To
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Call Unanswered Leads");

      const dateStamp = new Date().toISOString().slice(0, 10);
      const fileName = `Call-Unanswered-Leads_${dateStamp}.xlsx`;

      XLSX.writeFile(workbook, fileName);

      toast.dismiss(toastId);
      toast.success(`Exported ${leads.length} lead${leads.length > 1 ? 's' : ''} to Excel`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to export Excel file");
      console.error("Excel export error:", err);
    } finally {
      setExportingExcel(false);
    }
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

                {/* Header with Back Button + Export */}
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
                  <div className="col-12 col-lg-6 d-flex justify-content-end pe-4">
                    <button
                      className="btn btn-success btn-sm d-flex align-items-center gap-2"
                      onClick={handleExportExcel}
                      disabled={exportingExcel}
                      style={{ borderRadius: '6px', fontWeight: 600, minWidth: 170 }}
                    >
                      {exportingExcel ? (
                        <><span className="spinner-border spinner-border-sm" role="status"></span> Exporting...</>
                      ) : (
                        <><i className="fa-solid fa-file-excel"></i> Export to Excel</>
                      )}
                    </button>
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