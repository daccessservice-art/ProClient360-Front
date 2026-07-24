import { useState, useEffect } from "react";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import ViewTaskPopUp from "./PopUp/ViewTaskPopUp";
import TesterQueuePopUp from "./PopUp/TesterQueuePopUp"; // ✅ NEW
import { getMyProjects } from "../../../../hooks/useProjects";
import { getTesterTasks } from "../../../../hooks/useTaskSheet"; // ✅ NEW
import { formatDate } from "../../../../utils/formatDate";
import { Header } from "../../MainDashboard/Header/Header";
import { Sidebar } from "../../MainDashboard/Sidebar/Sidebar";

import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
const APP_TOOLTIP_ID = 'employee-task-grid-tooltip';

const BeaconIndicator = ({ color = '#40A2D3', size = '14px', title = '', className = '' }) => {
  const style = {
    '--beacon-indicator-color': color,
    '--beacon-indicator-size': size,
  };
  return (
    <div
      className={`beacon-indicator-wrapper ${className}`}
      data-tooltip-id={APP_TOOLTIP_ID}
      data-tooltip-content={title}
      data-tooltip-place="bottom"
    >
      <div className="beacon-indicator" style={style}></div>
    </div>
  );
};

const Notification = ({ title, message }) => {
  console.log(`--- NOTIFICATION ---\nTitle: ${title}\nMessage: ${message}\n--------------------`);
};

const commonThStyle = {
  backgroundColor: 'transparent',
  color: 'white',
};

