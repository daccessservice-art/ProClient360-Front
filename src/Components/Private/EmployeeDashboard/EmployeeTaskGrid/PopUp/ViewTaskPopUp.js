/**
 * ViewTaskPopUp.jsx  (UPDATED — Team Lead layer added)
 *
 * Changes vs original:
 *  - Imports SubtaskAssignPopUp
 *  - Each task row now shows an "Assign Sub-Task" button
 *    (Team Lead clicks this to open SubtaskAssignPopUp)
 *  - All original logic, columns, and styling are untouched
 */

import { useState, useEffect } from "react";
import TaskListUpdatedPopUp from "./TaskListUpdatedPopUp";
import SubtaskAssignPopUp from "./SubtaskAssignPopUp";          // ✅ NEW
import { getMyTaskSheet } from "../../../../../hooks/useTaskSheet";
import { formatDate } from "../../../../../utils/formatDate";

const ViewTaskPopUp = ({ handleViewTask, selectedId }) => {
  const [updateTaskPopUpShow, setUpdateTaskPopUpShow] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState({});

  // ✅ NEW — Sub-task assign popup state
  const [subtaskPopupShow, setSubtaskPopupShow] = useState(false);
  const [subtaskParentTask, setSubtaskParentTask] = useState(null);

  const handleUpdateTask = (id) => {
    setSelectedTask(id);
    setUpdateTaskPopUpShow(!updateTaskPopUpShow);
  };

  const fetchTasks = async () => {
    const data = await getMyTaskSheet(selectedId);
    if (data) {
      setTasks(data.task || []);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateTaskPopUpShow]);

  // ✅ NEW — Open sub-task assign popup for a specific parent task
  const handleOpenSubtaskAssign = (task) => {
    setSubtaskParentTask(task);
    setSubtaskPopupShow(true);
  };

  // ✅ NEW — Close sub-task popup
  const handleCloseSubtask = () => {
    setSubtaskPopupShow(false);
    setSubtaskParentTask(null);
  };

  // ✅ NEW — After successfully assigning sub-task, refresh the list
  const handleSubtaskSuccess = () => {
    fetchTasks();
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#00000090",
        }}
      >
        <div className="modal-dialog modal-xl modal_table_width">
          <div className="modal-content p-3">
            <form>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  Task List
                </h5>
                <button
                  onClick={() => handleViewTask()}
                  type="button"
                  className="close px-3"
                  style={{ marginLeft: "auto" }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row bg-white p-2 m-1 border rounded modal_body_height" style={{ maxWidth: '70vw' }}>
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
                            <th>Status</th>
                            {/* ✅ NEW column header */}
                            <th className="text-center" style={{ minWidth: "160px" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {tasks && tasks.length > 0 ? (
                            tasks.map((task, index) => (
                              <tr className="border my-4" key={task._id || task.id}>
                                <td className="w-10">{index + 1}</td>
                                <td className="text-wrap">{task.taskName?.name}</td>
                                <td className="text-wrap text-primary fw-bold">{task.subtaskName || "-"}</td>
                                <td className="w-20">{formatDate(task.startDate)}</td>
                                <td className="w-20">{formatDate(task.endDate)}</td>
                                <td className="w-30">{task.remark || "N/A"}</td>
                                <td className="w-20">{task.taskStatus}</td>

                                {/* ✅ Action column — Edit + Assign Sub-Task */}
                                <td className="text-center">
                                  <div className="d-flex align-items-center justify-content-center gap-2">
                                    {/* Original edit button — untouched */}
                                    <span
                                      onClick={() => handleUpdateTask(task)}
                                      className="update_icon"
                                      title="Update Work"
                                      style={{ cursor: "pointer" }}
                                    >
                                      <i className="fa-solid fa-pen text-success me-1"></i>
                                    </span>

                                    {/* ✅ NEW — Assign Sub-Task button (only if task not 100% complete) */}
                                    {task.taskLevel !== 100 && (
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
                                        onMouseEnter={e => {
                                          e.currentTarget.style.backgroundColor = "#16a34a";
                                          e.currentTarget.style.color = "#fff";
                                        }}
                                        onMouseLeave={e => {
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
                            ))
                          ) : (
                            <tr>
                              <td colSpan="8" className="text-center">
                                No tasks assigned
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

      {/* Original update popup — untouched */}
      {updateTaskPopUpShow && (
        <TaskListUpdatedPopUp
          selectedTask={selectedTask}
          handleUpdateTask={handleUpdateTask}
        />
      )}

      {/* ✅ NEW — Sub-task assign popup */}
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