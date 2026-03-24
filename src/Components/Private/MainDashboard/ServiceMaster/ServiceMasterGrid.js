import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import * as XLSX from "xlsx";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import UpdateServicePopup from "./PopUp/UpdateServicePopUp";
import useServices from "../../../../hooks/service/useService";
import useUpdateService from "../../../../hooks/service/useUpdateService";
import useDeleteService from "../../../../hooks/service/useDeleteService";
import ViewServicePopUp from "../../CommonPopUp/ViewServicePopUp";
import { UserContext } from "../../../../context/UserContext";
import ServiceDashboardCards from './ServiceDashboardCards';
import { getAllService } from "../../../../hooks/useService";

const productOptions = [
  "CCTV System", "TA System", "Hajeri", "SmartFace", "ZKBioSecurity",
  "Access Control System", "Turnkey Project", "Alleviz", "CafeLive",
  "WorksJoy", "WorksJoy Blu", "Fire Alarm System", "Fire Hydrant System",
  "IDS", "AI Face Machines", "Entrance Automation", "Guard Tour System",
  "Home Automation", "IP PA and Communication System", "CRM", "KMS",
  "VMS", "PMS", "Boom Barrier System", "Tripod System", "Flap Barrier System",
  "EPBX System", "CMS", "Lift Elevator System", "AV6", "Walky Talky System",
  "Device Management System"
];

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date)) return "-";
  const day     = date.getDate();
  const month   = date.toLocaleString("en-IN", { month: "short" });
  const year    = date.getFullYear();
  const hours   = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