export const EmployeeTaskGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [TaskPopUpShow, setTaskPopUpShow] = useState(false);
  const [deletePopUpShow, setdeletePopUpShow] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalProjects: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const itemsPerPage = 20;

  const [notifiedTomorrowProjects, setNotifiedTomorrowProjects] = useState(new Set());

  // ✅ NEW — Tester's own testing queue
  const [testerQueueShow, setTesterQueueShow] = useState(false);
  const [testerQueueCount, setTesterQueueCount] = useState(0);

  useEffect(() => {
    const styleId = 'beacon-indicator-styles';
    if (document.getElementById(styleId)) return;
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
      .beacon-indicator-wrapper { display: inline-block; vertical-align: middle; }
      .beacon-indicator {
        position: relative;
        width: var(--beacon-indicator-size);
        height: var(--beacon-indicator-size);
        background-color: var(--beacon-indicator-color);
        margin: 0 auto;
        border: none;
        border-radius: 50%;
        padding: 0;
        outline: none;
        display: block;
      }
      .beacon-indicator::after {
        content: '';
        width: calc(var(--beacon-indicator-size) * 0.35);
        height: calc(var(--beacon-indicator-size) * 0.35);
        position: absolute;
        top: 50%; left: 50%;
        transform: translateX(-50%) translateY(-50%);
        border-width: calc(var(--beacon-indicator-size) * 0.12);
        border-style: solid;
        border-color: var(--beacon-indicator-color);
        border-radius: 50%;
        animation: beacon-indicator-animation 1.5s infinite linear;
        animation-fill-mode: forwards;
        box-sizing: border-box;
      }
      @keyframes beacon-indicator-animation {
        0%   { width: 0; height: 0; opacity: 1; }
        25%  { width: calc(var(--beacon-indicator-size) * 1);   height: calc(var(--beacon-indicator-size) * 1);   opacity: 0.7; }
        50%  { width: calc(var(--beacon-indicator-size) * 1.2); height: calc(var(--beacon-indicator-size) * 1.2); opacity: 0.5; }
        75%  { width: calc(var(--beacon-indicator-size) * 2);   height: calc(var(--beacon-indicator-size) * 2);   opacity: 0.3; }
        100% { width: calc(var(--beacon-indicator-size) * 2.5); height: calc(var(--beacon-indicator-size) * 2.5); opacity: 0; }
      }
    `;
    document.head.appendChild(styleElement);
  }, []);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination((prev) => ({
        ...prev,
        currentPage: page,
        hasNextPage: page < prev.totalPages,
        hasPrevPage: page > 1,
      }));
    }
  };

  const handleViewTask = (id) => {
    setSelectedId(id);
    setTaskPopUpShow(!TaskPopUpShow);
  };

  const handelDeleteClosePopUpClick = (id = null) => {
    setSelectedId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  // Only overdue (past) OR due today
  const isDateAlertNeeded = (dateString, status) => {
    if (status && status.toLowerCase() === 'completed') return false;
    const today = new Date();
    const finishDate = new Date(dateString);
    if (isNaN(finishDate.getTime())) return false;
    today.setHours(0, 0, 0, 0);
    finishDate.setHours(0, 0, 0, 0);
    return finishDate <= today;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getMyProjects();
        const fetchedProjects = data?.projects || [];
        setProjects(fetchedProjects);
        setFilteredProjects(fetchedProjects);
        const total = fetchedProjects.length;
        const totalPages = Math.ceil(total / itemsPerPage);
        setPagination({
          currentPage: 1,
          totalPages,
          totalProjects: total,
          limit: itemsPerPage,
          hasNextPage: 1 < totalPages,
          hasPrevPage: false,
        });
      } catch (error) {
        console.error("Error fetching projects:", error);
        setProjects([]);
        setFilteredProjects([]);
        setPagination({ currentPage: 1, totalPages: 0, totalProjects: 0, limit: itemsPerPage, hasNextPage: false, hasPrevPage: false });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ✅ NEW — Keep a live count of pending testing-queue items for the badge
  useEffect(() => {
    const fetchTesterCount = async () => {
      try {
        const data = await getTesterTasks();
        if (data?.success) {
          const pending = (data.task || []).filter(
            t => t.qaStatus === 'pending_test' || t.qaStatus === 'testing'
          ).length;
          setTesterQueueCount(pending);
        }
      } catch (e) {
        // silent — this is just a badge count, not critical
      }
    };
    fetchTesterCount();
  }, [testerQueueShow]);

  const applyFilters = (allProjects, statusVal, searchVal) => {
    let result = allProjects;
    if (statusVal) {
      result = result.filter(
        (p) => p.projectStatus && p.projectStatus.toLowerCase() === statusVal.toLowerCase()
      );
    }
    if (searchVal && searchVal.trim() !== "") {
      const lowerSearch = searchVal.trim().toLowerCase();
      result = result.filter(
        (p) => p.custId?.custName && p.custId.custName.toLowerCase().includes(lowerSearch)
      );
    }
    return result;
  };

  const updatePagination = (filtered) => {
    const newTotalPages = Math.ceil(filtered.length / itemsPerPage);
    setPagination(prev => ({
      ...prev,
      currentPage: 1,
      totalPages: newTotalPages,
      totalProjects: filtered.length,
      hasNextPage: 1 < newTotalPages,
      hasPrevPage: false,
    }));
  };

  const handleChange = (value) => {
    setStatusFilter(value);
    const filtered = applyFilters(projects, value, search);
    setFilteredProjects(filtered);
    updatePagination(filtered);
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setSearch(searchTerm);
      const filtered = applyFilters(projects, statusFilter, searchTerm);
      setFilteredProjects(filtered);
      updatePagination(filtered);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearch("");
    const filtered = applyFilters(projects, statusFilter, "");
    setFilteredProjects(filtered);
    updatePagination(filtered);
  };

  const indexOfLastItem = pagination.currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = filteredProjects.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    if (currentData && currentData.length > 0) {
      const newNotificationsSent = new Set(notifiedTomorrowProjects);
      let updatedNotifiedSet = false;
      currentData.forEach(project => {
        const projectStatusLower = project.projectStatus ? project.projectStatus.toLowerCase() : "";
        if (projectStatusLower === 'upcoming' || projectStatusLower === 'inprocess') {
          const today = new Date();
          const end = new Date(project.endDate);
          if (isNaN(end.getTime())) return;
          today.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1 && !notifiedTomorrowProjects.has(project._id)) {
            Notification({ title: "Project Due Tomorrow", message: `Project "${project.name}" is due tomorrow.` });
            newNotificationsSent.add(project._id);
            updatedNotifiedSet = true;
          }
        }
      });
      if (updatedNotifiedSet) setNotifiedTomorrowProjects(newNotificationsSent);
    }
  }, [currentData, notifiedTomorrowProjects]);

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
            <Sidebar isopen={isopen} active="EmployeeTaskGrid" />
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* ── Title + Search + Filter + Testing Queue + Legend ── */}
                <div className="row px-2 py-1 align-items-center">
                  {/* Title */}
                  <div className="col-12 col-lg-2">
                    <h5 className="text-white py-2 mb-0">My Projects</h5>
                  </div>

                  {/* Search */}
                  <div className="col-12 col-lg-3">
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
                        <button type="button" className="btn btn-light border-start-0" onClick={handleClearSearch}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="col-12 col-lg-2">
                    <select className="form-select bg_edit" name="projectStatus" onChange={(e) => handleChange(e.target.value)}>
                      <option value="">All Status</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="inprocess">Inprocess</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  {/* ✅ NEW — My Testing Queue button */}
                  <div className="col-12 col-lg-2 mt-2 mt-lg-0">
                    <button
                      type="button"
                      className="btn btn-info btn-sm w-100 text-white position-relative"
                      onClick={() => setTesterQueueShow(true)}
                    >
                      <i className="fa-solid fa-vial me-1"></i> Testing Queue
                      {testerQueueCount > 0 && (
                        <span className="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle">
                          {testerQueueCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* ── Blinker Legend beside search bar ── */}
                  <div className="col-12 col-lg-3 d-flex align-items-center justify-content-lg-end mt-2 mt-lg-0">
                    <div
                      className="d-inline-flex align-items-center px-3 py-2 rounded"
                      style={{
                        background: 'rgba(255,255,255,0.10)',
                        border: '1px solid rgba(255,255,255,0.20)',
                        gap: '14px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span className="text-white" style={{ fontSize: '12px', fontWeight: 600 }}>
                        Work Status :
                      </span>

                      {/* Overdue — orange */}
                      <span className="d-flex align-items-center" style={{ gap: '7px' }}>
                        <BeaconIndicator color="#F29339" size="12px" title="Overdue" />
                        <span className="text-white" style={{ fontSize: '12px' }}>Overdue</span>
                      </span>

                      {/* Due Today — sky blue */}
                      <span className="d-flex align-items-center" style={{ gap: '7px' }}>
                        <BeaconIndicator color="#40A2D3" size="12px" title="Due Today" />
                        <span className="text-white" style={{ fontSize: '12px' }}>Due Today</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Table ── */}
                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            <th style={commonThStyle}>Sr. No</th>
                            <th className="align_left_td td_width">Customer Name</th>
                            <th className="align_left_td td_width">Project Name</th>
                            <th>Project Status</th>
                            <th style={commonThStyle}>Finish Date</th>
                            <th style={commonThStyle}>Work Status</th>
                            <th style={commonThStyle}>Tasks</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {currentData && currentData.length > 0 ? (
                            currentData.map((project, index) => {
                              const projectStatusLower = project.projectStatus ? project.projectStatus.toLowerCase() : "";
                              const needsAlert = isDateAlertNeeded(project.endDate, projectStatusLower);

                              return (
                                <tr className="border my-4" key={project._id}>
                                  <td className="w-3">{index + 1 + (pagination.currentPage - 1) * itemsPerPage}</td>
                                  <td className="align_left_td td_width wrap-text-of-col">{project.custId?.custName || "N/A"}</td>
                                  <td className="align_left_td td_width wrap-text-of-col">{project.name}</td>
                                  <td>{project.projectStatus}</td>
                                  <td>{formatDate(project.endDate)}</td>
                                  <td>
                                    {needsAlert && (projectStatusLower === 'upcoming' || projectStatusLower === 'inprocess') && (() => {
                                      const today = new Date();
                                      const end = new Date(project.endDate);
                                      if (isNaN(end.getTime())) return null;
                                      today.setHours(0, 0, 0, 0);
                                      end.setHours(0, 0, 0, 0);
                                      const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 3600 * 24));

                                      if (diffDays < 0) {
                                        const daysOverdue = Math.abs(diffDays);
                                        return (
                                          <BeaconIndicator
                                            color="#F29339"
                                            size="14px"
                                            title={`Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`}
                                            className="indicate_width"
                                          />
                                        );
                                      } else if (diffDays === 0) {
                                        return (
                                          <BeaconIndicator
                                            color="#40A2D3"
                                            size="14px"
                                            title="Due today"
                                            className="indicate_width"
                                          />
                                        );
                                      }
                                      return null;
                                    })()}
                                  </td>
                                  <td>
                                    <i
                                      onClick={() => handleViewTask(project._id)}
                                      className="fa-solid fa-eye Task_View_icon cursor-pointer"
                                      data-tooltip-id={APP_TOOLTIP_ID}
                                      data-tooltip-content="View Tasks"
                                      data-tooltip-place="bottom"
                                    ></i>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="7" className="text-center">No Projects Found Matching Criteria</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ── Pagination ── */}
                {!loading && pagination.totalPages > 1 && (
                  <div className="pagination-container text-center my-3">
                    <button onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage} className="btn btn-dark btn-sm me-1" style={{ borderRadius: "4px" }}>First</button>
                    <button disabled={!pagination.hasPrevPage} onClick={() => handlePageChange(pagination.currentPage - 1)} className="btn btn-dark btn-sm me-1" style={{ borderRadius: "4px" }}>Previous</button>

                    {(() => {
                      const pageNumbers = [];
                      const maxPagesToShow = 5;
                      if (pagination.totalPages <= maxPagesToShow) {
                        for (let i = 1; i <= pagination.totalPages; i++) pageNumbers.push(i);
                      } else {
                        let startPage, endPage;
                        if (pagination.currentPage <= Math.ceil(maxPagesToShow / 2)) {
                          startPage = 1; endPage = maxPagesToShow;
                        } else if (pagination.currentPage + Math.floor(maxPagesToShow / 2) >= pagination.totalPages) {
                          startPage = pagination.totalPages - maxPagesToShow + 1; endPage = pagination.totalPages;
                        } else {
                          startPage = pagination.currentPage - Math.floor(maxPagesToShow / 2);
                          endPage = pagination.currentPage + Math.floor(maxPagesToShow / 2);
                        }
                        startPage = Math.max(1, startPage); endPage = Math.min(pagination.totalPages, endPage);
                        if (startPage > 1) { pageNumbers.push(1); if (startPage > 2) pageNumbers.push('...'); }
                        for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
                        if (endPage < pagination.totalPages) { if (endPage < pagination.totalPages - 1) pageNumbers.push('...'); pageNumbers.push(pagination.totalPages); }
                      }
                      return pageNumbers.map((number, idx) =>
                        typeof number === 'number' ? (
                          <button key={number} onClick={() => handlePageChange(number)} className={`btn btn-sm me-1 ${pagination.currentPage === number ? "btn-primary" : "btn-dark"}`} style={{ minWidth: "35px", borderRadius: "4px" }}>{number}</button>
                        ) : (
                          <span key={`e-${idx}`} className="btn btn-sm btn-disabled me-1" style={{ minWidth: "35px", borderRadius: "4px", border: "1px solid #6c757d", cursor: "default" }}>{number}</span>
                        )
                      );
                    })()}

                    <button disabled={!pagination.hasNextPage} onClick={() => handlePageChange(pagination.currentPage + 1)} className="btn btn-dark btn-sm me-1" style={{ borderRadius: "4px" }}>Next</button>
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
          heading="Delete Confirmation"
        />
      )}
      {TaskPopUpShow && (
        <ViewTaskPopUp
          message="Task Details"
          selectedId={selectedId}
          handleViewTask={handleViewTask}
        />
      )}

      {/* ✅ NEW — Tester's own testing queue popup */}
      {testerQueueShow && (
        <TesterQueuePopUp onClose={() => setTesterQueueShow(false)} />
      )}

      <Tooltip id={APP_TOOLTIP_ID} />
    </>
  );
}