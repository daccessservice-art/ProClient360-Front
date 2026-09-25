import { useState, useEffect, useRef } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddAMCHistoryPopUp from "./PopUp/AddAMCHistoryPopUp";
import UpdateAMCHistoryPopUp from "./PopUp/UpdateAMCHistoryPopUp";
import {
  getOldAMCHistory,
  importOldAMCHistory,
  deleteOldAMCHistory,
  exportOldAMCHistoryPDF,
  exportOldAMCHistoryExcel,
} from "../../../../hooks/useOldAMCHistory";
import toast from "react-hot-toast";

// How many days before an AMC contract's End Date the row should start blinking.
// Keep this in sync with the same constant used on the Employee Dashboard's "AMC Expiry Alerts" tab.
const ALERT_WINDOW_DAYS = 50;

// Figure out if a record's End Date is expired / expiring soon.
// Returns null if it's outside the alert window (no highlight needed).
const getAMCExpiryInfo = (endDateStr) => {
  if (!endDateStr) return null;
  const end = new Date(endDateStr);
  if (isNaN(end.getTime())) return null;
  end.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + ALERT_WINDOW_DAYS);

  if (end > windowEnd) return null;

  const diffDays = Math.round((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { expired: true, label: `Expired ${Math.abs(diffDays)}d ago` };
  }
  if (diffDays === 0) {
    return { expired: true, label: "Expires Today" };
  }
  return { expired: false, label: `${diffDays}d left` };
};

// ── NEW: Active / Running contract info.
// Active = End Date is still more than ALERT_WINDOW_DAYS away AND Start Date has already
// started (or no Start Date). Returns null otherwise. ──
const getActiveInfo = (startDateStr, endDateStr) => {
  if (!endDateStr) return null;
  const end = new Date(endDateStr);
  if (isNaN(end.getTime())) return null;
  end.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDateStr) {
    const start = new Date(startDateStr);
    if (!isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      if (start > today) return null; // contract not started yet
    }
  }

  const diffDays = Math.round((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= ALERT_WINDOW_DAYS) return null; // expiring / expired handled by red blinker
  return { label: `Active · ${diffDays}d left` };
};