export const ServiceMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const { user } = useContext(UserContext);

  const [deletePopUpShow, setdeletePopUpShow]         = useState(false);
  const [UpdatePopUpShow, setUpdatePopUpShow]         = useState(false);
  const [detailsServicePopUp, setDetailsServicePopUp] = useState(false);

  // All server-side filters (including allotTo by _id now)
  const [filters, setFilters] = useState({
    priority: null, status: null, serviceType: null, allotTo: null,
  });

  // Product stays client-side (not in DB schema as a direct filter)
  const [productFilter, setProductFilter] = useState("");

  // Search
  const [searchText, setSearchText]   = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // sent as ?q= to backend

  const [selectedId, setSelecteId]           = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [excelLoading, setExcelLoading]       = useState(false);

  // Accumulate engineers across all pages so Assigned To dropdown is complete
  const [allEngineers, setAllEngineers] = useState([]);

  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 0, totalRecords: 0,
    limit: 20, hasNextPage: false, hasPrevPage: false,
  });

  const itemsPerPage = 20;

  const { data, loading, error } = useServices(
    pagination.currentPage, itemsPerPage, filters, searchQuery
  );
  const { updateService, loading: updateLoading } = useUpdateService();
  const { deleteService, loading: deleteLoading } = useDeleteService();

  useEffect(() => {
    if (data) {
      setPagination(data.pagination || {
        currentPage: 1, totalPages: 0, totalRecords: 0,
        limit: itemsPerPage, hasNextPage: false, hasPrevPage: false,
      });

      // Accumulate unique engineers across pages for the dropdown
      const newEngineers = (data.services || [])
        .flatMap(s => s.allotTo || [])
        .filter(e => e?.name);

      setAllEngineers(prev => {
        const map = new Map(prev.map(e => [e._id, e]));
        newEngineers.forEach(e => map.set(e._id, e));
        return [...map.values()];
      });
    }
    if (error) toast.error(error);
  }, [data, error]);

  // Client-side: product filter only (everything else is server-side)
  const filteredServices = (data?.services || []).filter((service) => {
    const product = service?.ticket?.product?.toLowerCase() || "";
    return !productFilter || product === productFilter.toLowerCase();
  });

  const handlePageChange = (page) => setPagination((prev) => ({ ...prev, currentPage: page }));

  const handleChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value || null }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleUpdate = (service = null) => {
    setSelectedService(service);
    setUpdatePopUpShow(!UpdatePopUpShow);
  };

  const handleUpdateSubmit = async (id, updatedData) => {
    const result = await updateService(id, updatedData);
    if (result.success) {
      setUpdatePopUpShow(false);
      handlePageChange(1);
      toast.success(result.message);
    } else {
      toast.error(result.error || "Failed to update service");
    }
  };

  const handelDeleteClosePopUpClick = (id) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handelDeleteClick = async () => {
    const result = await deleteService(selectedId);
    if (result?.success) {
      setdeletePopUpShow(false);
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
      toast.success(result?.message);
    } else {
      toast.error(result?.error);
    }
  };

  const handelDetailsPopUpClick = (service) => {
    setSelectedService(service);
    setDetailsServicePopUp(!detailsServicePopUp);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchText.trim());
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleSearchClear = () => {
    setSearchText("");
    setSearchQuery("");
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleExcelDownload = async () => {
    try {
      setExcelLoading(true);
      toast.loading("Preparing Excel report...");

      const allData     = await getAllService(1, 99999, filters, searchQuery);
      const allServices = allData?.services || [];

      if (!allServices.length) {
        toast.dismiss();
        toast.error("No data to export");
        return;
      }

      const rows = allServices.map((service, index) => ({
        "Sr. No":          index + 1,
        "Customer Name":   service?.ticket?.client?.custName || "-",
        "Complaint":       service?.ticket?.details || "-",
        "Product":         service?.ticket?.product || "-",
        "Service Type":    service?.serviceType || "-",
        "Priority":        service?.priority || "-",
        "Allocated Date":  formatDateTime(service?.allotmentDate),
        "Assigned To":     service?.allotTo?.map(e => e.name).join(", ") || "-",
        "Status":          service?.status || "-",
        "Work Mode":       service?.workMode || "-",
        "Completion Date": formatDateTime(service?.completionDate),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 7 }, { wch: 22 }, { wch: 30 }, { wch: 22 }, { wch: 14 },
        { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Services");

      const today   = new Date();
      const dateStr = `${today.getDate()}-${today.toLocaleString("en-IN", { month: "short" })}-${today.getFullYear()}`;
      XLSX.writeFile(wb, `Service_Report_${dateStr}.xlsx`);

      toast.dismiss();
      toast.success(`Excel downloaded! (${rows.length} records)`);
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to download Excel");
      console.error(err);
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <>
      {(loading || updateLoading || deleteLoading || excelLoading) && (
        <div className="overlay"><span className="loader"></span></div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="ServiceMasterGrid" />
            <div
              className="main-panel"
              style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* Title + Excel */}
                <div className="row px-2 py-1 align-items-center">
                  <div className="col-12 col-lg-8">
                    <h5 className="text-white py-2 mb-0">Service Dashboard</h5>
                  </div>
                  <div className="col-12 col-lg-4 text-end">
                    <button
                      className="btn btn-success btn-sm px-3"
                      onClick={handleExcelDownload}
                      disabled={excelLoading}
                      title="Download All Records as Excel"
                    >
                      <i className="fa-solid fa-file-excel me-2"></i>
                      Download Excel
                    </button>
                  </div>
                </div>

                <ServiceDashboardCards
                  totalServiceCount={
                    (data?.statusCounts?.Inprogress || 0) +
                    (data?.statusCounts?.Pending    || 0) +
                    (data?.statusCounts?.Stuck      || 0) +
                    (data?.statusCounts?.Completed  || 0)
                  }
                  inprogressServiceCount={data?.statusCounts?.Inprogress || 0}
                  pendingServiceCount={data?.statusCounts?.Pending       || 0}
                  stuckServiceCount={data?.statusCounts?.Stuck           || 0}
                  completeServiceCount={data?.statusCounts?.Completed    || 0}
                />

                {/* Filters Row */}
                <div className="row py-2 px-2 align-items-end g-2">

                  {/* Customer Name Search — server-side, all pages */}
                  <div className="col-12 col-md-3">
                    <form onSubmit={handleSearchSubmit} className="d-flex">
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control bg_edit"
                          placeholder="Search customer name..."
                          value={searchText}
                          onChange={(e) => {
                            setSearchText(e.target.value);
                            if (e.target.value === "") handleSearchClear();
                          }}
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={handleSearchClear}
                            title="Clear search"
                          >
                            <i className="fa fa-times"></i>
                          </button>
                        )}
                      </div>
                      <button className="btn btn-primary ms-1" type="submit">
                        <i className="fa fa-search"></i>
                      </button>
                    </form>
                  </div>

                  {/* Service Type */}
                  <div className="col-6 col-md-2">
                    <select className="form-select bg_edit" value={filters.serviceType || ""} onChange={(e) => handleChange("serviceType", e.target.value)}>
                      <option value="">Select Service</option>
                      <option value="AMC">AMC</option>
                      <option value="Warranty">Warranty</option>
                      <option value="One Time">One Time</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="col-6 col-md-2">
                    <select className="form-select bg_edit" value={filters.status || ""} onChange={(e) => handleChange("status", e.target.value)}>
                      <option value="">Select Status</option>
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                      <option value="Inprogress">Inprogress</option>
                      <option value="Stuck">Stuck</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="col-6 col-md-2">
                    <select className="form-select bg_edit" value={filters.priority || ""} onChange={(e) => handleChange("priority", e.target.value)}>
                      <option value="">Select Priority</option>
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>

                  {/* Product — client-side only */}
                  <div className="col-6 col-md-2">
                    <select className="form-select bg_edit" value={productFilter} onChange={(e) => { setProductFilter(e.target.value); setPagination(prev => ({ ...prev, currentPage: 1 })); }}>
                      <option value="">Select Product</option>
                      {productOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  {/* Assigned To — now sends _id to backend, works across ALL pages */}
                  <div className="col-6 col-md-1">
                    <select
                      className="form-select bg_edit"
                      value={filters.allotTo || ""}
                      onChange={(e) => handleChange("allotTo", e.target.value || null)}
                    >
                      <option value="">Assigned To</option>
                      {allEngineers.map((eng) => (
                        <option key={eng._id} value={eng._id}>{eng.name}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Search result label */}
                {searchQuery && (
                  <div className="px-3 pb-1">
                    <small className="text-white-50">
                      Showing results for <strong className="text-white">"{searchQuery}"</strong>
                      {" "}— {pagination.totalRecords ?? 0} record(s) found
                    </small>
                  </div>
                )}

                {/* Table */}
                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            <th>Sr. No</th>
                            <th className="align_left_td width_tdd">Customer Name</th>
                            <th className="align_left_td width_tdd" style={{ width: "4rem" }}>Complaint</th>
                            <th className="align_left_td width_tdd">Product</th>
                            <th className="align_left_td width_tdd">Priority</th>
                            <th>Allocated Date</th>
                            <th>Assigned to</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {filteredServices.length > 0 ? (
                            filteredServices.map((service, index) => (
                              <tr className="border my-4" key={service._id}>
                                <td>{index + 1 + (pagination.currentPage - 1) * itemsPerPage}</td>
                                <td className="align_left_td width_tdd">{service?.ticket?.client?.custName}</td>
                                <td className="align_left_td width_tdd wrap-text-of-col">{service?.ticket?.details}</td>
                                <td className="align_left_td width_tdd">{service?.ticket?.product}</td>
                                <td className="align_left_td width_tdd">{service.priority}</td>
                                <td>{formatDateTime(service.allotmentDate)}</td>
                                <td className="width_tdd">{service.allotTo?.map((item) => item.name).join(', ')}</td>
                                <td
                                  className="font-weight-bold"
                                  style={{
                                    color: service.status === 'Completed' ? '#28a745' :
                                           service.status === 'Inprogress' ? '#0000FF' :
                                           service.status === 'Pending'    ? '#FFA726' :
                                           service.status === 'Stuck'      ? '#E53935' : '#000'
                                  }}
                                >
                                  {service.status}
                                </td>
                                <td>
                                  {(user?.permissions?.includes('updateService') || user?.user === 'company') && (
                                    <span onClick={() => handleUpdate(service)} className="update">
                                      <i className="mx-1 fa-solid fa-pen text-success cursor-pointer"></i>
                                    </span>
                                  )}
                                  {(user?.permissions?.includes('deleteService') || user?.user === 'company') && (
                                    <span onClick={() => handelDeleteClosePopUpClick(service._id)} className="delete">
                                      <i className="mx-1 fa-solid fa-trash text-danger cursor-pointer"></i>
                                    </span>
                                  )}
                                  {(user?.permissions?.includes('viewService') || user?.user === 'company') && (
                                    <span onClick={() => handelDetailsPopUpClick(service)}>
                                      <i className="fa-solid fa-eye cursor-pointer text-primary mx-1"></i>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="9" className="text-center">
                                {searchQuery ? `No customers found matching "${searchQuery}"` : "No data found"}
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
                      let startPage, endPage;
                      if (pagination.totalPages <= maxPagesToShow) { startPage = 1; endPage = pagination.totalPages; }
                      else if (pagination.currentPage <= 3)        { startPage = 1; endPage = maxPagesToShow; }
                      else if (pagination.currentPage >= pagination.totalPages - 2) { startPage = pagination.totalPages - maxPagesToShow + 1; endPage = pagination.totalPages; }
                      else { startPage = pagination.currentPage - 2; endPage = pagination.currentPage + 2; }
                      startPage = Math.max(1, startPage);
                      endPage   = Math.min(pagination.totalPages, endPage);
                      for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
                      return pageNumbers.map((number) => (
                        <button key={number} onClick={() => handlePageChange(number)}
                          className={`btn btn-sm me-1 ${pagination.currentPage === number ? "btn-primary" : "btn-dark"}`}
                          style={{ minWidth: "35px", borderRadius: "4px" }}>
                          {number}
                        </button>
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

      {deletePopUpShow && (
        <DeletePopUP
          message={"Are you sure! Do you want to Delete ?"}
          cancelBtnCallBack={handelDeleteClosePopUpClick}
          confirmBtnCallBack={handelDeleteClick}
          heading="Delete"
        />
      )}
      {UpdatePopUpShow && (
        <UpdateServicePopup
          handleUpdate={handleUpdateSubmit}
          selectedService={selectedService}
          closePopUp={() => setUpdatePopUpShow(false)}
        />
      )}
      {detailsServicePopUp && (
        <ViewServicePopUp
          closePopUp={handelDetailsPopUpClick}
          selectedService={selectedService}
        />
      )}
    </>
  );
};