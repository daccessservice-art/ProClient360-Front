import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddCustomerPopUp from "./PopUp/AddCustomerPopUp";
import UpdateCustomerPopUp from "./PopUp/UpdateCustomerPopUp";
import { getCustomers, deleteCustomer, exportCustomersPDF, exportCustomersExcel } from "../../../../hooks/useCustomer";
import { UserContext } from "../../../../context/UserContext";
import toast from "react-hot-toast";

export const CustomerMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const toggle = () => {
    setIsOpen(!isopen);
  };

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
    currentPage: 1,
    totalPages: 0,
    totalCustomers: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const itemsPerPage = 20;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAdd = () => {
    setAddPopUpShow(!AddPopUpShow);
  };

  const handleUpdate = (customer) => {
    setSelectedCust(customer);
    setUpdatePopUpShow(!updatePopUpShow);
  };

  const handelDeleteClosePopUpClick = (id) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handelDeleteClick = async () => {
    const data = await deleteCustomer(selectedId);
    if (data?.success) {
      toast.success(data?.message);
    } else {
      toast.error(data?.error);
    }
    setdeletePopUpShow(false);
    setCurrentPage(1);
  };

  // Export handlers
  const handleExportPDF = async () => {
    toast.loading('Exporting PDF...');
    const result = await exportCustomersPDF();
    toast.dismiss();
    
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.error || 'Failed to export PDF');
    }
  };

  const handleExportExcel = async () => {
    toast.loading('Exporting Excel...');
    const result = await exportCustomersExcel();
    toast.dismiss();
    
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.error || 'Failed to export Excel');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getCustomers(currentPage, itemsPerPage, search);
        if (data?.success) {
          setCustomers(data.customers || []);
          setPagination(data.pagination || {
            currentPage: 1,
            totalPages: 0,
            totalCustomers: 0,
            limit: itemsPerPage,
            hasNextPage: false,
            hasPrevPage: false,
          });
        }
        else {
          toast(data.error)
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, deletePopUpShow, AddPopUpShow, updatePopUpShow, search]);

  // Pagination button rendering logic
  const maxPageButtons = 5; // Maximum number of page buttons to display
  const halfMaxButtons = Math.floor(maxPageButtons / 2);
  let startPage = Math.max(1, currentPage - halfMaxButtons);
  let endPage = Math.min(pagination.totalPages, startPage + maxPageButtons - 1);

  // Adjust startPage if endPage is at the totalPages
  if (endPage - startPage + 1 < maxPageButtons) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  const handleOnSearchSubmit = (event) => {
    event.preventDefault();
    console.log("Search text:", searchText);
    setSearch(searchText);
  };

  const pageButtons = [];
  for (let i = startPage; i <= endPage; i++) {
    pageButtons.push(i);
  }

  return (
    <>
      {loading && (
        <div className="overlay">
          <span className="loader"></span>
        </div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="CustomerMasterGrid" />
            <div
              className="main-panel"
              style={{
                width: isopen ? "" : "calc(100% - 120px)",
                marginLeft: isopen ? "" : "125px",
              }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="row px-2 py-1">
                  <div className="col-12 col-lg-6">
                    <h5 className="text-white py-2">Customer Master</h5>
                  </div>
                  <div className="col-12 col-lg-6 ms-auto">
                    <div className="row">
                      <div className="col-12 col-lg-6 ms-auto text-end">
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
                      <div className="col-12 col-lg-6 text-end mt-2 mt-lg-0">
                        <div className="btn-group" role="group">
                          <button
                            onClick={handleExportPDF}
                            type="button"
                            className="btn btn-sm btn-danger me-1"
                            title="Export to PDF"
                            disabled={loading}
                          >
                            <i className="fa-solid fa-file-pdf"></i> PDF
                          </button>
                          <button
                            onClick={handleExportExcel}
                            type="button"
                            className="btn btn-sm btn-success me-1"
                            title="Export to Excel"
                            disabled={loading}
                          >
                            <i className="fa-solid fa-file-excel"></i> Excel
                          </button>
                          {user?.permissions && user?.permissions?.includes("createCustomer") || user.user === 'company' ? (
                            <button
                              onClick={handleAdd}
                              type="button"
                              className="btn btn-sm btn-dark"
                              disabled={loading}
                            >
                              <i className="fa-solid fa-plus"></i> Add
                            </button>
                          ) : null}
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
                            <th>Sr. No</th>
                            <th className="align_left_td td_width">Customer Name</th>
                            <th className="align_left_td td_width">Email</th>
                            <th>Phone</th>
                            <th>GST No</th>
                            <th>Created By</th>
                            <th>Owned By</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.length > 0 ? (
                            customers.map((customer, index) => (
                              <tr className="border my-4" key={customer._id}>
                                <td className="w-10">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{customer.custName}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{customer.email}</td>
                                <td>{customer.phoneNumber1}</td>
                                <td>{customer.GSTNo}</td>
                                <td>{customer.createdBy?.name || 'N/A'}</td>
                                <td>{customer.ownedBy || 'N/A'}</td>
                                <td>
                                  {user?.permissions?.includes(
                                    "updateCustomer"
                                  ) || user?.user === 'company' ? (
                                    <span
                                      onClick={() => handleUpdate(customer)}
                                      className="update"
                                    >
                                      <i className="fa-solid fa-pen text-success me-3 cursor-pointer"></i>
                                    </span>
                                  ) : (
                                    ""
                                  )}

                                  {user?.permissions?.includes(
                                    "deleteCustomer"
                                  ) || user?.user === 'company' ? (
                                    <span
                                      onClick={() =>
                                        handelDeleteClosePopUpClick(
                                          customer._id
                                        )
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

                <div className="pagination-container text-center my-3 sm">
                  <button
                    disabled={!pagination.hasPrevPage}
                    onClick={() => handlePageChange(1)}
                    className="btn btn-dark btn-sm me-2"
                  >
                    First
                  </button>
                  <button
                    disabled={!pagination.hasPrevPage}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="btn btn-dark btn-sm me-2"
                  >
                    Previous
                  </button>
                  {startPage > 1 && <span className="mx-2">...</span>}

                  {pageButtons.map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`btn btn-sm me-1 ${ 
                        pagination.currentPage === page ? "btn-primary" : "btn-dark"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {endPage < pagination.totalPages && <span className="mx-2">...</span>}
                  <button
                    disabled={!pagination.hasNextPage}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="btn btn-dark btn-sm me-2"
                  >
                    Next
                  </button>
                  <button
                    disabled={!pagination.hasNextPage}
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className="btn btn-dark btn-sm"
                  >
                    Last
                  </button>
                </div>
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

      {AddPopUpShow && <AddCustomerPopUp handleAdd={handleAdd} />}

      {updatePopUpShow && (
        <UpdateCustomerPopUp
          selectedCust={selectedCust}
          handleUpdate={handleUpdate}
        />
      )}
    </>
  );
};