// Next Follow-up Date info. Returns null if no date.
// due = true when follow-up is today or already passed (→ YELLOW blinker) ──
const getFollowUpInfo = (dateStr) => {
  if (!dateStr) return null;
  const fu = new Date(dateStr);
  if (isNaN(fu.getTime())) return null;
  fu.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((fu - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { due: true, label: `Follow-up ${Math.abs(diffDays)}d ago` };
  if (diffDays === 0) return { due: true, label: "Follow-up Today" };
  return { due: false, label: `in ${diffDays}d` };
};

// ── Row status priority:
// 1) In Process + follow-up due/passed → "followup" (YELLOW)
// 2) In Process + in expiry window     → "inprocess" (BLUE)
// 3) Expired                           → "expired"   (DARK RED)
// 4) Expiring soon                     → "expiring"  (RED)
// 5) Otherwise                         → null (no blink) ──
const getRowStatus = (expiryInfo, followUpInfo, inProcess, lost, activeInfo) => {
  if (lost) return "lost"; // Lost overrides everything, no blinker
  if (inProcess && followUpInfo?.due) return "followup";
  if (inProcess && expiryInfo) return "inprocess";
  if (expiryInfo) return expiryInfo.expired ? "expired" : "expiring";
  if (activeInfo) return "active"; // ── NEW: running contract → GREEN blinker ──
  return null;
};

const STATUS_STYLES = {
  // ── NEW: Active / Running — green blinker ──
  active: {
    animation: "amcBlinkGreen 1.6s infinite", border: "#15803d",
    inset: "rgba(34,197,94,0.06)", badgeBg: "#22c55e", badgeText: "#052e16",
    glow: "0 0 6px rgba(34,197,94,0.9)",
  },
  // ── NEW: Lost — grey, NOT blinking ──
  lost: {
    animation: "none", border: "#475569",
    inset: "rgba(71,85,105,0.10)", badgeBg: "#475569", badgeText: "#fff",
    glow: "none",
  },
  followup: {
    animation: "amcBlinkYellow 1s infinite", border: "#ca8a04",
    inset: "rgba(234,179,8,0.12)", badgeBg: "#facc15", badgeText: "#422006",
    glow: "0 0 6px rgba(234,179,8,0.95)",
  },
  inprocess: {
    animation: "amcBlinkBlue 1s infinite", border: "#1d4ed8",
    inset: "rgba(37,99,235,0.08)", badgeBg: "#1d4ed8", badgeText: "#fff",
    glow: "0 0 6px rgba(37,99,235,0.9)",
  },
  expired: {
    animation: "amcBlinkDarkRed 1s infinite", border: "#8b0000",
    inset: "rgba(139,0,0,0.10)", badgeBg: "#8b0000", badgeText: "#fff",
    glow: "0 0 6px rgba(139,0,0,0.9)",
  },
  expiring: {
    animation: "amcBlinkRed 1s infinite", border: "#dc2626",
    inset: "rgba(220,38,38,0.08)", badgeBg: "#dc2626", badgeText: "#fff",
    glow: "0 0 6px rgba(220,38,38,0.9)",
  },
};

const getRowStyle = (status) => {
  if (!status) return undefined;
  const st = STATUS_STYLES[status];
  return {
    animation: st.animation,
    borderLeft: `5px solid ${st.border}`,
    boxShadow: `inset 0 0 0 9999px ${st.inset}`,
  };
};

// Small blinking badge used in End Date + Follow-up cells
const StatusBadge = ({ status, icon, text }) => {
  const st = STATUS_STYLES[status];
  return (
    <span style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "4px",
      marginTop: "3px",
      fontSize: "0.7rem",
      fontWeight: 800,
      color: st.badgeText,
      background: st.badgeBg,
      borderRadius: "6px",
      padding: "2px 7px",
      whiteSpace: "nowrap",
      boxShadow: st.glow,
      animation: status === "lost" ? "none" : "amcIconBlink 1s infinite",
    }}>
      <i className={icon}></i>
      {text}
    </span>
  );
};

