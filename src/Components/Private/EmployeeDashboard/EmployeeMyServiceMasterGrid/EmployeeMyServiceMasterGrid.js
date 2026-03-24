import { useState, useEffect } from "react";
import { Header } from "../../MainDashboard/Header/Header";
import { Sidebar } from "../../MainDashboard/Sidebar/Sidebar";
import toast from 'react-hot-toast';
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import SubmitServiceWorkPopUp from "./PopUp/SubmitServiceWorkPopUp";
import ViewServicePopUp from "../../CommonPopUp/ViewServicePopUp";
import useMyServices from "../../../../hooks/service/useMyService";
import useDeleteService from "../../../../hooks/service/useDeleteService";
import { formatDate, formatDateTimeForDisplay } from "../../../../utils/formatDate";

export const EmployeeMyServiceMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => {
    setIsOpen(!isopen);
  };

  // Popup States
  const [deletePopUpShow, setDeletePopUpShow] = useState(false);
  const [updatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [detailsServicePopUp, setDetailsServicePopUp] = useState(false);

  // Filter State
  const [filters, setFilters] = useState({
    serviceType: null,
    status: null,
    priority: null,
  });

  // Pagination & Data State
  const [selectedId, setSelecteId] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalServices: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const itemsPerPage = 10;

  // Use hooks
  const { data, loading, error } = useMyServices(pagination.currentPage, itemsPerPage, filters);
  const { deleteService, loading: deleteLoading } = useDeleteService();

  // Update state with fetched data
  useEffect(() => {
    if (data && data.pagination) {
      setPagination({
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        totalServices: data.pagination.totalRecords,
        limit: data.pagination.limit,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
      });
    }
    if (error) {
      toast.error(error);
    }
  }, [data, error]);

  // Event Handlers
  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handleUpdate = (service = null) => {
    setSelectedService(service);
    setUpdatePopUpShow(!updatePopUpShow);
  };

  const handleDetailsPopUpClick = (service) => {
    setSelectedService(service);
    setDetailsServicePopUp(!detailsServicePopUp);
  };

  const handleDeleteClosePopUpClick = (id = null) => {
    setSelecteId(id);
    setDeletePopUpShow(!deletePopUpShow);
  };

  const handleDeleteClick = async () => {
    if (selectedId) {
      try {
        toast.loading("Deleting Service...")
        const result = await deleteService(selectedId);
        toast.dismiss()
        if (result) {
          toast.success("Service deleted successfully.");
          setDeletePopUpShow(false);
          setPagination((prev) => ({ ...prev, currentPage: 1 }));
        }
      } catch (err) {
        toast.error(err.message || "Failed to delete service.");
      }
    }
  };

  const handleFilterChange = (filterType, value) => {
    const updatedFilters = { ...filters, [filterType]: value || null };
    setFilters(updatedFilters);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  // Pagination Buttons
  const maxPageButtons = 5;

  return (
    <>
      {(loading || deleteLoading) && (
        <div className="overlay">
          <span className="loader"></span>
        </div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="EmployeeMyServiceMasterGrid" />
            <div
              className="main-panel"
              style={{
                width: isopen ? "" : "calc(100% - 120px)",
                marginLeft: isopen ? "" : "125px",
              }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="row px-2 py-1 align-items-center">
                  <div className="col-12 col-lg-4">
                    <h5 className="text-white py-2 mb-0">My Service Master</h5>
                  </div>

                  <div className="col-12 col-lg-8">
                    <div className="row g-2 justify-content-end align-items-center">
                      <div className="col-md-3 col-lg-3">
                        <select
                          className="form-select bg_edit"
                          name="serviceType"
                          value={filters.serviceType || ""}
                          onChange={(e) => handleFilterChange("serviceType", e.target.value)}
                        >
                          <option value="">Select Service</option>
                          <option value="CMC">CMC</option>
                          <option value="Warranty">Warranty</option>
                          <option value="One Time">One Time</option>
                        </select>
                      </div>
                      <div className="col-md-3 col-lg-3">
                        <select
                          className="form-select bg_edit"
                          name="status"
                          value={filters.status || ""}
                          onChange={(e) => handleFilterChange("status", e.target.value)}
                        >
                          <option value="">Select Status</option>
                          <option value="Completed">Completed</option>
                          <option value="Pending">Pending</option>
                          <option value="Inprogress">Inprogress</option>
                          <option value="Stuck">Stuck</option>
                        </select>
                      </div>
                      <div className="col-md-3 col-lg-3">
                        <select
                          className="form-select bg_edit"
                          name="priority"
                          value={filters.priority || ""}
                          onChange={(e) => handleFilterChange("priority", e.target.value)}
                        >
                          <option value="">Select Priority</option>
                          <option value="High">High Priority</option>
                          <option value="Medium">Medium Priority</option>
                          <option value="Low">Low Priority</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table
                        className="table table-striped table-class"
                        id="table-id"
                        style={{ width: "100%" }}
                      >
                        <thead>
                          <tr className="th_border">
                            <th>Sr. No</th>
                            <th className="align_left_td td_width">Customer Name</th>
                            <th className="align_left_td td_width">Complaint</th>
                            <th>Product</th>
                            <th>Priority</th>
                            <th>Allotment Date</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {data?.services?.length > 0 ? (
                            data.services.map((service, index) => (
                              <tr className="border my-4" key={service._id}>
                                <td>
                                  {index + 1 + (pagination.currentPage - 1) * itemsPerPage}
                                </td>
                                <td className="align_left_td width_tdd wrap-text-of-col">
                                  {service.ticket?.client?.custName || "N/A"}
                                </td>
                                <td className="align_left_td width_tdd wrap-text-of-col">
                                  {service.ticket?.details || "N/A"}
                                </td>
                                <td>{service.ticket?.product || "N/A"}</td>
                                <td>{service.priority || "N/A"}</td>
                                <td>{formatDateTimeForDisplay(service.allotmentDate)}</td>
                                <td
                                  className="font-weight-bold"
                                  style={{
                                    color: service.status === 'Completed' ? '#28a745' :
                                           service.status === 'Inprogress' ? '#0000FF' :
                                           service.status === 'Pending' ? '#FFA726' :
                                           service.status === 'Stuck' ? '#E53935' : '#000'
                                  }}
                                >
                                  {service.status || "N/A"}
                                </td>
                                <td>
                                  <span
                                    onClick={() => handleUpdate(service)}
                                    className="update me-2"
                                    style={{ cursor: "pointer" }}
                                    title="Edit Service"
                                  >
                                    <i className="fa-solid fa-pen text-success"></i>
                                  </span>
                                  <span
                                    onClick={() => handleDetailsPopUpClick(service)}
                                    className="view"
                                    style={{ cursor: "pointer" }}
                                    title="View Details"
                                  >
                                    <i className="fa-solid fa-eye text-primary"></i>
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="8" className="text-center">
                                No data found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Pagination Button */}
                {!loading && pagination.totalPages > 1 && (
                  <div className="pagination-container text-center my-3">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={!pagination.hasPrevPage}
                      className="btn btn-dark btn-sm me-1"
                      style={{ borderRadius: "4px" }}
                      aria-label="First Page"
                    >
                      First
                    </button>

                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="btn btn-dark btn-sm me-1"
                      style={{ borderRadius: "4px" }}
                      aria-label="Previous Page"
                    >
                      Previous
                    </button>

                    {(() => {
                      const pageNumbers = [];
                      const maxPagesToShow = 5;

                      if (pagination.totalPages <= maxPagesToShow) {
                        for (let i = 1; i <= pagination.totalPages; i++) {
                          pageNumbers.push(i);
                        }
                      } else {
                        let startPage, endPage;
                        if (pagination.currentPage <= 3) {
                          startPage = 1;
                          endPage = maxPagesToShow;
                        } else if (pagination.currentPage >= pagination.totalPages - 2) {
                          startPage = pagination.totalPages - maxPagesToShow + 1;
                          endPage = pagination.totalPages;
                        } else {
                          startPage = pagination.currentPage - 2;
                          endPage = pagination.currentPage + 2;
                        }
                        startPage = Math.max(1, startPage);
                        endPage = Math.min(pagination.totalPages, endPage);

                        for (let i = startPage; i <= endPage; i++) {
                          pageNumbers.push(i);
                        }
                      }

                      return pageNumbers.map((number) => (
                        <button
                          key={number}
                          onClick={() => handlePageChange(number)}
                          className={`btn btn-sm me-1 ${
                            pagination.currentPage === number ? "btn-primary" : "btn-dark"
                          }`}
                          style={{ minWidth: "35px", borderRadius: "4px" }}
                          aria-label={`Go to page ${number}`}
                          aria-current={pagination.currentPage === number ? "page" : undefined}
                        >
                          {number}
                        </button>
                      ));
                    })()}

                    <button
                      disabled={!pagination.hasNextPage}
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      className="btn btn-dark btn-sm me-1"
                    >
                      Next
                    </button>

                    <button
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={!pagination.hasNextPage}
                      className="btn btn-dark btn-sm"
                      style={{ borderRadius: "4px" }}
                      aria-label="Last Page"
                    >
                      Last
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {deletePopUpShow && (
        <DeletePopUP
          message={"Are you sure! Do you want to Delete this Service?"}
          cancelBtnCallBack={() => handleDeleteClosePopUpClick()}
          confirmBtnCallBack={handleDeleteClick}
          heading="Service Deletion"
        />
      )}
      {updatePopUpShow && selectedService && (
        <SubmitServiceWorkPopUp
          selectedService={selectedService}
          handleUpdate={handleUpdate}
          onSuccess={() => setPagination((prev) => ({ ...prev, currentPage: 1 }))}
        />
      )}
      {detailsServicePopUp && selectedService && (
        <ViewServicePopUp
          selectedService={selectedService}
          closePopUp={() => handleDetailsPopUpClick(null)}
        />
      )}
    </>
  );
};

export default EmployeeMyServiceMasterGrid;