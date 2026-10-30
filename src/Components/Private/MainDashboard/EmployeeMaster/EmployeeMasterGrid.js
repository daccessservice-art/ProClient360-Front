import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import AddEmployeePopup from "./PopUp/AddEmployeePopup";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import UpdateEmployeePopUp from "./PopUp/UpdateEmployeePopUp";
// ✅ NEW: HR sets yearly / quarterly / monthly sales target
import SetTargetPopup from "./PopUp/SetTargetPopup";
import toast from "react-hot-toast";
import { getEmployees, deleteEmployee } from "../../../../hooks/useEmployees";
import { UserContext } from "../../../../context/UserContext";

export const EmployeeMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => {
    setIsOpen(!isopen);
  };

  const { user } = useContext(UserContext);

  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [deletePopUpShow, setdeletePopUpShow] = useState(false);
  const [selectedId, setSelecteId] = useState(null);
  const [updatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  // ✅ NEW: target popup
  const [targetEmp, setTargetEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");

  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalEmployees: 0,
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

  const handleUpdate = (employee = null) => {
    setSelectedEmp(employee);
    setUpdatePopUpShow(!updatePopUpShow);
  };

  const handelDeleteClosePopUpClick = (id) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handelDeleteClick = async () => {
    toast.loading("Deleting Employee...")
    const data = await deleteEmployee(selectedId);
    toast.dismiss()
    if (data?.success) {
      handelDeleteClosePopUpClick();
      return toast.success(data?.message);
    }
    toast.error(data?.error);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getEmployees(pagination.currentPage, itemsPerPage, search);
        if (data?.success) {
          setEmployees(data.employees || []);
          setPagination(data.pagination || {
            currentPage: 1,
            totalPages: 0,
            totalEmployees: 0,
            limit: itemsPerPage,
            hasNextPage: false,
            hasPrevPage: false,
          });
        }else{
          toast(data.error);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [pagination.currentPage, deletePopUpShow, updatePopUpShow, AddPopUpShow, search]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, [searchText]);

  const handleOnSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchText);
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
            <Sidebar isopen={isopen} active="EmployeeMasterGrid" />
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
                        <h5 className="text-white py-2">Employee Master</h5>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-5 ms-auto">

                    <div className="row ">

                      <div className="col-8 col-lg-5 ms-auto text-end">
                        <div className="form">
                          <i className="fa fa-search"></i>
                          <form onSubmit={handleOnSearchSubmit} >
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

                      {user?.permissions?.includes("createEmployee") || user?.user==='company' ? (
                      <div className="col-12 col-lg-2 ms-auto text-end me-5">
                          <button
                            onClick={handleAdd}
                            type="button"
                            className="btn adbtn btn-dark"
                          >
                            <i className="fa-solid fa-plus"></i> Add
                          </button>
                      </div>
                        ) : (
                          ""
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
                            <th className="align_left_td td_width">Employee Name</th>
                            <th className="align_left_td td_width">Email</th>
                            <th>Department</th>
                            <th>Designation</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {employees.length > 0 ? (
                            employees.map((employee, index) => (
                              <tr className="border my-4" key={employee._id}>
                                <td>{index + 1 + (pagination.currentPage - 1) * itemsPerPage}</td>
                                <td className="align_left_td td_width">{employee?.name}</td>
                                <td className="align_left_td td_width">{employee?.email}</td>
                                <td>{employee?.department && employee?.department?.name}</td>
                                <td>{employee?.designation && employee?.designation?.name}</td>
                                <td>
                                  {user?.permissions?.includes("updateEmployee") || user?.user === 'company' ? (
                                    <span
                                      onClick={() => handleUpdate(employee)}
                                      className="update"
                                    >
                                      <i className="fa-solid fa-pen text-success cursor-pointer me-3"></i>
                                    </span>
                                  ) : (
                                    ""
                                  )}
                                  {/* ✅ NEW: Set sales target */}
                                  {user?.permissions?.includes("updateEmployee") || user?.user === 'company' ? (
                                    <span
                                      onClick={() => setTargetEmp(employee)}
                                      title="Set sales target"
                                    >
                                      <i className="fa-solid fa-bullseye text-primary cursor-pointer me-3"></i>
                                    </span>
                                  ) : (
                                    ""
                                  )}
                                  {user?.permissions?.includes("deleteEmployee") || user?.user === 'company' ? (
                                    <span
                                      onClick={() =>
                                        handelDeleteClosePopUpClick(employee._id)
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
                              <td colSpan="6" className="text-center">
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
      {deletePopUpShow ? (
        <DeletePopUP
          message={"Are you sure! Do you want to Delete ?"}
          cancelBtnCallBack={handelDeleteClosePopUpClick}
          confirmBtnCallBack={handelDeleteClick}
          heading="Delete"
        />
      ) : null}
      {AddPopUpShow ? (
        <AddEmployeePopup message="Create New Employee" handleAdd={handleAdd} />
      ) : null}
      {updatePopUpShow ? (
        <UpdateEmployeePopUp selectedEmp={selectedEmp} handleUpdate={handleUpdate} />
      ) : null}
      {/* ✅ NEW: Sales target popup */}
      {targetEmp ? (
        <SetTargetPopup employee={targetEmp} handleClose={() => setTargetEmp(null)} />
      ) : null}
    </>
  );
};