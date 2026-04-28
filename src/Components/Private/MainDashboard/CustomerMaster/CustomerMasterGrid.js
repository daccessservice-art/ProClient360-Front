import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddCustomerPopUp from "./PopUp/AddCustomerPopUp";
import UpdateCustomerPopUp from "./PopUp/UpdateCustomerPopUp";
import { getCustomers, deleteCustomer, exportCustomersPDF, exportCustomersExcel, getEmployees } from "../../../../hooks/useCustomer";
import { UserContext } from "../../../../context/UserContext";
import toast from "react-hot-toast";

const ALLOWED_EXPORT_DESIGNATIONS = [
  "Director Digi Solution",
  "CEO & Founder",
  "Junior Software Developer",
];

// ── Same 3 designations can use Bulk Delete ──
const ALLOWED_BULK_DELETE_DESIGNATIONS = [
  "Director Digi Solution",
  "CEO & Founder",
  "Junior Software Developer",
   "Soft Test"
];

export const CustomerMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const toggle = () => { setIsOpen(!isopen); };

  const { user } = useContext(UserContext);
  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [deletePopUpShow, setdeletePopUpShow] = useState(false);
  const [updatePopUpShow, setUpdatePopUpShow] = useState(false);

  const [selectedId, setSelecteId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 0, totalCustomers: 0,
    limit: 20, hasNextPage: false, hasPrevPage: false,
  });

  const [createdByFilter, setCreatedByFilter] = useState("");
  const [ownedByFilter, setOwnedByFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [industryTypeFilter, setIndustryTypeFilter] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("");
  const [filterEmployees, setFilterEmployees] = useState([]);

  // ── Bulk Delete State ──
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteConfirmShow, setBulkDeleteConfirmShow] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const itemsPerPage = 20;

  const industryOptions = [
    "IT & Software", "Manufacturing", "Construction & Infrastructure",
    "Healthcare", "Education", "Retail", "Banking & Finance",
    "Logistics & Supply Chain", "Hospitality", "Real Estate",
    "Government & Public Sector", "Energy & Utilities", "Telecom",
    "Pharmaceuticals", "Automotive", "Dealer", "Other"
  ];

  const canExport =
    user?.user === "company" ||
    ALLOWED_EXPORT_DESIGNATIONS.includes(user?.designation || "");

  // ── Can use bulk delete ──
  const canBulkDelete =
    user?.user === "company" ||
    ALLOWED_BULK_DELETE_DESIGNATIONS.includes(user?.designation || "");

  useEffect(() => {
    const fetchFilterEmployees = async () => {
      try {
        const data = await getEmployees();
        if (data.success && data.employees) {
          setFilterEmployees(data.employees);
        }
      } catch (error) {
        console.error("Error fetching employees for filters:", error);
      }
    };
    fetchFilterEmployees();
  }, []);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedIds([]); // Clear selection on page change
  };
  const handleAdd = () => { setAddPopUpShow(!AddPopUpShow); };
  const handleUpdate = (customer) => { setSelectedCust(customer); setUpdatePopUpShow(!updatePopUpShow); };
  const handelDeleteClosePopUpClick = (id) => { setSelecteId(id); setdeletePopUpShow(!deletePopUpShow); };

  const handelDeleteClick = async () => {
    const data = await deleteCustomer(selectedId);
    if (data?.success) { toast.success(data?.message); } else { toast.error(data?.error || "Failed to delete"); }
    setdeletePopUpShow(false);
    setCurrentPage(1);
  };

  // ── Bulk Delete Handlers ──
  const handleToggleBulkDeleteMode = () => {
    setBulkDeleteMode((prev) => !prev);
    setSelectedIds([]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c._id));
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedIds.length === 0) {
      toast.error("No customers selected");
      return;
    }
    setBulkDeleteConfirmShow(true);
  };

  const handleBulkDeleteExecute = async () => {
    setBulkDeleting(true);
    setBulkDeleteConfirmShow(false);

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const id of selectedIds) {
      const data = await deleteCustomer(id);
      if (data?.success) {
        successCount++;
      } else {
        failCount++;
        const cust = customers.find((c) => c._id === id);
        errors.push(cust?.custName || id);
      }
    }

    setBulkDeleting(false);
    setSelectedIds([]);
    setBulkDeleteMode(false);

    if (successCount > 0) {
      toast.success(`${successCount} customer${successCount > 1 ? "s" : ""} deleted successfully`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} customer${failCount > 1 ? "s" : ""} could not be deleted (may have branches or projects)`);
    }

    setCurrentPage(1);
    // Re-fetch by toggling a dummy state – the useEffect will pick up currentPage=1
    // Actually trigger re-fetch by toggling deletePopUpShow momentarily
    setdeletePopUpShow(false);
    // We trigger a re-fetch by incrementing a counter instead
    setRefetchTrigger((n) => n + 1);
  };

  // ── Refetch trigger (avoids re-using deletePopUpShow for bulk) ──
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const handleExportPDF = async () => {
    if (!canExport) {
      toast.error("Your designation does not have permission to export customer data.");
      return;
    }
    try {
      const result = await exportCustomersPDF();
      if (result.success) { toast.success(result.message); } else { toast.error(result.error || "Failed to export PDF"); }
    } catch (error) { toast.error("An unexpected error occurred while exporting PDF"); }
  };

  const handleExportExcel = async () => {
    if (!canExport) {
      toast.error("Your designation does not have permission to export customer data.");
      return;
    }
    try {
      const result = await exportCustomersExcel();
      if (result.success) { toast.success(result.message); } else { toast.error(result.error || "Failed to export Excel"); }
    } catch (error) { toast.error("An unexpected error occurred while exporting Excel"); }
  };

  const handleResetFilters = () => {
    setCreatedByFilter(""); setOwnedByFilter(""); setPriorityFilter("");
    setIndustryTypeFilter(""); setCustomerTypeFilter(""); setSearchText(""); setSearch(""); setCurrentPage(1);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getCustomers(
          currentPage,
          itemsPerPage,
          search,
          createdByFilter,
          ownedByFilter,
          priorityFilter,
          industryTypeFilter,
          customerTypeFilter
        );
        if (data?.success) {
          setCustomers(data.customers || []);
          setPagination(data.pagination || {
            currentPage: 1, totalPages: 0, totalCustomers: 0,
            limit: itemsPerPage, hasNextPage: false, hasPrevPage: false,
          });
        } else {
          toast(data?.error || "Failed to fetch customers");
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [
    currentPage,
    deletePopUpShow,
    AddPopUpShow,
    updatePopUpShow,
    search,
    createdByFilter,
    ownedByFilter,
    priorityFilter,
    industryTypeFilter,
    customerTypeFilter,
    refetchTrigger,
  ]);

  const handleCreatedByFilter = (e) => { setCreatedByFilter(e.target.value); setCurrentPage(1); };
  const handleOwnedByFilter = (e) => { setOwnedByFilter(e.target.value); setCurrentPage(1); };
  const handlePriorityFilter = (e) => { setPriorityFilter(e.target.value); setCurrentPage(1); };
  const handleIndustryTypeFilter = (e) => { setIndustryTypeFilter(e.target.value); setCurrentPage(1); };
  const handleCustomerTypeFilter = (e) => { setCustomerTypeFilter(e.target.value); setCurrentPage(1); };

  const maxPageButtons = 5;
  const halfMaxButtons = Math.floor(maxPageButtons / 2);
  let startPage = Math.max(1, currentPage - halfMaxButtons);
  let endPage = Math.min(pagination.totalPages, startPage + maxPageButtons - 1);
  if (endPage - startPage + 1 < maxPageButtons) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  const handleOnSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchText);
    setCurrentPage(1);
  };

  const pageButtons = [];
  for (let i = startPage; i <= endPage; i++) { pageButtons.push(i); }

  const getIndustryDisplay = (customer) => {
    if (customer.industryType === "Other") { return customer.industryTypeOther || "Other"; }
    return customer.industryType || "N/A";
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "P1": return "badge bg-danger";
      case "P2": return "badge bg-warning text-dark";
      case "P3": return "badge bg-success";
      default: return "badge bg-secondary";
    }
  };

  const getCustomerTypeBadge = (type) => {
    if (type === "branch") {
      return <span className="badge bg-info"><i className="fa-solid fa-code-branch me-1"></i>Branch</span>;
    }
    return <span className="badge bg-primary"><i className="fa-solid fa-building me-1"></i>Main</span>;
  };

  const isFilterActive = createdByFilter || ownedByFilter || search || priorityFilter || industryTypeFilter || customerTypeFilter;

  const allCurrentPageSelected = customers.length > 0 && selectedIds.length === customers.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < customers.length;

  return (
    <>
      {(loading || bulkDeleting) && (
        <div className="overlay"><span className="loader"></span></div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="CustomerMasterGrid" />
            <div
              className="main-panel"
              style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* ── Top bar ── */}
                <div className="row px-2 py-1 align-items-center">
                  <div className="col-12 col-lg-2">
                    <h5 className="text-white py-2 mb-0">Customer Master</h5>
                  </div>

                  <div className="col-12 col-lg-10">
                    <div className="row g-2 align-items-end justify-content-end">

                      <div className="col-12 col-sm-6 col-lg-2">
                        <div className="form">
                          <i className="fa fa-search"></i>
                          <form onSubmit={handleOnSearchSubmit}>
                            <input
                              type="text"
                              value={searchText}
                              onChange={(e) => setSearchText(e.target.value)}
                              className="form-control form-input bg-transparant"
                              placeholder="Search ..."
                            />
                          </form>
                        </div>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-1">
                        <label className="text-white-50 d-block mb-1" style={{ fontSize: "11px" }}>Type</label>
                        <select className="form-select form-select-sm" value={customerTypeFilter} onChange={handleCustomerTypeFilter} title="Filter by Type">
                          <option value="">All</option>
                          <option value="main">Main</option>
                          <option value="branch">Branch</option>
                        </select>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-2">
                        <label className="text-white-50 d-block mb-1" style={{ fontSize: "11px" }}>All Created By</label>
                        <select className="form-select form-select-sm" value={createdByFilter} onChange={handleCreatedByFilter} title="Filter by Created By">
                          <option value="">Select Created By</option>
                          {filterEmployees.map((emp) => (
                            <option key={emp._id} value={emp.name}>{emp.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-2">
                        <label className="text-white-50 d-block mb-1" style={{ fontSize: "11px" }}>All Owned By</label>
                        <select className="form-select form-select-sm" value={ownedByFilter} onChange={handleOwnedByFilter} title="Filter by Owned By">
                          <option value="">Select Owned By</option>
                          <option value="NA">NA / None</option>
                          {filterEmployees.map((emp) => (
                            <option key={emp._id} value={emp.name}>{emp.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-1">
                        <label className="text-white-50 d-block mb-1" style={{ fontSize: "11px" }}>All Priority</label>
                        <select className="form-select form-select-sm" value={priorityFilter} onChange={handlePriorityFilter} title="Filter by Priority">
                          <option value="">Select Priority</option>
                          <option value="P1">P1 - High</option>
                          <option value="P2">P2 - Medium</option>
                          <option value="P3">P3 - Low</option>
                          <option value="NA">NA / None</option>
                        </select>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-2">
                        <label className="text-white-50 d-block mb-1" style={{ fontSize: "11px" }}>Select Industry Type</label>
                        <select className="form-select form-select-sm" value={industryTypeFilter} onChange={handleIndustryTypeFilter} title="Filter by Industry Type">
                          <option value="">Select Industry Type</option>
                          <option value="NA">NA</option>
                          {industryOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-2 text-end">
                        <div className="btn-group flex-wrap" role="group">
                          {isFilterActive && (
                            <button onClick={handleResetFilters} type="button" className="btn btn-sm btn-outline-light me-1" title="Clear all filters">
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}

                          {/* ── Bulk Delete Toggle Button ── */}
                          {canBulkDelete && (
                            <button
                              onClick={handleToggleBulkDeleteMode}
                              type="button"
                              className={`btn btn-sm me-1 ${bulkDeleteMode ? "btn-warning" : "btn-outline-warning"}`}
                              title={bulkDeleteMode ? "Exit Bulk Delete Mode" : "Enable Bulk Delete"}
                              disabled={loading}
                            >
                              <i className={`fa-solid ${bulkDeleteMode ? "fa-xmark" : "fa-trash-can"} me-1`}></i>
                              {bulkDeleteMode ? "Exit" : "Bulk"}
                            </button>
                          )}

                          {canExport && (
                            <>
                              <button onClick={handleExportPDF} type="button" className="btn btn-sm btn-danger me-1" title="Export to PDF" disabled={loading}>
                                <i className="fa-solid fa-file-pdf"></i>
                              </button>
                              <button onClick={handleExportExcel} type="button" className="btn btn-sm btn-success me-1" title="Export to Excel" disabled={loading}>
                                <i className="fa-solid fa-file-excel"></i>
                              </button>
                            </>
                          )}

                          {user?.permissions?.includes("createCustomer") || user.user === "company" ? (
                            <button onClick={handleAdd} type="button" className="btn btn-sm btn-dark" disabled={loading || bulkDeleteMode}>
                              <i className="fa-solid fa-plus"></i> Add
                            </button>
                          ) : null}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* ── Bulk Delete Action Bar ── */}
                {bulkDeleteMode && (
                  <div className="row px-2 pb-1">
                    <div className="col-12">
                      <div
                        className="d-flex align-items-center flex-wrap gap-2 px-3 py-2 rounded"
                        style={{
                          backgroundColor: "#fff3cd",
                          border: "1px solid #ffc107",
                        }}
                      >
                        {/* Select All Checkbox */}
                        <div className="form-check mb-0 me-2">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="selectAllChk"
                            checked={allCurrentPageSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someSelected;
                            }}
                            onChange={handleSelectAll}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                          />
                          <label className="form-check-label fw-semibold ms-1" htmlFor="selectAllChk" style={{ cursor: "pointer", fontSize: "13px" }}>
                            {allCurrentPageSelected ? "Deselect All" : "Select All"} (this page)
                          </label>
                        </div>

                        <span className="text-muted" style={{ fontSize: "13px" }}>|</span>

                        {/* Selection count */}
                        <span style={{ fontSize: "13px" }}>
                          <i className="fa-solid fa-check-square me-1 text-warning"></i>
                          <strong>{selectedIds.length}</strong> customer{selectedIds.length !== 1 ? "s" : ""} selected
                        </span>

                        <span className="text-muted" style={{ fontSize: "13px" }}>|</span>

                        {/* Delete Selected Button */}
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={handleBulkDeleteConfirm}
                          disabled={selectedIds.length === 0 || loading}
                        >
                          <i className="fa-solid fa-trash me-1"></i>
                          Delete Selected ({selectedIds.length})
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm ms-auto"
                          onClick={() => setSelectedIds([])}
                          disabled={selectedIds.length === 0}
                        >
                          <i className="fa-solid fa-xmark me-1"></i>Clear Selection
                        </button>

                        <small className="text-muted w-100" style={{ fontSize: "11px" }}>
                          <i className="fa-solid fa-circle-info me-1 text-warning"></i>
                          Bulk delete mode is active. Customers with linked branches or projects cannot be deleted.
                          Selection resets on page change.
                        </small>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Active filter badges ── */}
                {isFilterActive && (
                  <div className="row px-2 pb-1">
                    <div className="col-12 d-flex align-items-center flex-wrap gap-1">
                      <small className="text-white-50 me-1">Filters:</small>

                      {search && (
                        <span className="badge bg-info text-dark me-1">
                          Search: {search}
                          <i className="fa fa-times ms-1" style={{ cursor: "pointer" }}
                            onClick={() => { setSearch(""); setSearchText(""); setCurrentPage(1); }}></i>
                        </span>
                      )}

                      {customerTypeFilter && (
                        <span className="badge bg-primary me-1">
                          Type: {customerTypeFilter === "main" ? "Main" : "Branch"}
                          <i className="fa fa-times ms-1" style={{ cursor: "pointer" }}
                            onClick={() => { setCustomerTypeFilter(""); setCurrentPage(1); }}></i>
                        </span>
                      )}

                      {createdByFilter && (
                        <span className="badge bg-secondary me-1">
                          Created: {createdByFilter}
                          <i className="fa fa-times ms-1" style={{ cursor: "pointer" }}
                            onClick={() => { setCreatedByFilter(""); setCurrentPage(1); }}></i>
                        </span>
                      )}

                      {ownedByFilter && (
                        <span className="badge bg-secondary me-1">
                          Owned: {ownedByFilter}
                          <i className="fa fa-times ms-1" style={{ cursor: "pointer" }}
                            onClick={() => { setOwnedByFilter(""); setCurrentPage(1); }}></i>
                        </span>
                      )}

                      {priorityFilter && (
                        <span className="badge bg-warning text-dark me-1">
                          Priority: {priorityFilter}
                          <i className="fa fa-times ms-1" style={{ cursor: "pointer" }}
                            onClick={() => { setPriorityFilter(""); setCurrentPage(1); }}></i>
                        </span>
                      )}

                      {industryTypeFilter && (
                        <span className="badge bg-dark me-1">
                          Industry: {industryTypeFilter}
                          <i className="fa fa-times ms-1" style={{ cursor: "pointer" }}
                            onClick={() => { setIndustryTypeFilter(""); setCurrentPage(1); }}></i>
                        </span>
                      )}

                      {!loading && (
                        <small className="text-white-50 ms-2">
                          Showing {customers.length}
                          {pagination.totalCustomers > 0 && ` of ${pagination.totalCustomers}`}
                        </small>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Table ── */}
                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            {/* Bulk Delete Checkbox Column */}
                            {bulkDeleteMode && (
                              <th className="text-center align-middle" style={{ width: "42px" }}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={allCurrentPageSelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someSelected;
                                  }}
                                  onChange={handleSelectAll}
                                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                  title="Select / Deselect all on this page"
                                />
                              </th>
                            )}
                            <th className="text-center align-middle">Sr. No</th>
                            <th className="align_left_td td_width align-middle">Customer Name</th>
                            <th className="text-center align-middle">Type</th>
                            <th className="text-center align-middle">GST No</th>
                            <th className="text-center align-middle">Industry</th>
                            <th className="text-center align-middle">Priority</th>
                            <th className="text-center align-middle">Created By</th>
                            <th className="text-center align-middle">Owned By</th>
                            <th style={{ width: "80px" }} className="text-center align-middle">Verified</th>
                            <th className="text-center align-middle">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.length > 0 ? (
                            customers.map((customer, index) => {
                              const isSelected = selectedIds.includes(customer._id);
                              return (
                                <tr
                                  className="border my-4"
                                  key={customer._id}
                                  style={
                                    bulkDeleteMode && isSelected
                                      ? { backgroundColor: "#fff3cd", outline: "2px solid #ffc107" }
                                      : {}
                                  }
                                >
                                  {/* Bulk select checkbox */}
                                  {bulkDeleteMode && (
                                    <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                                      <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={isSelected}
                                        onChange={() => handleSelectOne(customer._id)}
                                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                      />
                                    </td>
                                  )}

                                  {/* Sr. No */}
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                                    {index + 1 + (currentPage - 1) * itemsPerPage}
                                  </td>

                                  {/* Customer Name */}
                                  <td
                                    className="align_left_td td_width wrap-text-of-col"
                                    style={{ verticalAlign: "middle" }}
                                  >
                                    {customer.custName}
                                  </td>

                                  {/* Type badge */}
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                                    {getCustomerTypeBadge(customer.customerType)}
                                  </td>

                                  {/* GST No */}
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                                    {customer.GSTNo}
                                  </td>

                                  {/* Industry */}
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                                    <span className="badge bg-secondary">
                                      {getIndustryDisplay(customer)}
                                    </span>
                                  </td>

                                  {/* Priority */}
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                                    <span className={getPriorityBadgeClass(customer.customerPriority)}>
                                      {customer.customerPriority || "N/A"}
                                    </span>
                                  </td>

                                  {/* Created By */}
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                                    {customer.createdBy?.name || "N/A"}
                                  </td>

                                  {/* Owned By */}
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                                    {customer.ownedBy || "N/A"}
                                  </td>

                                  {/* Verified */}
                                  <td
                                    style={{
                                      verticalAlign: "middle",
                                      textAlign: "center",
                                      width: "45px",
                                    }}
                                  >
                                    {customer.isChecked && (
                                      <i
                                        className="fa-solid fa-check text-success"
                                        style={{ fontSize: "20px" }}
                                        title="Verified"
                                      ></i>
                                    )}
                                  </td>

                                  {/* Action */}
                                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                                    {!bulkDeleteMode && (
                                      <>
                                        {user?.permissions?.includes("updateCustomer") || user?.user === "company" ? (
                                          <span onClick={() => handleUpdate(customer)} className="update">
                                            <i className="fa-solid fa-pen text-success me-3 cursor-pointer"></i>
                                          </span>
                                        ) : ""}
                                        {user?.permissions?.includes("deleteCustomer") || user?.user === "company" ? (
                                          <span onClick={() => handelDeleteClosePopUpClick(customer._id)} className="delete">
                                            <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                          </span>
                                        ) : ""}
                                      </>
                                    )}
                                    {bulkDeleteMode && (
                                      <span
                                        style={{ cursor: "pointer" }}
                                        onClick={() => handleSelectOne(customer._id)}
                                        title={isSelected ? "Deselect" : "Select for deletion"}
                                      >
                                        <i
                                          className={`fa-solid ${isSelected ? "fa-circle-check text-warning" : "fa-circle text-secondary"}`}
                                          style={{ fontSize: "18px" }}
                                        ></i>
                                      </span>
                                    )}
                                  </td>

                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={bulkDeleteMode ? "12" : "11"} style={{ textAlign: "center", verticalAlign: "middle" }}>
                                No data found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ── Pagination ── */}
                {pagination.totalPages > 0 && (
                  <div className="pagination-container text-center my-3 sm">
                    <button disabled={!pagination.hasPrevPage || loading} onClick={() => handlePageChange(1)} className="btn btn-dark btn-sm me-2">
                      First
                    </button>
                    <button disabled={!pagination.hasPrevPage || loading} onClick={() => handlePageChange(currentPage - 1)} className="btn btn-dark btn-sm me-2">
                      Previous
                    </button>

                    {startPage > 1 && <span className="mx-2 text-white">...</span>}

                    {pageButtons.map((page) => (
                      <button key={page} onClick={() => handlePageChange(page)} disabled={loading}
                        className={`btn btn-sm me-1 ${currentPage === page ? "btn-primary" : "btn-dark"}`}>
                        {page}
                      </button>
                    ))}

                    {endPage < pagination.totalPages && <span className="mx-2 text-white">...</span>}

                    <button disabled={!pagination.hasNextPage || loading} onClick={() => handlePageChange(currentPage + 1)} className="btn btn-dark btn-sm me-2">
                      Next
                    </button>
                    <button disabled={!pagination.hasNextPage || loading} onClick={() => handlePageChange(pagination.totalPages)} className="btn btn-dark btn-sm">
                      Last
                    </button>

                    <div className="mt-1">
                      <small className="text-white-50">
                        Page {pagination.currentPage} of {pagination.totalPages}
                        &nbsp;({pagination.totalCustomers} total customers)
                      </small>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Single Delete Popup ── */}
      {deletePopUpShow && (
        <DeletePopUP
          message={"Are you sure! Do you want to Delete ?"}
          cancelBtnCallBack={handelDeleteClosePopUpClick}
          confirmBtnCallBack={handelDeleteClick}
          heading="Delete"
        />
      )}

      {/* ── Bulk Delete Confirm Popup ── */}
      {bulkDeleteConfirmShow && (
        <DeletePopUP
          message={`Are you sure you want to delete ${selectedIds.length} selected customer${selectedIds.length > 1 ? "s" : ""}? This action cannot be undone. Customers with linked branches or projects will not be deleted.`}
          cancelBtnCallBack={() => setBulkDeleteConfirmShow(false)}
          confirmBtnCallBack={handleBulkDeleteExecute}
          heading={`Bulk Delete (${selectedIds.length})`}
        />
      )}

      {AddPopUpShow && <AddCustomerPopUp handleAdd={handleAdd} />}
      {updatePopUpShow && (
        <UpdateCustomerPopUp selectedCust={selectedCust} handleUpdate={handleUpdate} />
      )}
    </>
  );
};