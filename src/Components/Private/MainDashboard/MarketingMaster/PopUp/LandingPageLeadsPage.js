import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Header } from "../../Header/Header";
import { Sidebar } from "../../Sidebar/Sidebar";
import { UserContext } from "../../../../../context/UserContext";
import DeletePopUP from "../../../CommonPopUp/DeletePopUp";
import useLandingPageLeads, {
  moveLandingLeadToMarketing,
  moveLandingLeadsBulk,
  deleteLandingLead,
} from "../../../../../hooks/leads/useLandingPageLeads";

const formatIST = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "—";
  const datePart = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const timePart = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  return `${datePart} ${timePart}`;
};

const truncate = (t, n = 50) => (!t || t.length <= n ? t : t.substring(0, n) + "...");

export const LandingPageLeadsPage = () => {
  const navigate = useNavigate();
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const { user } = useContext(UserContext);
  const canMove   = user?.permissions?.includes("createLead") || user?.user === "company";
  const canDelete = user?.permissions?.includes("deleteLead") || user?.user === "company";

  const itemsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ landingPage: "", status: "", date: "", search: "" });
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewLead, setViewLead] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const { data, loading, refetch } = useLandingPageLeads(currentPage, itemsPerPage, filters);

  const pagination = data?.pagination || { currentPage: 1, totalPages: 0, totalRecords: 0, hasNextPage: false, hasPrevPage: false };
  const stats = data?.stats || { total: 0, newCount: 0, movedCount: 0, landingPages: [] };
  const leads = data?.leads || [];

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      const value = searchInput.trim();
      setFilters(prev => (prev.search === value ? prev : { ...prev, search: value }));
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setSelectedIds([]); }, [data]);

  const changeFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters(prev => ({ landingPage: prev.landingPage, status: "", date: "", search: "" }));
    setSearchInput("");
    setCurrentPage(1);
  };

  const handlePageChange = (p) => {
    if (p >= 1 && p <= pagination.totalPages) setCurrentPage(p);
  };

  // Selection (only "new" leads can be moved)
  const newLeadsOnPage = leads.filter(l => l.status === "new");
  const allSelected = newLeadsOnPage.length > 0 && newLeadsOnPage.every(l => selectedIds.includes(l._id));
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : newLeadsOnPage.map(l => l._id));
  const toggleSelect = (id) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleMove = async (id) => {
    setActionLoading(true);
    const t = toast.loading("Moving to Marketing...");
    const res = await moveLandingLeadToMarketing(id);
    toast.dismiss(t);
    setActionLoading(false);
    if (res?.success) {
      toast.success(res.message || "Lead moved to Marketing Master");
      setViewLead(null);
      refetch();
    } else {
      toast.error(res?.error || "Failed to move lead");
    }
  };

  const handleBulkMove = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    const t = toast.loading(`Moving ${selectedIds.length} lead(s)...`);
    const res = await moveLandingLeadsBulk(selectedIds);
    toast.dismiss(t);
    setActionLoading(false);
    if (res?.success) toast.success(res.message);
    else toast.error(res?.error || "Failed to move leads");
    refetch();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const t = toast.loading("Deleting...");
    const res = await deleteLandingLead(deleteId);
    toast.dismiss(t);
    if (res?.success) {
      toast.success(res.message || "Deleted");
      setDeleteId(null);
      refetch();
    } else {
      toast.error(res?.error || "Failed to delete");
    }
  };

  const StatusBadge = ({ lead }) =>
    lead.status === "moved" ? (
      <span className="badge bg-success"
        title={`${lead.autoMoved ? "Auto added" : `Moved by ${lead.movedBy?.name || "—"}`} on ${formatIST(lead.movedAt)}`}>
        <i className="fa-solid fa-check me-1"></i>{lead.autoMoved ? "In Marketing (Auto)" : "Moved"}
      </span>
    ) : (
      <span className="badge bg-warning text-dark">
        <i className="fa-solid fa-star me-1"></i>New
      </span>
    );

  const tabs = [{ name: "", label: "All", total: stats.total, newCount: stats.newCount }]
    .concat(stats.landingPages.map(p => ({ name: p.name, label: p.name, total: p.total, newCount: p.newCount })));

  return (
    <>
      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="MarketingMasterGrid" />
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* Header */}
                <div className="row px-2 py-1 align-items-center">
                  <div className="col-12 col-lg-6 d-flex align-items-center gap-3">
                    <button onClick={() => navigate("/MarketingMasterGrid")} className="btn btn-sm btn-light border"
                      style={{ borderRadius: "6px", fontWeight: 500 }}>
                      <i className="fa-solid fa-arrow-left me-1"></i> Back
                    </button>
                    <h5 className="text-white py-2 mb-0">
                      <i className="fa-solid fa-globe me-2"></i>Landing Page Leads
                    </h5>
                  </div>
                  <div className="col-12 col-lg-6 d-flex justify-content-end pe-4">
                    {canMove && selectedIds.length > 0 && (
                      <button className="btn btn-primary btn-sm" onClick={handleBulkMove} disabled={actionLoading}
                        style={{ borderRadius: "6px", fontWeight: 600 }}>
                        <i className="fa-solid fa-share me-1"></i>
                        Move Selected to Marketing ({selectedIds.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="row bg-white p-3 m-1 border rounded">
                  {[
                    { label: "Total Received", value: stats.total, color: "#1565C0", bg: "#DDEEFF", icon: "fa-globe" },
                    { label: "New (Not in Marketing)", value: stats.newCount, color: "#E65100", bg: "#FFF3E0", icon: "fa-star" },
                    { label: "In Marketing Master", value: stats.movedCount, color: "#2E7D32", bg: "#E8F5E9", icon: "fa-check-circle" },
                  ].map((s) => (
                    <div className="col-12 col-md-4 mb-2 mb-md-0" key={s.label}>
                      <div className="p-3 d-flex justify-content-between align-items-center"
                        style={{ backgroundColor: s.bg, borderRadius: "12px" }}>
                        <div>
                          <h6 className="text-dark mb-1" style={{ fontSize: "0.82rem", fontWeight: 600 }}>{s.label}</h6>
                          <h3 className="fw-bold mb-0" style={{ color: s.color }}>{s.value || 0}</h3>
                        </div>
                        <i className={`fa-solid ${s.icon}`} style={{ fontSize: "2.2rem", color: s.color, opacity: 0.4 }}></i>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Landing page tabs */}
                <div className="row p-2 m-1">
                  <div className="col-12 d-flex gap-2 flex-wrap">
                    {tabs.map(tab => {
                      const active = filters.landingPage === tab.name;
                      return (
                        <button key={tab.name || "all"} type="button"
                          className={`btn btn-sm ${active ? "btn-primary" : "btn-light border"}`}
                          style={{ borderRadius: "20px", fontWeight: 600 }}
                          onClick={() => changeFilter("landingPage", tab.name)}>
                          {tab.label}
                          <span className={`badge ms-2 ${active ? "bg-light text-dark" : "bg-secondary"}`}>{tab.total || 0}</span>
                          {tab.newCount > 0 && (
                            <span className="badge ms-1 bg-warning text-dark" title="Not yet in Marketing">{tab.newCount} new</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filters */}
                <div className="row align-items-center p-2 m-1">
                  <div className="col-12 d-flex gap-2 flex-wrap justify-content-end">
                    <input type="text" className="form-control form-control-sm" style={{ maxWidth: "260px" }}
                      placeholder="Search name / email / phone / remark..."
                      value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                    <input type="date" className="form-control form-control-sm" style={{ maxWidth: "170px" }}
                      value={filters.date} onChange={(e) => changeFilter("date", e.target.value)} />
                    <select className="form-select form-select-sm" style={{ maxWidth: "180px" }}
                      value={filters.status} onChange={(e) => changeFilter("status", e.target.value)}>
                      <option value="">All Status</option>
                      <option value="new">New</option>
                      <option value="moved">In Marketing</option>
                    </select>
                    {(filters.date || filters.status || filters.search) && (
                      <button className="btn btn-outline-light btn-sm" onClick={resetFilters}>
                        <i className="fa-solid fa-filter-circle-xmark me-1"></i>Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-hover table-class mb-0">
                        <thead className="table-light">
                          <tr className="th_border">
                            {canMove && (
                              <th style={{ width: "40px" }}>
                                <input type="checkbox" className="form-check-input" checked={allSelected}
                                  disabled={newLeadsOnPage.length === 0} onChange={toggleSelectAll} title="Select all new leads" />
                              </th>
                            )}
                            <th>Sr.No</th>
                            <th>Landing Page</th>
                            <th className="align_left_td">Name</th>
                            <th className="align_left_td">Email</th>
                            <th>Phone</th>
                            <th style={{ minWidth: "200px" }}>Remark</th>
                            <th>Received</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leads.length > 0 ? (
                            leads.map((lead, index) => {
                              const isExp = expanded[lead._id];
                              const remark = lead.remark || "—";
                              const long = remark.length > 50;
                              return (
                                <tr key={lead._id}>
                                  {canMove && (
                                    <td>
                                      {lead.status === "new" && (
                                        <input type="checkbox" className="form-check-input"
                                          checked={selectedIds.includes(lead._id)} onChange={() => toggleSelect(lead._id)} />
                                      )}
                                    </td>
                                  )}
                                  <td>{(pagination.currentPage - 1) * itemsPerPage + index + 1}</td>
                                  <td><span className="badge bg-info text-dark">{lead.landingPage}</span></td>
                                  <td className="align_left_td wrap-text-of-col">{lead.name}</td>
                                  <td className="align_left_td wrap-text-of-col">{lead.email || "Not available"}</td>
                                  <td>
                                    <a href={`tel:${lead.phone}`} className="text-decoration-none">
                                      <i className="fa-solid fa-phone me-1"></i>{lead.phone}
                                    </a>
                                  </td>
                                  <td style={{ fontSize: "0.85rem", cursor: long ? "pointer" : "default" }}
                                    onClick={() => long && setExpanded(p => ({ ...p, [lead._id]: !p[lead._id] }))}>
                                    {isExp || !long ? remark : truncate(remark)}
                                    {long && (
                                      <span className="text-primary fw-bold" style={{ fontSize: "0.75rem" }}>
                                        {isExp ? " Show less" : " Show more"}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>{formatIST(lead.createdAt)}</td>
                                  <td><StatusBadge lead={lead} /></td>
                                  <td style={{ whiteSpace: "nowrap" }}>
                                    {canMove && lead.status === "new" && (
                                      <span onClick={() => !actionLoading && handleMove(lead._id)} title="Move to Marketing" style={{ cursor: "pointer" }}>
                                        <i className="mx-1 fa-solid fa-share text-success"></i>
                                      </span>
                                    )}
                                    <span onClick={() => setViewLead(lead)} title="View Details" style={{ cursor: "pointer" }}>
                                      <i className="fa-solid fa-eye text-primary mx-1"></i>
                                    </span>
                                    {canDelete && (
                                      <span onClick={() => setDeleteId(lead._id)} title="Delete" style={{ cursor: "pointer" }}>
                                        <i className="fa-solid fa-trash text-danger mx-1"></i>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={canMove ? 10 : 9} className="text-center py-4">
                                <i className="fa-solid fa-inbox text-muted" style={{ fontSize: "3rem" }}></i>
                                <p className="text-muted mt-2 mb-0">No landing page leads found</p>
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
                    <button onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage} className="btn btn-dark btn-sm me-1">First</button>
                    <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage} className="btn btn-dark btn-sm me-1">Previous</button>
                    {(() => {
                      const nums = []; const max = 5;
                      let s = Math.max(1, pagination.currentPage - 2);
                      let e = Math.min(pagination.totalPages, s + max - 1);
                      if (e - s < max - 1) s = Math.max(1, e - max + 1);
                      for (let i = s; i <= e; i++) nums.push(i);
                      return nums.map(n => (
                        <button key={n} onClick={() => handlePageChange(n)}
                          className={`btn btn-sm me-1 ${pagination.currentPage === n ? "btn-primary" : "btn-dark"}`}
                          style={{ minWidth: "35px" }}>{n}</button>
                      ));
                    })()}
                    <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.hasNextPage} className="btn btn-dark btn-sm me-1">Next</button>
                    <button onClick={() => handlePageChange(pagination.totalPages)} disabled={!pagination.hasNextPage} className="btn btn-dark btn-sm">Last</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View details popup */}
      {viewLead && (
        <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ width: "600px", maxWidth: "95%" }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold"><i className="fa-solid fa-globe me-2 text-primary"></i>Landing Page Lead</h5>
                <button type="button" className="btn-close" onClick={() => setViewLead(null)}></button>
              </div>
              <div className="modal-body">
                <table className="table table-sm table-bordered mb-0">
                  <tbody>
                    <tr><th style={{ width: "35%" }}>Landing Page</th><td>{viewLead.landingPage}</td></tr>
                    <tr><th>Name</th><td>{viewLead.name}</td></tr>
                    <tr><th>Email</th><td>{viewLead.email || "Not available"}</td></tr>
                    <tr><th>Phone</th><td><a href={`tel:${viewLead.phone}`}>{viewLead.phone}</a></td></tr>
                    <tr><th>Remark</th><td style={{ whiteSpace: "pre-wrap" }}>{viewLead.remark || "—"}</td></tr>
                    <tr><th>Received</th><td>{formatIST(viewLead.createdAt)}</td></tr>
                    <tr><th>Page URL</th><td style={{ wordBreak: "break-all" }}>{viewLead.pageUrl || "—"}</td></tr>
                    <tr><th>Status</th><td><StatusBadge lead={viewLead} /></td></tr>
                    {viewLead.status === "moved" && (
                      <tr><th>Moved</th><td>{viewLead.autoMoved ? "Auto added" : (viewLead.movedBy?.name || "—")} — {formatIST(viewLead.movedAt)}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                {canMove && viewLead.status === "new" && (
                  <button className="btn btn-primary" disabled={actionLoading} onClick={() => handleMove(viewLead._id)}>
                    <i className="fa-solid fa-share me-1"></i>Move to Marketing
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setViewLead(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <DeletePopUP
          message={"Delete this landing page lead? (If it is already in Marketing, the Marketing lead stays.)"}
          heading={"Delete Landing Page Lead"}
          cancelBtnCallBack={() => setDeleteId(null)}
          confirmBtnCallBack={handleDeleteConfirm}
        />
      )}

      {loading && <div className="overlay"><span className="loader"></span></div>}
    </>
  );
};