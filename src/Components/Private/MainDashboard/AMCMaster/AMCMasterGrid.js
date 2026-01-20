import { useState, useContext, useEffect, useRef } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import AddAMCPopup from "./PopUp/AddAMCPopUp";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import UpdateAMCPopup from "./PopUp/UpdateAMCPopUp";
import toast from "react-hot-toast";
import { getAMCs, deleteAMC, createAMC, updateAMC } from "../../../../hooks/useAMC.js";
import { UserContext } from "../../../../context/UserContext";

export const AMCMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const [expiredCount, setExpiredCount] = useState(0);
  const [showExpiredAlert, setShowExpiredAlert] = useState(true);
  const alertRef = useRef(null);
  
  const toggle = () => {
    setIsOpen(!isopen);
  };

  const { user } = useContext(UserContext);

  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [deletePopUpShow, setdeletePopUpShow] = useState(false);
  const [selectedId, setSelecteId] = useState(null);
  const [updatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [selectedAMC, setSelectedAMC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending"); // Default to "Pending"

  const [amcs, setAMCs] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalRecords: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const itemsPerPage = 20;

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handleAdd = () => {
    setAddPopUpShow(!AddPopUpShow);
  };

  const handleUpdate = (amc = null) => {
    setSelectedAMC(amc);
    setUpdatePopUpShow(!updatePopUpShow);
  };

  const handelDeleteClosePopUpClick = (id) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handelDeleteClick = async () => {
    toast.loading("Deleting AMC...");
    const data = await deleteAMC(selectedId);
    toast.dismiss();
    if (data?.success) {
      handelDeleteClosePopUpClick();
      fetchAMCs(); // Refresh data
      return toast.success(data?.message);
    }
    toast.error(data?.error);
  };

  const fetchAMCs = async () => {
    try {
      setLoading(true);
      console.log("Fetching AMCs with filters:", { 
        page: pagination.currentPage, 
        limit: itemsPerPage, 
        search, 
        type: typeFilter, 
        status: statusFilter 
      });
      
      // Pass statusFilter to getAMCs function
      const data = await getAMCs(pagination.currentPage, itemsPerPage, search, typeFilter, statusFilter);
      
      console.log("AMC data received:", data);
      
      if (data?.success) {
        setAMCs(data.data || []);
        setPagination(data.pagination || {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          limit: itemsPerPage,
          hasNextPage: false,
          hasPrevPage: false,
        });
        
        // Count expired AMCs
        const expired = data.data.filter(amc => {
          const daysRemaining = Math.ceil((new Date(amc.amcEndDate) - new Date()) / (1000 * 60 * 60 * 24));
          return daysRemaining < 0;
        });
        setExpiredCount(expired.length);
      } else {
        toast.error(data.error || "Failed to fetch AMCs");
      }
    } catch (error) {
      console.error("Error fetching AMCs:", error);
      toast.error("Failed to fetch AMCs");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAMC = async (amcData) => {
    try {
      toast.loading("Creating AMC...");
      const result = await createAMC(amcData);
      toast.dismiss();
      
      if (result.success) {
        toast.success("AMC created successfully!");
        handleAdd();
        fetchAMCs(); // Refresh data
      } else {
        toast.error(result.error || "Failed to create AMC");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to create AMC");
    }
  };

  const handleUpdateAMC = async (amcData) => {
    try {
      toast.loading("Updating AMC...");
      const result = await updateAMC(selectedAMC._id, amcData);
      toast.dismiss();
      
      if (result.success) {
        toast.success("AMC updated successfully!");
        handleUpdate();
        fetchAMCs(); // Refresh data
      } else {
        toast.error(result.error || "Failed to update AMC");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to update AMC");
    }
  };

  useEffect(() => {
    fetchAMCs();
  }, [pagination.currentPage, search, typeFilter, statusFilter]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, [searchText, typeFilter, statusFilter]);

  const handleOnSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchText);
  };

  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return "N/A";
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' })
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  return (
    <>
      {loading && (
        <div className="overlay">
          <span className="loader"></span>
        </div>
      )}

      <style>
        {`
          @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="AMCMasterGrid" />
            <div
              className="main-panel"
              style={{
                width: isopen ? "" : "calc(100%  - 120px )",
                marginLeft: isopen ? "" : "125px",
              }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="row px-2 py-1">
                  <div className="col-12 col-lg-6">
                    <div className="row">
                      <div className="col-12 col-lg-4">
                        <h5 className="text-white py-2">
                          AMC Master Final Version
                          {expiredCount > 0 && (
                            <span className="badge bg-danger ms-2" style={{ animation: 'blink 1.5s infinite' }}>
                              {expiredCount} Expired
                            </span>
                          )}
                        </h5>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 ms-auto">
                    <div className="row g-2">
                      <div className="col-12 col-md-5">
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
                      
                      <div className="col-6 col-md-2">
                        <select 
                          className="form-select bg-transparant text-white"
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                        >
                          <option value="">All Types</option>
                          <option value="CMC">CMC</option>
                          <option value="NCMC">NCMC</option>
                          <option value="One Time Charge">One Time Charge</option>
                        </select>
                      </div>

                      {/* Added Status Filter */}
                      <div className="col-6 col-md-2">
                        <select 
                          className="form-select bg-transparant text-white"
                          value={statusFilter}
                          onChange={(e) => {
                            console.log("Status filter changed to:", e.target.value);
                            setStatusFilter(e.target.value);
                          }}
                        >
                          <option value="">All Statuses</option>
                          <option value="Pending">Pending</option>
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                          <option value="Ongoing">Ongoing</option>
                        </select>
                      </div>

                      {user?.permissions?.includes("createAMC") || user?.user === 'company' ? (
                        <div className="col-12 col-md-3 text-end">
                          <button
                            onClick={handleAdd}
                            type="button"
                            className="btn adbtn btn-dark w-100"
                          >
                            <i className="fa-solid fa-plus"></i> Add
                          </button>
                        </div>
                      ) : (
                        <div className="col-12 col-md-3"></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            <th>Sr. No</th>
                            <th className="align_left_td td_width">Invoice Number</th>
                            <th className="align_left_td td_width">Type</th>
                            <th className="text-end text-md-end td_width">Invoice Amount</th>
                            <th className="text-end text-md-end td_width">Quotation Amount</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Status</th>
                            <th>Completion</th>
                            <th>Next Follow-up</th>
                            <th>Duration (Days)</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {amcs.length > 0 ? (
                            amcs.map((amc, index) => {
                              const duration = Math.ceil((new Date(amc.amcEndDate) - new Date(amc.amcStartDate)) / (1000 * 60 * 60 * 24));
                              const daysRemaining = Math.ceil((new Date(amc.amcEndDate) - new Date()) / (1000 * 60 * 60 * 24));
                              const isExpired = daysRemaining < 0;
                              
                              return (
                                <tr 
                                  className={`border my-4 ${isExpired ? 'table-danger' : ''}`} 
                                  key={amc._id}
                                >
                                  <td>{index + 1 + (pagination.currentPage - 1) * itemsPerPage}</td>
                                  <td className="align_left_td td_width">{amc?.invoiceNumber}</td>
                                  <td className="align_left_td td_width">
                                    <span className={`badge ${
                                      amc?.type === 'CMC' ? 'bg-primary' : 
                                      amc?.type === 'NCMC' ? 'bg-info' : 
                                      'bg-warning'
                                    }`}>
                                      {amc?.type}
                                    </span>
                                  </td>
                                  <td className="text-end text-md-end td_width">{formatCurrency(amc?.invoiceAmount)}</td>
                                  <td className="text-end text-md-end td_width">{formatCurrency(amc?.quotationAmount)}</td>
                                  <td>{formatDate(amc?.amcStartDate)}</td>
                                  <td className={isExpired ? 'text-danger fw-bold' : ''}>
                                    {formatDate(amc?.amcEndDate)}
                                    {isExpired && <i className="fa-solid fa-circle-exclamation ms-1 text-danger"></i>}
                                  </td>
                                  <td>
                                    <span className={`badge ${
                                      amc?.status === 'Won' ? 'bg-success' : 
                                      amc?.status === 'Lost' ? 'bg-danger' : 
                                      amc?.status === 'Ongoing' ? 'bg-warning' : 
                                      'bg-secondary'
                                    }`}>
                                      {amc?.status || 'Pending'}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="progress" style={{ height: '20px' }}>
                                      <div 
                                        className={`progress-bar ${
                                          amc?.completion < 30 ? 'bg-danger' : 
                                          amc?.completion < 70 ? 'bg-warning' : 'bg-success'
                                        }`} 
                                        role="progressbar" 
                                        style={{ width: `${amc?.completion || 0}%` }}
                                        aria-valuenow={amc?.completion || 0} 
                                        aria-valuemin="0" 
                                        aria-valuemax="100"
                                      >
                                        {amc?.completion || 0}%
                                      </div>
                                    </div>
                                  </td>
                                  <td>{formatDate(amc?.nextFollowUpDate, true)}</td>
                                  <td>
                                    <span className={`badge ${
                                      isExpired ? 'bg-danger' : 
                                      daysRemaining < 30 ? 'bg-warning' : 
                                      'bg-success'
                                    }`}>
                                      {duration} days
                                      {isExpired ? ' (Expired)' : 
                                       daysRemaining < 30 ? ` (${daysRemaining} days left)` : ''}
                                    </span>
                                  </td>
                                  <td>
                                    {user?.permissions?.includes("updateAMC") || user?.user === 'company' ? (
                                      <span
                                        onClick={() => handleUpdate(amc)}
                                        className="update"
                                      >
                                        <i className="fa-solid fa-pen text-success cursor-pointer me-3"></i>
                                      </span>
                                    ) : (
                                      ""
                                    )}
                                    {user?.permissions?.includes("deleteAMC") || user?.user === 'company' ? (
                                      <span
                                        onClick={() =>
                                          handelDeleteClosePopUpClick(amc._id)
                                        }
                                        className="delete"
                                      >
                                        <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                      </span>
                                    ) : (
                                      ""
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="12" className="text-center">
                                No data found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
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
                          className={`btn btn-sm me-1 ${pagination.currentPage === number ? "btn-primary" : "btn-dark"
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
          message={"Are you sure! Do you want to Delete ?"}
          cancelBtnCallBack={handelDeleteClosePopUpClick}
          confirmBtnCallBack={handelDeleteClick}
          heading="Delete"
        />
      )}
      {AddPopUpShow && (
        <AddAMCPopup 
          onAddAMC={handleAddAMC}
          onClose={handleAdd} 
        />
      )}
      {updatePopUpShow && (
        <UpdateAMCPopup 
          selectedAMC={selectedAMC}
          onUpdateAMC={handleUpdateAMC}
          onClose={handleUpdate} 
        />
      )}
    </>
  );
};