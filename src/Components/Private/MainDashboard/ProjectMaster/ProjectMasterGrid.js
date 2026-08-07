import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddProjectPopup from "./PopUp/AddProjectPopup";
import UpdateProjectPopup from "./PopUp/UpdateProjectPopup";
import DownloadPopup from "./PopUp/DownloadProjectPopup";
import MRFPopup from "./PopUp/MRFPopup";
import { getProjects, deleteProject } from "../../../../hooks/useProjects";
import { getMaterialStatusByProject } from "../../../../hooks/useProjectPurchase";
import { formatDate } from "../../../../utils/formatDate";
import GaintchartPoup from "./PopUp/GaintchartPoup";
import { useNavigate, useLocation } from "react-router-dom";
import { UserContext } from "../../../../context/UserContext";
import ProjectProgressReportPanel from "./ProjectProgressReportPanel";

// ─── Material Availability Badge for Project Master ────────────────
const MaterialAvailabilityBadge = ({ projectId }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        getMaterialStatusByProject(projectId)
            .then(data => {
                if (data?.success) setStatus(data);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) return <small className="text-muted">...</small>;
    if (!status) return <span className="badge bg-secondary" style={{ fontSize: '10px' }}>No Request</span>;

    const badgeClass = status.materialAvailable ? 'bg-success' :
        status.materialStatus === 'Not Available' ? 'bg-danger' :
        status.materialStatus === 'Check Pending' ? 'bg-warning text-dark' : 'bg-info';

    return (
        <div>
            <span className={`badge rounded-pill px-2 py-1 ${badgeClass}`} style={{ fontSize: '10px' }}>
                {status.materialStatus || 'N/A'}
            </span>
            {status.paymentTermsMatch && status.paymentTermsMatch !== 'Pending' && (
                <div style={{ fontSize: '9px' }} className={status.paymentTermsMatch === 'Matched' ? 'text-success' : 'text-danger'}>
                    Pay: {status.paymentTermsMatch}
                </div>
            )}
        </div>
    );
};

export const ProjectMasterGrid = () => {
  const navigate = useNavigate();
  // ── NEW: read state passed back from TaskSheetMaster's Back button (page/search/filters) ──
  const location = useLocation();

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
  // ─── NEW: MRF Popup State ───────────────────────────────────────────
  const [MRFPopUpShow, setMRFPopUpShow] = useState(false);
  // ───────────────────────────────────────────────────────────────────

  const [selectedId, setSelecteId] = useState(null);
  const [project, setProject] = useState([]);

  // ── NEW: restore search/filter state if we arrived here via the Back button ──
  const [searchTerm, setSearchTerm] = useState(location.state?.fromSearchTerm || "");
  const [search, setSearch] = useState(location.state?.fromSearch || "");
  const [filters, setFilters] = useState(location.state?.fromFilters || { status: null });

  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    // ── NEW: restore the page the user was on before they clicked Assign ──
    currentPage: location.state?.fromPage || 1,
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

  // ─── NEW: MRF Handler ───────────────────────────────────────────────
  const handleMRF = (project = null) => {
    setSelectedProject(project);
    setMRFPopUpShow(!MRFPopUpShow);
  };
  // ───────────────────────────────────────────────────────────────────

  const handleChange = (filterType, value) => {
    const updatedFilters = { ...filters, [filterType]: value || null };
    setFilters(updatedFilters);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

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

  const fetchData = async () => {
    try {
      setLoading(true);
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Upcoming":
        return "bg-primary";
      case "Inprocess":
        return "bg-warning text-dark";
      case "Completed":
        return "bg-success";
      default:
        return "bg-secondary";
    }
  };

  const getAssignIconColor = (taskCount) => {
    return taskCount > 0 ? "#198754" : "#adb5bd";
  };

  const getAssignIconTitle = (taskCount) => {
    return taskCount > 0 ? `${taskCount} Task(s) Assigned` : "No Tasks Assigned Yet";
  };

  // ── NEW: navigate to the Task Sheet page, carrying the current page/search/
  // filters in location state so the Back button there can bring the user
  // back to exactly this view instead of always landing on page 1. ──
  const goToTaskSheet = (projectId) => {
    navigate(`/project/${projectId}`, {
      state: {
        fromPage: pagination.currentPage,
        fromSearch: search,
        fromSearchTerm: searchTerm,
        fromFilters: filters,
      },
    });
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
                          value={filters.status || ""}
                          onChange={(e) => handleChange('status', e.target.value)}
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
                      ) : null}
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
                            <th>PO Number</th>
                            <th>Created By</th>
                            <th>Created Date</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Status</th>
                            <th>Material</th>
                            <th>Assign</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {project.length > 0 ? (
                            project.map((project, index) => (
                              <tr className="border my-4" key={project._id}>
                                <td className="w-10">
                                  {index + 1 + (pagination.currentPage - 1) * itemsPerPage}
                                </td>
                                <td className="align_left_td td_width wrap-text-of-col">
                                  {project.custId?.custName || "N/A"}
                                </td>
                                <td className="align_left_td td_width wrap-text-of-col">
                                  {project.name}
                                </td>
                                <td className="w-20">
                                  {project.purchaseOrderNo || "N/A"}
                                </td>
                                <td className="w-30">
                                  {project.createdBy?.name || "Unknown"}
                                </td>
                                <td className="w-20">{formatDate(project.createdAt)}</td>
                                <td className="w-20">{formatDate(project.startDate)}</td>
                                <td className="w-20">{formatDate(project.endDate)}</td>
                                <td className="w-20">
                                  <span className={`badge rounded-pill px-2 py-1 ${getStatusBadgeClass(project.projectStatus)}`}>
                                    {project.projectStatus}
                                  </span>
                                </td>
                                {/* Material Availability Column */}
                                <td className="w-20">
                                  <MaterialAvailabilityBadge projectId={project._id} />
                                </td>
                                <td className="w-20">
                                  {user?.permissions?.includes("viewTaskSheet") || user?.user === 'company' ? (
                                    <i
                                      onClick={() => goToTaskSheet(project._id)}
                                      className="fa-solid fa-share cursor-pointer"
                                      title={getAssignIconTitle(project.taskCount || 0)}
                                      style={{
                                        color: getAssignIconColor(project.taskCount || 0),
                                        fontSize: '18px',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s',
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    ></i>
                                  ) : null}
                                </td>

                                {/* ─── ACTION COLUMN: Edit + Delete + NEW MRF Button ─── */}
                                <td className="w-20">
                                  {user?.permissions?.includes("updateProject") || user?.user === 'company' ? (
                                    <span onClick={() => handleUpdate(project)} className="update" title="Edit Project">
                                      <i className="mx-1 fa-solid fa-pen text-success cursor-pointer"></i>
                                    </span>
                                  ) : null}
                                  {user?.permissions?.includes("deleteProject") || user?.user === 'company' ? (
                                    <span onClick={() => handelDeleteClosePopUpClick(project._id)} className="delete" title="Delete Project">
                                      <i className="mx-1 fa-solid fa-trash text-danger cursor-pointer"></i>
                                    </span>
                                  ) : null}

                                  {/* ─── NEW: MRF Button ─────────────────────── */}
                                  {user?.permissions?.includes("createMRF") || user?.permissions?.includes("updateProject") || user?.user === 'company' ? (
                                    <span
                                      onClick={() => handleMRF(project)}
                                      title="Create / View MRF"
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <span
                                        style={{
                                          display: 'inline-block',
                                          background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 100%)',
                                          color: '#fff',
                                          fontSize: '9px',
                                          fontWeight: '700',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          marginLeft: '4px',
                                          letterSpacing: '0.3px',
                                          verticalAlign: 'middle',
                                          boxShadow: '0 1px 4px rgba(44,62,80,0.25)',
                                          transition: 'transform 0.15s, box-shadow 0.15s',
                                          cursor: 'pointer',
                                        }}
                                        onMouseEnter={e => {
                                          e.currentTarget.style.transform = 'scale(1.1)';
                                          e.currentTarget.style.boxShadow = '0 3px 8px rgba(44,62,80,0.4)';
                                        }}
                                        onMouseLeave={e => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                          e.currentTarget.style.boxShadow = '0 1px 4px rgba(44,62,80,0.25)';
                                        }}
                                      >
                                        📋 MRF
                                      </span>
                                    </span>
                                  ) : null}
                                  {/* ──────────────────────────────────────────── */}
                                </td>
                              </tr>
                            ))
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
                  <div className="pagination-container text-center my-3 sm">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={!pagination.hasPrevPage}
                      className="btn btn-dark btn-sm me-1"
                      style={{ borderRadius: "4px" }}
                    >
                      First
                    </button>

                    <button
                      disabled={!pagination.hasPrevPage}
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      className="btn btn-dark btn-sm me-1"
                      style={{ borderRadius: "4px" }}
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

      {/* ─── NEW: MRF Popup ──────────────────────────────────────────── */}
      {MRFPopUpShow && selectedProject ? (
        <MRFPopup selectedProject={selectedProject} handleMRF={handleMRF} />
      ) : null}
      {/* ──────────────────────────────────────────────────────────────── */}
    </>
  );
};