import { useState,useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddProjectPopup from "./PopUp/AddProjectPopup";
import UpdateProjectPopup from "./PopUp/UpdateProjectPopup";
import DownloadPopup from "./PopUp/DownloadProjectPopup";
import { getProjects, deleteProject } from "../../../../hooks/useProjects";
import { formatDate } from "../../../../utils/formatDate";
import GaintchartPoup from "./PopUp/GaintchartPoup";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../../../context/UserContext";

export const ProjectMasterGrid = () => {
  const navigate = useNavigate();

  const [isopen, setIsOpen] = useState(false);
  const toggle = () => {
    setIsOpen(!isopen);
  };

  const { user } = useContext(UserContext);

  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [deletePopUpShow, setdeletePopUpShow] = useState(false);
  const [UpdatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [DetailsPopUpShow, setDetailsPopUpShow] = useState(false);
  const [DownloadPopUpShow, setDownloadPopUpShow] = useState(false);

  const [selectedId, setSelecteId] = useState(null);
  const [project, setProject] = useState([]);

  // Add search state
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: null });

  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalProjects: 0,
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

  const handleUpdate = (projects = null) => {
    setSelectedProject(projects);
    setUpdatePopUpShow(!UpdatePopUpShow);
  };

  const handleDetails = (project) => {
    setSelectedProject(project);
    setDetailsPopUpShow(!DetailsPopUpShow);
  };

  const handelDeleteClosePopUpClick = (id) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handleDownloads = () => {
    setDownloadPopUpShow(!DownloadPopUpShow);
  };

  const handleChange = (filterType, value) => {
    const updatedFilters = { ...filters, [filterType]: value || null };
    setFilters(updatedFilters);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  // Add search handler for Enter key
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setSearch(searchTerm);
    }
  };

  const handelDeleteClick = async () => {
    const data = await deleteProject(selectedId);
    if (data?.success) {
      handelDeleteClosePopUpClick();
      return toast.success(data?.message);
    }
    toast.error(data?.error);
  };

  // Extract fetchData to a separate function
  const fetchData = async () => {
    try {
      setLoading(true);
      // Pass search to getProjects (not searchTerm)
      const data = await getProjects(pagination.currentPage, itemsPerPage, filters, search);
      if (data?.success) {
        setProject(data.projects || []);
        setPagination(data.pagination || {
          currentPage: 1,
          totalPages: 0,
          totalProjects: 0,
          limit: itemsPerPage,
          hasNextPage: false,
          hasPrevPage: false,
        });
      } else{
        toast(data?.error);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.currentPage, AddPopUpShow, UpdatePopUpShow, deletePopUpShow, filters, search]);

  // Helper function to get status badge styles
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Upcoming":
        return "bg-primary";           // Blue
      case "Inprocess":
        return "bg-warning text-dark"; // Orange
      case "Completed":
        return "bg-success";           // Green
      default:
        return "bg-secondary";
    }
  };

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
            <Sidebar isopen={isopen} active="ProjectMasterGrid" />
            <div
              className="main-panel"
              style={{
                width: isopen ? "" : "calc(100%  - 120px )",
                marginLeft: isopen ? "" : "125px",
              }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="row px-2 py-1">
                  <div className="col-12 col-lg-4">
                    <h5 className="text-white py-2">Project Master</h5>
                  </div>

                  <div className="col-12 col-lg-6 ms-auto text-end">
                    <div className="row">
                      {/* Add search input field without button */}
                      <div className="col-8 col-lg-6">
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control bg_edit"
                            placeholder="Search Customer..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onKeyDown={handleSearchKeyDown}
                          />
                          {searchTerm && (
                            <button 
                              type="button" 
                              className="btn btn-light border-start-0"
                              onClick={() => {
                                setSearchTerm("");
                                setSearch("");
                              }}
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-4 col-lg-3">
                        <select
                          className="form-select bg_edit"
                          aria-label="Default select example"
                          name="projectStatus"
                          onChange={(e) => handleChange('status',e.target.value)}
                        >
                          <option value=""> Project Status</option>
                          <option value="Upcoming">Upcoming</option>
                          <option value="Inprocess">Inprocess</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>

                      {user?.permissions?.includes("createProject") ? (
                      <div className="col-4 col-lg-3 ms-auto">
                          <button
                            onClick={handleAdd}
                            type="button"
                            className="btn adbtn btn-dark me-4"
                          >
                            <i className="fa-solid fa-plus"></i> Add
                          </button>
                      </div>
                      ) : null }
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
                            <th className="align_left_td td_width">Product Name</th>
                            <th>Created By</th>
                            <th>Created Date</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Status</th>
                            <th>Assign</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {project.length > 0 ? (
                            project.map((project, index) => (
                              <tr className="border my-4" key={project._id}>
                                <td className="w-10">{index + 1 + (pagination.currentPage - 1) * itemsPerPage}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{project.custId?.custName || "N/A"}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{project.name}</td>
                                <td className="w-30">{project.createdBy?.name || "Unknown"}</td>
                                <td className="w-20">{formatDate(project.createdAt)}</td>
                                <td className="w-20">{formatDate(project.startDate)}</td>
                                <td className="w-20">{formatDate(project.endDate)}</td>
                                <td className="w-20">
                                  <span className={`badge rounded-pill px-2 py-1 ${getStatusBadgeClass(project.projectStatus)}`}>
                                    {project.projectStatus}
                                  </span>
                                </td>
                                <td className="w-20">
                                  {user?.permissions?.includes("viewTaskSheet") || user?.user==='company'?(
                                  <i
                                    onClick={() => {
                                      navigate(`/project/${project._id}`);
                                    }}
                                    className="fa-solid fa-share cursor-pointer"
                                  ></i>
                                  ):null}
                                </td>
                                <td className="w-20">
                                {user?.permissions?.includes("updateProject") || user?.user==='company'?(
                                  <span onClick={() => handleUpdate(project)} className="update">
                                    <i className="mx-1 fa-solid fa-pen text-success cursor-pointer"></i>
                                  </span>
                                  ):null}
                                  {user?.permissions?.includes("deleteProject") || user?.user==='company'?(
                                  <span onClick={() => handelDeleteClosePopUpClick(project._id)} className="delete">
                                    <i className="mx-1 fa-solid fa-trash text-danger cursor-pointer"></i>
                                  </span>
                                  ):null}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="10" className="text-center">
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
                  <div className="pagination-container text-center my-3 sm">
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
                      disabled={!pagination.hasPrevPage}
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
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

      {deletePopUpShow ? (
        <DeletePopUP
          message={"Are you sure! Do you want to Delete ?"}
          cancelBtnCallBack={handelDeleteClosePopUpClick}
          confirmBtnCallBack={handelDeleteClick}
          heading="Delete"
        />
      ) : (
        <></>
      )}
      {AddPopUpShow ? (
        <AddProjectPopup message="Create New Employee" handleAdd={handleAdd} />
      ) : (
        <></>
      )}
      {UpdatePopUpShow ? (
        <UpdateProjectPopup selectedProject={selectedProject} handleUpdate={handleUpdate} />
      ) : (
        <></>
      )}
      {DetailsPopUpShow ? (
        <GaintchartPoup selectedProject={selectedProject} handleDetails={handleDetails} />
      ) : (
        <></>
      )}
      {DownloadPopUpShow ? (
        <DownloadPopup handleDownloads={handleDownloads} />
      ) : (
        <></>
      )}
    </>
  );
};