export const OldAMCHistoryGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40;

  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 0, totalRecords: 0,
    hasNextPage: false, hasPrevPage: false,
  });

  const [deletePopUpShow, setDeletePopUpShow] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [updatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getOldAMCHistory(currentPage, itemsPerPage, search, customerTypeFilter, zoneFilter, "", priorityFilter);
      if (data?.success) {
        setRecords(data.records || []);
        setPagination(data.pagination || {
          currentPage: 1, totalPages: 0, totalRecords: 0, hasNextPage: false, hasPrevPage: false,
        });
      } else {
        toast.error(data?.error || "Failed to fetch old AMC history");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, customerTypeFilter, zoneFilter, priorityFilter, AddPopUpShow, updatePopUpShow]);

  const handleOnSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchText);
    setCurrentPage(1);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    toast.loading("Importing Old AMC History...");
    const data = await importOldAMCHistory(file);
    toast.dismiss();
    setImporting(false);
    e.target.value = "";

    if (data?.success) {
      toast.success(data.message);
      setCurrentPage(1);
      fetchData();
    } else {
      toast.error(data?.error || "Import failed");
    }
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setDeletePopUpShow(true);
  };

  const handleDeleteConfirm = async () => {
    const data = await deleteOldAMCHistory(selectedId);
    if (data?.success) toast.success(data.message);
    else toast.error(data?.error || "Failed to delete");
    setDeletePopUpShow(false);
    fetchData();
  };

  const handleExportPDF = async () => {
    const result = await exportOldAMCHistoryPDF();
    if (result.success) toast.success(result.message);
    else toast.error(result.error);
  };

  const handleExportExcel = async () => {
    const result = await exportOldAMCHistoryExcel();
    if (result.success) toast.success(result.message);
    else toast.error(result.error);
  };

  const handleResetFilters = () => {
    setSearch(""); setSearchText(""); setCustomerTypeFilter(""); setZoneFilter(""); setPriorityFilter(""); setCurrentPage(1);
  };

  const handleAdd = () => setAddPopUpShow((prev) => !prev);

  const handleUpdateOpen = (record) => {
    setSelectedRecord(record);
    setUpdatePopUpShow(true);
  };

  const handleUpdateClose = () => {
    setUpdatePopUpShow(false);
    setSelectedRecord(null);
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "P1": return "badge bg-danger";
      case "P2": return "badge bg-warning text-dark";
      case "P3": return "badge bg-success";
      default: return "badge bg-secondary";
    }
  };

  const isFilterActive = search || customerTypeFilter || zoneFilter || priorityFilter;

  const maxPageButtons = 5;
  const halfMax = Math.floor(maxPageButtons / 2);
  let startPage = Math.max(1, currentPage - halfMax);
  let endPage = Math.min(pagination.totalPages, startPage + maxPageButtons - 1);
  if (endPage - startPage + 1 < maxPageButtons) startPage = Math.max(1, endPage - maxPageButtons + 1);
  const pageButtons = [];
  for (let i = startPage; i <= endPage; i++) pageButtons.push(i);

  return (
    <>
      {(loading || importing) && (
        <div className="overlay"><span className="loader"></span></div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="OldAMCHistoryGrid" />
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                <div className="row px-2 py-1 align-items-center">
                  <div className="col-12 col-lg-3">
                    <h5 className="text-white py-2 mb-0 d-flex align-items-center flex-wrap gap-2">
                      Old AMC History
                      {!loading && (
                        <span className="badge bg-light text-dark" style={{ fontSize: "11px" }}>
                          <i className="fa-solid fa-clock-rotate-left me-1"></i>{pagination.totalRecords} Records
                        </span>
                      )}
                    </h5>
                  </div>

                  <div className="col-12 col-lg-9">
                    <div className="row g-2 align-items-end justify-content-end">
                      <div className="col-12 col-sm-6 col-lg-3">
                        <div className="form">
                          <i className="fa fa-search"></i>
                          <form onSubmit={handleOnSearchSubmit}>
                            <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)}
                              className="form-control form-input bg-transparant" placeholder="Search ..." />
                          </form>
                        </div>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-2">
                        <label className="text-white-50 d-block mb-1" style={{ fontSize: "11px" }}>Type</label>
                        <select className="form-select form-select-sm" value={customerTypeFilter} onChange={(e) => { setCustomerTypeFilter(e.target.value); setCurrentPage(1); }}>
                          <option value="">All</option>
                          <option value="main">Main</option>
                          <option value="branch">Branch</option>
                        </select>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-2">
                        <label className="text-white-50 d-block mb-1" style={{ fontSize: "11px" }}>Zone</label>
                        <select className="form-select form-select-sm" value={zoneFilter} onChange={(e) => { setZoneFilter(e.target.value); setCurrentPage(1); }}>
                          <option value="">All</option>
                          <option value="South">South</option>
                          <option value="North">North</option>
                          <option value="East">East</option>
                          <option value="West">West</option>
                          <option value="Central">Central</option>
                        </select>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-2">
                        <label className="text-white-50 d-block mb-1" style={{ fontSize: "11px" }}>Priority</label>
                        <select className="form-select form-select-sm" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}>
                          <option value="">All</option>
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                          <option value="P3">P3</option>
                        </select>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-3 text-end">
                        <div className="btn-group flex-wrap" role="group">
                          {isFilterActive && (
                            <button onClick={handleResetFilters} type="button" className="btn btn-sm btn-outline-light me-1" title="Clear filters">
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}
                          <button onClick={handleExportPDF} type="button" className="btn btn-sm btn-danger me-1" title="Export PDF" disabled={loading}>
                            <i className="fa-solid fa-file-pdf"></i>
                          </button>
                          <button onClick={handleExportExcel} type="button" className="btn btn-sm btn-success me-1" title="Export Excel" disabled={loading}>
                            <i className="fa-solid fa-file-excel"></i>
                          </button>
                          <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".xlsx,.xls,.csv" style={{ display: "none" }} />
                          <button onClick={handleImportClick} type="button" className="btn btn-sm btn-outline-dark me-1" disabled={importing} title="Bulk import — no fields required in file">
                            <i className="fa-solid fa-file-import me-1"></i>{importing ? "Importing..." : "Import"}
                          </button>
                          <button onClick={handleAdd} type="button" className="btn btn-sm btn-dark" disabled={loading}>
                            <i className="fa-solid fa-plus"></i> Add
                          </button>
                        </div>
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
                            <th className="text-center align-middle">Sr. No</th>
                            <th className="align_left_td td_width align-middle">Customer Name</th>
                            <th className="text-center align-middle">Type</th>
                            <th className="text-center align-middle">Email</th>
                            <th className="text-center align-middle">Owned By</th>
                            <th className="text-center align-middle">Industry</th>
                            <th className="text-center align-middle">Priority</th>
                            <th className="text-center align-middle">Contact 1</th>
                            <th className="text-center align-middle">Phone 1</th>
                            <th className="text-center align-middle">City / State</th>
                            <th className="text-center align-middle">GST No</th>
                            <th className="text-center align-middle">System</th>      {/* ── NEW ── */}
                            <th className="text-center align-middle">Remark</th>
                            <th className="text-center align-middle">Zone</th>
                            <th className="text-center align-middle">Start Date</th>
                            <th className="text-center align-middle">End Date</th>
                            <th className="text-center align-middle">Next Follow-up</th>  {/* ── NEW ── */}
                            <th className="text-center align-middle">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.length > 0 ? (
                            records.map((r, index) => {
                              const expiryInfo = getAMCExpiryInfo(r.endDate);
                              const followUpInfo = r.inProcess && !r.lost ? getFollowUpInfo(r.nextFollowUpDate) : null;
                              const activeInfo = !r.lost ? getActiveInfo(r.startDate, r.endDate) : null; // ── NEW ──
                              const status = getRowStatus(expiryInfo, followUpInfo, !!r.inProcess, !!r.lost, activeInfo);
                              return (
                                <tr
                                  className="border my-4"
                                  key={r._id}
                                  style={getRowStyle(status)}
                                >
                                  <td style={{ textAlign: "center" }}>{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                  <td className="align_left_td td_width wrap-text-of-col">
                                    {r.custName}
                                    {/* ── NEW: Sales Lead badge — hover to see when & who sent it ── */}
                                    {r.sentToSales && (
                                      <span
                                        className="badge d-inline-flex align-items-center mt-1"
                                        style={{ background: "#16a34a", fontSize: "0.68rem", whiteSpace: "nowrap", cursor: "help" }}
                                        title={`Assigned to Sales${r.sentToSalesAt ? ` on ${new Date(r.sentToSalesAt).toLocaleDateString()}` : ""}${r.sentToSalesByName ? ` by ${r.sentToSalesByName}` : ""}`}
                                      >
                                        <i className="fa-solid fa-handshake me-1"></i>Sales Lead
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    {r.customerType === "branch"
                                      ? <span className="badge bg-info"><i className="fa-solid fa-code-branch me-1"></i>Branch</span>
                                      : <span className="badge bg-primary"><i className="fa-solid fa-building me-1"></i>Main</span>}
                                  </td>
                                  <td style={{ textAlign: "center" }}>{r.email || "N/A"}</td>
                                  <td style={{ textAlign: "center" }}>{r.ownedBy || "N/A"}</td>
                                  <td style={{ textAlign: "center" }}><span className="badge bg-secondary">{r.industryType || "N/A"}</span></td>
                                  <td style={{ textAlign: "center" }}><span className={getPriorityBadgeClass(r.customerPriority)}>{r.customerPriority || "N/A"}</span></td>
                                  <td style={{ textAlign: "center" }}>{r.customerContactPersonName1 || "N/A"}</td>
                                  <td style={{ textAlign: "center" }}>{r.phoneNumber1 || "N/A"}</td>
                                  <td style={{ textAlign: "center" }}>
                                    {[r.billingAddress?.city, r.billingAddress?.state].filter(Boolean).join(", ") || "N/A"}
                                  </td>
                                  <td style={{ textAlign: "center" }}>{r.GSTNo || "N/A"}</td>

                                  {/* ── NEW: System cell, truncated with full text on hover ── */}
                                  <td style={{ textAlign: "center", maxWidth: "160px", whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere" }} title={r.system || ""}>
                                    {r.system
                                      ? (r.system.length > 30 ? `${r.system.slice(0, 30)}...` : r.system)
                                      : "N/A"}
                                  </td>

                                  {/* ── UPDATED: Remark wraps inside its own column (long words no longer overflow) ── */}
                                  <td
                                    style={{
                                      textAlign: "center",
                                      minWidth: "140px",
                                      maxWidth: "180px",
                                      whiteSpace: "normal",
                                      wordBreak: "break-word",
                                      overflowWrap: "anywhere",
                                    }}
                                    title={r.remark || ""}
                                  >
                                    {r.remark ? (
                                      <span style={r.lost ? { color: "#475569", fontWeight: 600 } : undefined}>
                                        {r.lost && <i className="fa-solid fa-ban me-1"></i>}
                                        {r.remark.length > 60 ? `${r.remark.slice(0, 60)}...` : r.remark}
                                      </span>
                                    ) : "N/A"}
                                  </td>

                                  <td style={{ textAlign: "center" }}>{r.zone || "N/A"}</td>
                                  <td style={{ textAlign: "center" }}>{r.startDate ? new Date(r.startDate).toLocaleDateString() : "N/A"}</td>
                                  <td style={{ textAlign: "center" }}>
                                    {r.endDate ? new Date(r.endDate).toLocaleDateString() : "N/A"}
                                    {/* End Date badge: grey "Lost" OR blue "In Process" OR red expiry label */}
                                    {r.lost ? (
                                      <StatusBadge status="lost" icon="fa-solid fa-ban" text="Lost" />
                                    ) : r.inProcess && (expiryInfo || followUpInfo) ? (
                                      <StatusBadge status="inprocess" icon="fa-solid fa-hourglass-half" text="In Process" />
                                    ) : expiryInfo ? (
                                      <StatusBadge
                                        status={expiryInfo.expired ? "expired" : "expiring"}
                                        icon="fa-solid fa-triangle-exclamation"
                                        text={expiryInfo.label}
                                      />
                                    ) : activeInfo ? (
                                      /* ── NEW: green Active / Running badge ── */
                                      <StatusBadge status="active" icon="fa-solid fa-circle-play" text={activeInfo.label} />
                                    ) : null}
                                  </td>

                                  {/* ── NEW: Next Follow-up cell — yellow blinking badge when due / overdue ── */}
                                  <td style={{ textAlign: "center" }}>
                                    {!r.lost && r.inProcess && r.nextFollowUpDate ? (
                                      <>
                                        {new Date(r.nextFollowUpDate).toLocaleDateString()}
                                        {followUpInfo?.due ? (
                                          <StatusBadge status="followup" icon="fa-solid fa-bell" text={followUpInfo.label} />
                                        ) : followUpInfo ? (
                                          <small className="d-block text-primary fw-bold" style={{ fontSize: "0.7rem" }}>
                                            {followUpInfo.label}
                                          </small>
                                        ) : null}
                                      </>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>

                                  <td style={{ textAlign: "center" }}>
                                    <span onClick={() => handleUpdateOpen(r)} className="update me-2" title="Edit">
                                      <i className="fa-solid fa-pen text-success cursor-pointer"></i>
                                    </span>
                                    <span onClick={() => handleDeleteClick(r._id)} className="delete" title="Delete">
                                      <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr><td colSpan="18" style={{ textAlign: "center" }}>No data found — import an Excel/CSV file or click Add to get started</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {pagination.totalPages > 0 && (
                  <div className="pagination-container text-center my-3 sm">
                    <button disabled={!pagination.hasPrevPage || loading} onClick={() => setCurrentPage(1)} className="btn btn-dark btn-sm me-2">First</button>
                    <button disabled={!pagination.hasPrevPage || loading} onClick={() => setCurrentPage((p) => p - 1)} className="btn btn-dark btn-sm me-2">Previous</button>
                    {startPage > 1 && <span className="mx-2 text-white">...</span>}
                    {pageButtons.map((page) => (
                      <button key={page} onClick={() => setCurrentPage(page)} disabled={loading} className={`btn btn-sm me-1 ${currentPage === page ? "btn-primary" : "btn-dark"}`}>{page}</button>
                    ))}
                    {endPage < pagination.totalPages && <span className="mx-2 text-white">...</span>}
                    <button disabled={!pagination.hasNextPage || loading} onClick={() => setCurrentPage((p) => p + 1)} className="btn btn-dark btn-sm me-2">Next</button>
                    <button disabled={!pagination.hasNextPage || loading} onClick={() => setCurrentPage(pagination.totalPages)} className="btn btn-dark btn-sm">Last</button>
                    <div className="mt-1">
                      <small className="text-white-50">Page {pagination.currentPage} of {pagination.totalPages} &nbsp;({pagination.totalRecords} total records)</small>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {deletePopUpShow && (
        <DeletePopUP
          message="Are you sure! Do you want to delete this record?"
          cancelBtnCallBack={() => setDeletePopUpShow(false)}
          confirmBtnCallBack={handleDeleteConfirm}
          heading="Delete"
        />
      )}

      {AddPopUpShow && <AddAMCHistoryPopUp handleAdd={handleAdd} />}

      {updatePopUpShow && selectedRecord && (
        <UpdateAMCHistoryPopUp selectedRecord={selectedRecord} handleUpdate={handleUpdateClose} />
      )}

      {/* Blink animations: green (active), red (expiring), dark red (expired), blue (in process), yellow (follow-up due) */}
      <style>{`
        @keyframes amcBlinkRed {
          0%, 100% { background-color: rgba(220, 38, 38, 0.06); }
          50%       { background-color: rgba(255, 90, 90, 0.35); }
        }
        @keyframes amcBlinkDarkRed {
          0%, 100% { background-color: rgba(139, 0, 0, 0.10); }
          50%       { background-color: rgba(139, 0, 0, 0.40); }
        }
        /* blue blinker for In Process rows */
        @keyframes amcBlinkBlue {
          0%, 100% { background-color: rgba(37, 99, 235, 0.06); }
          50%       { background-color: rgba(59, 130, 246, 0.35); }
        }
        /* ── NEW: green blinker for Active / Running contracts ── */
        @keyframes amcBlinkGreen {
          0%, 100% { background-color: rgba(34, 197, 94, 0.04); }
          50%       { background-color: rgba(34, 197, 94, 0.22); }
        }
        /* yellow blinker for due / overdue follow-ups */
        @keyframes amcBlinkYellow {
          0%, 100% { background-color: rgba(250, 204, 21, 0.10); }
          50%       { background-color: rgba(250, 204, 21, 0.45); }
        }
        @keyframes amcIconBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(1.08); }
        }
      `}</style>
    </>
  );
};