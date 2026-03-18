import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../Header/Header";
import { Sidebar } from "../../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import { UserContext } from "../../../../../context/UserContext";
import ViewSalesLeadPopUp from "../../../CommonPopUp/ViewSalesLeadPopUp";

// ── IST time formatter ──
const formatLeadTime = (rawDate) => {
  if (!rawDate) return "—";
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return "—";
  const datePart = d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata",
  });
  return `${datePart} ${timePart}`;
};

const formatDateOnly = (rawDate) => {
  if (!rawDate) return "—";
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  }) + " " + d.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata",
  });
};

export const FeasibleLeadsPage = () => {
  const navigate = useNavigate();
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [detailsServicePopUp, setDetailsServicePopUp] = useState(false);
  const [selectedLead, setSelectedLead]               = useState(null);
  const [generatingPDF, setGeneratingPDF]             = useState(false);

  const { user } = useContext(UserContext);

  const [filters, setFilters] = useState({ date: null, source: null, search: "" });
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 0, totalRecords: 0,
    limit: 20, hasNextPage: true, hasPrevPage: false,
  });
  const itemsPerPage = 20;

  const [data,    setData]    = useState(null);
  const [allData, setAllData] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Fetch paginated (table) ──
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5443';
      const params = {
        page: pagination.currentPage, limit: itemsPerPage,
        ...(filters.source && { source: filters.source }),
        ...(filters.date   && { date:   filters.date   }),
        ...(filters.search && { search: filters.search }),
      };
      const res  = await fetch(`${API_URL}/api/leads/feasible-leads?${new URLSearchParams(params)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const json = await res.json();
      if (json.success) { setData(json); setPagination(prev => ({ ...prev, ...json.pagination })); }
      else throw new Error(json.error || 'Failed to fetch feasible leads');
    } catch (err) {
      toast.error(err.message || 'Failed to fetch feasible leads');
      setData(null);
    } finally { setLoading(false); }
  };

  // ── Fetch ALL (for PDF) ──
  const fetchAllLeads = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5443';
      const params = {
        page: 1, limit: 99999,
        ...(filters.source && { source: filters.source }),
        ...(filters.date   && { date:   filters.date   }),
        ...(filters.search && { search: filters.search }),
      };
      const res  = await fetch(`${API_URL}/api/leads/feasible-leads?${new URLSearchParams(params)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const json = await res.json();
      if (json.success) { setAllData(json); return json.leads || []; }
      return [];
    } catch (err) {
      console.error('Failed to fetch all leads:', err);
      return [];
    }
  };

  useEffect(() => { fetchLeads(); },    [pagination.currentPage, filters.source, filters.date, filters.search]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages)
      setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleDetailsPopUpClick = (lead) => { setSelectedLead(lead); setDetailsServicePopUp(true); };

  const handleChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value || null }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // ── PDF Report (window.print — no extra packages needed) ──
  const handlePrintReport = async () => {
    setGeneratingPDF(true);
    toast.loading("Preparing report...");

    try {
      const leads = await fetchAllLeads();
      toast.dismiss();

      const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const filterSummary = [
        filters.date   ? `Date: ${filters.date}`       : null,
        filters.source ? `Source: ${filters.source}`   : null,
        filters.search ? `Search: "${filters.search}"` : null,
      ].filter(Boolean).join(' | ') || 'All Records';

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
          <td>${lead.SOURCE || '—'}</td>
          <td>${lead.SENDER_COMPANY || '—'}</td>
          <td>${lead.SENDER_NAME || '—'}</td>
          <td>${lead.QUERY_PRODUCT_NAME || '—'}</td>
          <td>${lead.SENDER_MOBILE || '—'}</td>
          <td style="white-space:nowrap">${formatDateOnly(lead.assignedTime || lead.createdAt)}</td>
          <td>${lead.assignedTo?.name || 'Unassigned'}</td>
        </tr>
      `).join('');

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8"/>
          <title>Feasible Leads Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }

            .report-header {
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
              color: white; padding: 22px 28px 18px;
              display: flex; justify-content: space-between; align-items: flex-start;
            }
            .header-left .title { font-size: 20px; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; }
            .header-left .sub   { font-size: 12px; opacity: 0.8; }
            .header-right { text-align: right; font-size: 9.5px; opacity: 0.85; line-height: 1.9; }
            .header-right .gen  { font-size: 11px; font-weight: 600; opacity: 1; }

            .filter-bar {
              background: #f0f4ff; border-left: 4px solid #0f3460;
              padding: 8px 28px; font-size: 10px; color: #444;
              display: flex; gap: 20px; flex-wrap: wrap; align-items: center;
            }
            .filter-bar strong { color: #0f3460; }

            .summary-section { padding: 14px 28px 8px; }
            .section-title {
              font-size: 11px; font-weight: 700; color: #0f3460;
              text-transform: uppercase; letter-spacing: 1px;
              border-bottom: 2px solid #0f3460; padding-bottom: 4px; margin-bottom: 10px;
            }
            .summary-cards { display: flex; gap: 10px; }
            .s-card {
              flex: 1; border-radius: 6px; padding: 10px 12px;
              text-align: center; border: 1px solid #e0e0e0;
            }
            .s-card .cnt { font-size: 24px; font-weight: 800; line-height: 1; margin-bottom: 3px; }
            .s-card .lbl { font-size: 8.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; }
            .c-total   { background:#e8f4fd; color:#1565C0; }
            .c-pending { background:#fff8e1; color:#F57F17; }
            .c-ongoing { background:#e3f2fd; color:#0277BD; }
            .c-won     { background:#e8f5e9; color:#2E7D32; }
            .c-lost    { background:#fce4ec; color:#B71C1C; }

            .table-section { padding: 8px 28px 20px; }
            table { width: 100%; border-collapse: collapse; }
            thead tr { background: #0f3460; color: white; }
            thead th {
              padding: 8px 7px; text-align: left;
              font-size: 9px; font-weight: 600;
              text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap;
            }
            tbody tr { border-bottom: 1px solid #eef0f5; }
            tbody tr:nth-child(even) { background: #f8f9ff; }
            tbody td { padding: 6px 7px; font-size: 9.5px; color: #333; vertical-align: middle; }

            .status-badge {
              padding: 2px 7px; border-radius: 10px;
              font-size: 8.5px; font-weight: 700;
              text-transform: uppercase; letter-spacing: 0.4px;
            }
            .status-pending { background:#fff3cd; color:#856404; }
            .status-ongoing { background:#cfe2ff; color:#084298; }
            .status-won     { background:#d1e7dd; color:#0f5132; }
            .status-lost    { background:#f8d7da; color:#842029; }

            .report-footer {
              background: #f8f9ff; border-top: 2px solid #0f3460;
              padding: 10px 28px; display: flex; justify-content: space-between;
              font-size: 9px; color: #666;
            }
            .confidential { color: #B71C1C; font-weight: 700; font-size: 9.5px; }

            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { size: A4 landscape; margin: 8mm; }
            }
          </style>
        </head>
        <body>

          <!-- HEADER -->
          <div class="report-header">
            <div class="header-left">
              <div class="title">&#x1F4CA; Feasible Leads Report</div>
              <div class="sub">Sales Pipeline — Assigned Leads Analysis</div>
            </div>
            <div class="header-right">
              <div class="gen">Generated: ${now}</div>
              <div>Prepared By: ${user?.name || 'System'}</div>
              <div>Filters: ${filterSummary}</div>
              <div>Total Records: ${counts.total}</div>
            </div>
          </div>

          <!-- FILTER BAR -->
          <div class="filter-bar">
            <span><strong>Scope:</strong> ${filterSummary}</span>
            <span><strong>Date:</strong> ${now}</span>
            <span><strong>By:</strong> ${user?.name || 'System'}</span>
          </div>

          <!-- TABLE -->
          <div class="table-section">
            <div class="section-title">Detailed Leads Data (${counts.total} Records)</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Source</th>
                  <th>Company Name</th>
                  <th>Contact Name</th>
                  <th>Product</th>
                  <th>Mobile</th>
                  <th>Assigned Date & Time</th>
                  <th>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || '<tr><td colspan="9" style="text-align:center;padding:16px;color:#999;">No leads found</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- FOOTER -->
          <div class="report-footer">
            <div><span class="confidential">CONFIDENTIAL</span> — For Internal Use Only</div>
            <div>Feasible Leads Report &nbsp;|&nbsp; ${counts.total} records &nbsp;|&nbsp; ${now}</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
        </html>
      `;

      const pw = window.open('', '_blank', 'width=1200,height=850');
      if (!pw) {
        toast.error('Popup blocked! Please allow popups for this site.');
        setGeneratingPDF(false);
        return;
      }
      pw.document.write(printContent);
      pw.document.close();
      toast.success("Report opened — use Ctrl+P or Save as PDF");
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to generate report. Please try again.");
      console.error("PDF Error:", err);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <>
      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="MarketingMasterGrid" />
            <div className="main-panel"
              style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* ── Page Header ── */}
                <div className="row px-2 py-1 align-items-center mb-2">
                  <div className="col-12 col-lg-6 d-flex align-items-center gap-3">
                    <button onClick={() => navigate('/MarketingMasterGrid')}
                      className="btn btn-sm btn-light border" style={{ borderRadius: '6px', fontWeight: 500 }}>
                      <i className="fa-solid fa-arrow-left me-1"></i> Back
                    </button>
                    <h5 className="text-white py-2 mb-0">
                      <i className="fa-solid fa-check-circle me-2"></i>Feasible Leads
                    </h5>
                  </div>
                  <div className="col-12 col-lg-6 d-flex justify-content-end pe-4">
                    <button
                      className="btn btn-danger btn-sm d-flex align-items-center gap-2"
                      onClick={handlePrintReport}
                      disabled={generatingPDF}
                      style={{ borderRadius: '6px', fontWeight: 600, minWidth: 170 }}
                    >
                      {generatingPDF ? (
                        <><span className="spinner-border spinner-border-sm" role="status"></span> Generating...</>
                      ) : (
                        <><i className="fa-solid fa-file-pdf"></i> Download PDF Report</>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Filters ── */}
                <div className="row align-items-center p-2 m-1">
                  <div className="col-12 d-flex gap-2 flex-wrap">
                    <div className="input-group" style={{ maxWidth: '280px' }}>
                      <input type="text" className="form-control form-control-sm"
                        placeholder="Search company / mobile / name / assigned to..."
                        value={filters.search || ""} onChange={handleSearchChange} />
                      {filters.search && (
                        <button className="btn btn-outline-secondary btn-sm" type="button"
                          onClick={() => setFilters(prev => ({ ...prev, search: "" }))}>
                          <i className="fa-solid fa-times"></i>
                        </button>
                      )}
                    </div>
                    <input type="date" className="form-control form-control-sm" style={{ maxWidth: '170px' }}
                      onChange={(e) => handleChange('date', e.target.value)} value={filters.date || ""} />
                    <select className="form-select form-select-sm" style={{ maxWidth: '150px' }}
                      onChange={(e) => handleChange('source', e.target.value)} value={filters.source || ""}>
                      <option value="">All Sources</option>
                      <option value="IndiaMart">IndiaMart</option>
                      <option value="TradeIndia">TradeIndia</option>
                      <option value="Facebook">Facebook</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Google">Google</option>
                      <option value="Direct">Direct</option>
                      <option value="Other">Other</option>
                    </select>
                    {(filters.date || filters.source || filters.search) && (
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => {
                        setFilters({ date: null, source: null, search: "" });
                        setPagination(prev => ({ ...prev, currentPage: 1 }));
                      }}>
                        <i className="fa-solid fa-filter-circle-xmark me-1"></i>Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Table ── */}
                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-hover mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th>Sr.No</th>
                            <th>Source</th>
                            <th>Company Name</th>
                            <th>Contact Name</th>
                            <th>Product</th>
                            <th>Mobile</th>
                            <th>Assigned Date & Time</th>
                            <th>Assigned To</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data?.leads?.length > 0 ? (
                            data.leads.map((lead, index) => (
                              <tr key={lead._id}>
                                <td>{(pagination.currentPage - 1) * itemsPerPage + index + 1}</td>
                                <td><span className="badge bg-secondary">{lead?.SOURCE}</span></td>
                                <td>{lead?.SENDER_COMPANY || "Not available"}</td>
                                <td>{lead?.SENDER_NAME    || "Not available"}</td>
                                <td>{lead?.QUERY_PRODUCT_NAME || "Not available"}</td>
                                <td>
                                  <a href={`tel:${lead?.SENDER_MOBILE}`} className="text-decoration-none text-dark">
                                    {lead?.SENDER_MOBILE || "Not available"}
                                  </a>
                                </td>
                                {/* ✅ Assigned Date & Time */}
                                <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                                  {formatLeadTime(lead?.assignedTime || lead?.createdAt)}
                                </td>
                                {/* ✅ Assigned To */}
                                <td>
                                  {lead?.assignedTo ? (
                                    <div className="d-flex align-items-center gap-1">
                                      <span className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                                        style={{ width: 26, height: 26, fontSize: '0.68rem', flexShrink: 0 }}>
                                        {(lead.assignedTo?.name || 'U').charAt(0).toUpperCase()}
                                      </span>
                                      <span style={{ fontSize: '0.85rem' }}>{lead.assignedTo?.name || 'Unknown'}</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                                      <i className="fa-solid fa-user-slash me-1"></i>Unassigned
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="10" className="text-center py-5">
                                <i className="fa-solid fa-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                                <p className="text-muted mt-2 mb-0">No feasible leads found</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ── Pagination ── */}
                {!loading && pagination.totalPages > 1 && (
                  <div className="pagination-container text-center my-3">
                    <button onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage}
                      className="btn btn-dark btn-sm me-1">First</button>
                    <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage}
                      className="btn btn-dark btn-sm me-1">Previous</button>
                    {(() => {
                      const nums = []; const max = 5;
                      if (pagination.totalPages <= max) {
                        for (let i = 1; i <= pagination.totalPages; i++) nums.push(i);
                      } else {
                        let s = Math.max(1, pagination.currentPage - 2);
                        let e = Math.min(pagination.totalPages, s + max - 1);
                        if (e - s < max - 1) s = Math.max(1, e - max + 1);
                        for (let i = s; i <= e; i++) nums.push(i);
                      }
                      return nums.map(n => (
                        <button key={n} onClick={() => handlePageChange(n)}
                          className={`btn btn-sm me-1 ${pagination.currentPage === n ? 'btn-primary' : 'btn-dark'}`}
                          style={{ minWidth: '35px' }}>{n}</button>
                      ));
                    })()}
                    <button disabled={!pagination.hasNextPage}
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      className="btn btn-dark btn-sm me-1">Next</button>
                    <button onClick={() => handlePageChange(pagination.totalPages)} disabled={!pagination.hasNextPage}
                      className="btn btn-dark btn-sm">Last</button>
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

      {loading && <div className="overlay"><span className="loader"></span></div>}
    </>
  );
};