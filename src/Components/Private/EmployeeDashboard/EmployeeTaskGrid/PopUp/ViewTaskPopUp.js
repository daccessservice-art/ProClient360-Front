/**
 * ViewTaskPopUp.jsx  (UPDATED)
 *  - Each employee sees HIS OWN progress/status (backend now sends per-employee values)
 *  - Pending tasks on top (latest first), completed tasks below
 *  - Filter: All / Pending / Completed
 *  - Team Lead "Sub-Task" + Excel export kept as before
 */

import { useState, useEffect, useMemo } from "react";
import TaskListUpdatedPopUp from "./TaskListUpdatedPopUp";
import SubtaskAssignPopUp from "./SubtaskAssignPopUp";
import { getMyTaskSheet, downloadMyTeamReport } from "../../../../../hooks/useTaskSheet";
import { formatDate } from "../../../../../utils/formatDate";

const ViewTaskPopUp = ({ handleViewTask, selectedId }) => {
  const [updateTaskPopUpShow, setUpdateTaskPopUpShow] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState({});
  const [filter, setFilter] = useState("all"); // all | pending | completed

  const [subtaskPopupShow, setSubtaskPopupShow] = useState(false);
  const [subtaskParentTask, setSubtaskParentTask] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleUpdateTask = (id) => {
    setSelectedTask(id);
    setUpdateTaskPopUpShow(!updateTaskPopUpShow);
  };

  const fetchTasks = async () => {
    const data = await getMyTaskSheet(selectedId);
    if (data) setTasks(data.task || []);
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateTaskPopUpShow]);

  const handleOpenSubtaskAssign = (task) => {
    setSubtaskParentTask(task);
    setSubtaskPopupShow(true);
  };
  const handleCloseSubtask = () => {
    setSubtaskPopupShow(false);
    setSubtaskParentTask(null);
  };
  const handleSubtaskSuccess = () => fetchTasks();

  const handleExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await downloadMyTeamReport(selectedId);
    } finally {
      setExporting(false);
    }
  };

  // taskLevel here is MY OWN level (backend sends per-employee values)
  const isMyTaskDone = (t) => (Number(t.taskLevel) || 0) >= 100 && (!t.qaStatus || t.qaStatus === "none" || t.qaStatus === "passed");

  const visibleTasks = useMemo(() => {
    const time = (t) => new Date(t.createdAt || t.startDate || 0).getTime();
    const pending = tasks.filter((t) => !isMyTaskDone(t)).sort((a, b) => time(b) - time(a));
    const done = tasks.filter((t) => isMyTaskDone(t)).sort((a, b) => time(b) - time(a));
    if (filter === "pending") return pending;
    if (filter === "completed") return done;
    return [...pending, ...done]; // pending on top, latest first
  }, [tasks, filter]);

  const pendingCount = tasks.filter((t) => !isMyTaskDone(t)).length;

  const statusBadge = (task) => {
    if (isMyTaskDone(task)) return <span className="badge bg-success">Completed</span>;
    if (task.qaStatus === "pending_test" || task.qaStatus === "testing") return <span className="badge bg-info text-dark">With Tester</span>;
    if (task.qaStatus === "bug_found") return <span className="badge bg-danger">Bug Found</span>;
    if (task.taskStatus === "stuck") return <span className="badge bg-danger">Stuck</span>;
    if ((Number(task.taskLevel) || 0) > 0) return <span className="badge bg-primary">In Process</span>;
    return <span className="badge bg-warning text-dark">Pending</span>;
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-xl modal_table_width">
          <div className="modal-content p-3">
            <form>
              <div className="modal-header pt-0 d-flex align-items-center flex-wrap gap-2">
                <h5 className="card-title fw-bold mb-0" id="exampleModalLongTitle">
                  Task List <small className="text-muted">({pendingCount} pending)</small>
                </h5>

                <button
                  type="button"
                  className="btn btn-sm btn-success d-inline-flex align-items-center ms-3"
                  onClick={handleExportExcel}
                  disabled={exporting}
                  title="Download Excel: sub-tasks you gave your juniors + your own tasks"
                  style={{ borderRadius: "6px", fontWeight: 600 }}
                >
                  {exporting ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Exporting...</>
                  ) : (
                    <><i className="fa-solid fa-file-excel me-2"></i>Export Excel</>
                  )}
                </button>

                <select
                  className="form-select form-select-sm ms-2"
                  style={{ width: "140px" }}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Tasks</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>

                <button onClick={() => handleViewTask()} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body">
                <div className="row bg-white p-2 m-1 border rounded modal_body_height" style={{ maxWidth: "70vw" }}>
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            <th>Task No.</th>
                            <th>Task Name</th>
                            <th>Subtask Name</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Remarks</th>
                            <th style={{ minWidth: "120px" }}>My Progress</th>
                            <th>Status</th>
                            <th className="text-center" style={{ minWidth: "160px" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {visibleTasks.length > 0 ? (
                            visibleTasks.map((task, index) => {
                              const done = isMyTaskDone(task);
                              const lvl = Number(task.taskLevel) || 0;
                              return (
                                <tr
                                  className="border my-4"
                                  key={task._id || task.id}
                                  style={done ? { backgroundColor: "#f0fdf4" } : undefined}
                                >
                                  <td className="w-10">{index + 1}</td>
                                  <td className="text-wrap">{task.taskName?.name}</td>
                                  <td className="text-wrap text-primary fw-bold">{task.subtaskName || "-"}</td>
                                  <td className="w-20">{formatDate(task.startDate)}</td>
                                  <td className="w-20">{formatDate(task.endDate)}</td>
                                  <td className="w-30">{task.remark || "N/A"}</td>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      <div className="progress flex-grow-1" style={{ height: "8px" }}>
                                        <div
                                          className={`progress-bar ${done ? "bg-success" : lvl > 50 ? "bg-primary" : "bg-warning"}`}
                                          role="progressbar"
                                          style={{ width: `${lvl}%` }}
                                        ></div>
                                      </div>
                                      <span className="fw-bold" style={{ fontSize: "12px" }}>{lvl}%</span>
                                    </div>
                                  </td>
                                  <td className="w-20">{statusBadge(task)}</td>

                                  <td className="text-center">
                                    <div className="d-flex align-items-center justify-content-center gap-2">
                                      <span
                                        onClick={() => handleUpdateTask(task)}
                                        className="update_icon"
                                        title={done ? "View History" : "Update Work"}
                                        style={{ cursor: "pointer" }}
                                      >
                                        <i className="fa-solid fa-pen text-success me-1"></i>
                                      </span>

                                      {!done && (
                                        <button
                                          type="button"
                                          className="btn btn-sm px-2 py-1 d-inline-flex align-items-center"
                                          onClick={() => handleOpenSubtaskAssign(task)}
                                          title="Assign Sub-Task to Employee"
                                          style={{
                                            backgroundColor: "#f0fdf4",
                                            border: "1.5px solid #16a34a",
                                            borderRadius: "6px",
                                            color: "#16a34a",
                                            fontWeight: "600",
                                            fontSize: "12px",
                                            gap: "4px",
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "#16a34a";
                                            e.currentTarget.style.color = "#fff";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "#f0fdf4";
                                            e.currentTarget.style.color = "#16a34a";
                                          }}
                                        >
                                          <i className="fa-solid fa-user-plus"></i>
                                          <span>Sub-Task</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="9" className="text-center">
                                {filter === "pending" ? "No pending tasks" : filter === "completed" ? "No completed tasks" : "No tasks assigned"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {updateTaskPopUpShow && (
        <TaskListUpdatedPopUp selectedTask={selectedTask} handleUpdateTask={handleUpdateTask} />
      )}

      {subtaskPopupShow && subtaskParentTask && (
        <SubtaskAssignPopUp
          parentTask={subtaskParentTask}
          onClose={handleCloseSubtask}
          onSuccess={handleSubtaskSuccess}
        />
      )}
    </>
  );
};

export default ViewTaskPopUp;