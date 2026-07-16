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
                            <th className="text-center align-middle">Zone</th>
                            <th className="text-center align-middle">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.length > 0 ? (
                            records.map((r, index) => (
                              <tr className="border my-4" key={r._id}>
                                <td style={{ textAlign: "center" }}>{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{r.custName}</td>
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
                                <td style={{ textAlign: "center" }}>{r.zone || "N/A"}</td>
                                <td style={{ textAlign: "center" }}>
                                  <span onClick={() => handleUpdateOpen(r)} className="update me-2" title="Edit">
                                    <i className="fa-solid fa-pen text-success cursor-pointer"></i>
                                  </span>
                                  <span onClick={() => handleDeleteClick(r._id)} className="delete" title="Delete">
                                    <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="13" style={{ textAlign: "center" }}>No data found — import an Excel/CSV file or click Add to get started</td></tr>
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
    </>
  );
};