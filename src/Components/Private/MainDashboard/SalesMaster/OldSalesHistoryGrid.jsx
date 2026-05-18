import { useState, useEffect, useContext } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import { formatDateforTaskUpdate } from "../../../../utils/formatDate";
import { UserContext } from "../../../../context/UserContext";
import ViewSalesLeadPopUp from "../../CommonPopUp/ViewSalesLeadPopUp";
import AssignSalesLeadPopUp from "../SalesMaster/PopUp/AssignSalesLeadPopUp";
import useOldSalesHistory from "../../../../hooks/leads/useOldSalesHistory";
import useReassignLead from "../../../../hooks/leads/useReassignLead";

// ── Helper to generate Financial Years ──
const generateFinancialYears = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11
  const startYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  const years = [];
  for (let i = 0; i < 5; i++) {
    const fyStart = startYear - i;
    years.push(`${fyStart}-${fyStart + 1}`);
  }
  return years;
};

export const OldSalesHistoryGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [showLeadPopUp, setShowLeadPopUp] = useState(false);
  const [assignPopUpShow, setAssignPopUpShow] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedYear, setSelectedYear] = useState(generateFinancialYears()[0]);
  
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 0, totalRecords: 0,
    limit: 20, hasNextPage: true, hasPrevPage: false,
  });
  const itemsPerPage = 20;

  const [filters, setFilters] = useState({ source: null, searchTerm: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const { user } = useContext(UserContext);
  const { reassignLead } = useReassignLead();

  const isCompanyOrManager = user?.user === 'company' || user?.permissions?.includes("viewSalesManagerMaster");
  const canAssignLead = user?.permissions?.includes('updateLead') || user?.user === 'company';

  // ✅ MOVED HOOKS BEFORE CONDITIONAL RETURN
  const { data, loading, error, refetch } = useOldSalesHistory(
    isCompanyOrManager ? selectedYear : null, 
    isCompanyOrManager ? pagination.currentPage : 1, 
    itemsPerPage, 
    { ...filters, searchTerm: debouncedSearch }
  );

  const fyYears = generateFinancialYears();
  const displayLeads = data?.leads || [];
  const historyCounts = data?.historyCounts || {};

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.searchTerm), 500);
    return () => clearTimeout(t);
  }, [filters.searchTerm]);

  useEffect(() => {
    if (data && isCompanyOrManager) setPagination(prev => ({ ...prev, ...data.pagination }));
    if (error) toast.error(error.message || "An error occurred");
  }, [data, error, isCompanyOrManager]);

  useEffect(() => {
    if (isCompanyOrManager) {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }
  }, [selectedYear, filters.source, debouncedSearch, isCompanyOrManager]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages)
      setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleChange = (filterType, value) => setFilters(prev => ({ ...prev, [filterType]: value || null }));
  const handleSearchChange = (e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }));
  const resetSearch  = () => { setFilters(prev => ({ ...prev, searchTerm: "" })); setDebouncedSearch(""); };
  const resetFilters = () => {
    setFilters({ source: null, searchTerm: "" });
    setDebouncedSearch(""); setPagination(prev => ({ ...prev, currentPage: 1 })); refetch();
  };

  const handleDetailsPopUpClick = (lead) => { setSelectedLead(lead); setShowLeadPopUp(true); };
  const handleAssign = (lead = null) => { setSelectedLead(lead); setAssignPopUpShow(true); };

  const handleAssignSubmit = async (id, assignData) => { 
    try { 
      toast.loading("Transferring lead..."); 
      const res = await reassignLead(id, assignData); 
      toast.dismiss(); 
      if (res?.success) { 
        toast.success(res?.message || "Lead transferred and reactivated successfully!"); 
        setAssignPopUpShow(false); setSelectedLead(null); refetch(); 
      } else { 
        toast.error(res?.error || "Failed to transfer"); 
      } 
    } catch { 
      toast.error("Failed to transfer lead"); 
    } 
  };

  const handleBgColor = (status) => {
    switch ((status || "").toString().trim()) {
      case "Won": return "badge bg-success text-white";
      case "Lost": return "badge bg-danger text-white";
      default: return "badge bg-secondary";
    }
  };

  const formatAmount = (val) => (!val || val <= 0) ? null : '₹' + Number(val).toLocaleString('en-IN');

  // ✅ ACCESS DENIED CHECK AFTER ALL HOOKS
  if (!isCompanyOrManager) {
    return (
      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen}/>
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="OldSalesHistory"/>
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="alert alert-danger m-3">
                  <h4 className="alert-heading">Access Denied</h4>
                  <p>Only company administrators or Sales Managers can access Old Sales History.</p>
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
      {loading && (<div className="overlay"><span className="loader"></span></div>)}
      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen}/>
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="OldSalesHistory"/>
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                <div className="row px-2 py-1 mb-3">
                  <div className="col-12 col-lg-6">
                    <h5 className="text-white py-2">
                      <i className="fa-solid fa-clock-rotate-left me-2"></i>
                      Old Sales History (Transfer Closed Leads)
                    </h5>
                  </div>
                </div>

                <div className="row align-items-center p-3 m-1 bg-light rounded mb-3 border" style={{ borderColor: '#6366f1' }}>
                  <div className="col-12 col-lg-5 mb-2 mb-lg-0">
                    <label className="form-label fw-bold mb-1" style={{ color: '#6366f1' }}>
                      <i className="fa-solid fa-calendar-days me-2"></i>Select Financial Year (1st Apr - 31st Mar)
                    </label>
                    <select className="form-select fw-bold" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ borderColor: '#6366f1', color: '#1e293b' }}>
                      {fyYears.map(year => (
                        <option key={year} value={year}>FY {year} (Apr {year.split('-')[0]} - Mar {year.split('-')[1]})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedYear && (
                  <>
                    <div className="row m-1 mb-3">
                      <div className="col-md-3 mb-2">
                        <div className="card shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)' }}>
                          <div className="card-body text-center py-3">
                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Total Closed</div>
                            <h2 className="fw-bold mb-0" style={{ color: '#4f46e5' }}>{historyCounts.totalRecords || 0}</h2>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3 mb-2">
                        <div className="card shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
                          <div className="card-body text-center py-3">
                            <div style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>Won Deals</div>
                            <h2 className="fw-bold mb-0 text-success">{historyCounts.wonCount || 0}</h2>
                            <small className="text-muted">₹{Number(historyCounts.totalWonAmount || 0).toLocaleString('en-IN')}</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3 mb-2">
                        <div className="card shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #fecdd3 100%)' }}>
                          <div className="card-body text-center py-3">
                            <div style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: 600 }}>Lost Deals</div>
                            <h2 className="fw-bold mb-0 text-danger">{historyCounts.lostCount || 0}</h2>
                            <small className="text-muted">₹{Number(historyCounts.totalLostAmount || 0).toLocaleString('en-IN')}</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="alert alert-warning d-flex align-items-center gap-2 py-2 px-3 m-1 mb-2" style={{ borderRadius: '8px', fontSize: '0.85rem' }}>
                      <i className="fa-solid fa-circle-info"></i>
                      <span>Transferring a closed (Won/Lost) lead will automatically <strong>reactivate</strong> it as <strong>"Ongoing"</strong> for the new employee.</span>
                    </div>

                    <div className="row align-items-center p-3 m-1 bg-light rounded mb-2">
                      <div className="col-12 col-lg-6">
                        <div className="input-group">
                          <input type="text" className="form-control" placeholder="Search company, mobile, contact..." value={filters.searchTerm || ""} onChange={handleSearchChange} />
                          {filters.searchTerm && (<button className="btn btn-outline-secondary" type="button" onClick={resetSearch}><i className="fa-solid fa-times"></i></button>)}
                          <button className="btn btn-primary" type="button"><i className="fa-solid fa-search"></i></button>
                        </div>
                      </div>
                      <div className="col-12 col-lg-4 ms-auto text-end mt-2 mt-lg-0">
                        <div className="row g-2">
                          <div className="col">
                            <select className="form-select" onChange={e => handleChange("source", e.target.value)} value={filters.source || ""}>
                              <option value="">All Sources...</option>
                              <option value="Direct">Direct</option>
                              <option value="IndiaMart">IndiaMart</option>
                              <option value="TradeIndia">TradeIndia</option>
                              <option value="Google">Google</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="col">
                            <button className="btn btn-outline-secondary w-100" type="button" onClick={resetFilters}><i className="fa-solid fa-filter-circle-xmark"></i> Reset</button>
                          </div>
                        </div>
                      </div>
                    </div>

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
                                <th style={{ width:"120px" }}>Amount</th>
                                <th style={{ width:"120px" }}>Closed Date</th>
                                <th style={{ width:"80px" }}>Status</th>
                                <th className="text-center" style={{ width:"140px" }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayLeads.length > 0 ? (
                                displayLeads.map((lead, index) => (
                                  <tr key={lead._id}>
                                    <td className="text-center">{(pagination.currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td>{lead.SENDER_COMPANY || "—"}</td>
                                    <td className="text-start">{lead.SENDER_NAME || "—"}</td>
                                    <td className="text-start">{lead.QUERY_PRODUCT_NAME || "—"}</td>
                                    <td><small className="text-muted">{lead.SOURCE}</small></td>
                                    <td>{lead.quotation > 0 ? <span style={{ color: '#15803d', fontWeight: 700 }}>{formatAmount(lead.quotation)}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                                    <td><small className="text-muted">{formatDateforTaskUpdate(lead.updatedAt || lead.createdAt)}</small></td>
                                    <td><span className={handleBgColor(lead.STATUS)}>{lead.STATUS}</span></td>
                                    <td className="text-center">
                                      <div className="d-flex justify-content-center gap-1">
                                        <button className="btn btn-sm btn-outline-info" onClick={() => handleDetailsPopUpClick(lead)} title="View"><i className="fa-solid fa-eye"></i></button>
                                        {canAssignLead && (
                                          <button className="btn btn-sm btn-outline-warning" onClick={() => handleAssign(lead)} title="Transfer Lead"><i className="fa-solid fa-share me-1"></i>Transfer</button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr><td colSpan="9" className="text-center py-4"><div className="text-muted"><i className="fa-solid fa-inbox fa-2x mb-2"></i><p className="mb-0">No closed deals found for FY {selectedYear}.</p></div></td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {!loading && pagination.totalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
                        <nav><ul className="pagination mb-0">
                          <li className={`page-item ${!pagination.hasPrevPage ? "disabled" : ""}`}><button className="page-link" onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage}>First</button></li>
                          <li className={`page-item ${!pagination.hasPrevPage ? "disabled" : ""}`}><button className="page-link" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage}>Previous</button></li>
                          {(() => {
                            const pages = []; const max = 5; let start = Math.max(1, pagination.currentPage - 2); let end = Math.min(pagination.totalPages, start + max - 1);
                            if (end - start < max - 1) start = Math.max(1, end - max + 1);
                            for (let i = start; i <= end; i++) pages.push(i);
                            return pages.map(n => (<li key={n} className={`page-item ${pagination.currentPage === n ? "active" : ""}`}><button className="page-link" onClick={() => handlePageChange(n)}>{n}</button></li>));
                          })()}
                          <li className={`page-item ${!pagination.hasNextPage ? "disabled" : ""}`}><button className="page-link" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.hasNextPage}>Next</button></li>
                          <li className={`page-item ${!pagination.hasNextPage ? "disabled" : ""}`}><button className="page-link" onClick={() => handlePageChange(pagination.totalPages)} disabled={!pagination.hasNextPage}>Last</button></li>
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

      {showLeadPopUp && selectedLead && (<ViewSalesLeadPopUp closePopUp={() => { setShowLeadPopUp(false); setSelectedLead(null); }} selectedLead={selectedLead}/>)}
      {assignPopUpShow && selectedLead && (<AssignSalesLeadPopUp selectedLead={selectedLead} onUpdate={handleAssignSubmit} onClose={() => { setAssignPopUpShow(false); setSelectedLead(null); }} />)}
    </>
  );
};

export default OldSalesHistoryGrid;