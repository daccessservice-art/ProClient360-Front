import React, { useEffect, useState, useCallback } from "react";
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import { ViewMode, Gantt } from "gantt-task-react";
import { initTasks } from "../../../Helper/GanttChartHelper";
import "gantt-task-react/dist/index.css";
import { ViewSwitcher } from "../../../Helper/ViewSwitcher";
import Select from "react-select";
import { useParams, useNavigate } from "react-router-dom";
import { getTaskSheet, createTaskSheet, deleteTaskSheet } from "../../../../hooks/useTaskSheet";
import toast from "react-hot-toast";
import { getAllTasksForDropdown } from "../../../../hooks/useTask";
import { getEmployees } from "../../../../hooks/useEmployees";
import AddTaskPopUp from "../TaskMaster/PopUp/AddTaskPopUp";
import { getAllActions } from "../../../../hooks/useAction";
import { formatDateforEditAction, formatDateTimeForDisplay } from "../../../../utils/formatDate";
import { RequiredStar } from "../../RequiredStar/RequiredStar";
import axios from "axios";

const PAGE_SIZE = 10;

// ── Local date formatter: "11 Feb 2026" ──
const formatTaskDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const TaskSheetMaster = () => {
  const navigate = useNavigate();

  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { id } = useParams();

  const [view, setView] = React.useState(ViewMode.Day);
  const [tasks, setTasks] = React.useState(initTasks());
  const [isChecked, setIsChecked] = React.useState(true);

  const [taskName, setTaskName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [remark, setRemark] = useState("");
  const [priority, setPriority] = useState("medium");
  const [taskDropDown, setTaskDropDown] = useState([]);

  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeHasMore, setEmployeeHasMore] = useState(true);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [projectName, setProjectName] = useState("");
  const [renderPage, setRenderPage] = useState(false);
  const [taskAddPopUpShow, setTaskAddPopUpShow] = useState(false);
  const [forTask, setForTask] = useState();
  const [showAction, setShowAction] = useState(false);

  const [showRemarkPopup, setShowRemarkPopup] = useState(false);
  const [selectedRemark, setSelectedRemark] = useState("");
  const [selectedTaskName, setSelectedTaskName] = useState("");

  const [employeeTaskAssignments, setEmployeeTaskAssignments] = useState([]);
  const [selectedRowId, setSelectedRowId] = useState(null);

  // ── Send completion notification email to assignedBy when task hits 100% ──
  // Called from: forActionShow → after loading actions, check if task is complete
  const sendCompletionNotification = useCallback(async (taskId, assignedById, employeeId, taskNameStr) => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL;
      await axios.post(
        `${baseUrl}/api/tasksheet/notify-completion`,
        { taskId, assignedById, employeeId, taskName: taskNameStr },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      console.log("Completion notification sent for task:", taskId);
    } catch (err) {
      // Non-blocking — don't show error toast for notification failure
      console.error("Completion notification failed:", err);
    }
  }, []);

  const loadEmployees = useCallback(async (page = 1, search = "") => {
    setEmployeeLoading(true);
    try {
      const data = await getEmployees(page, PAGE_SIZE, search);
      if (data && data.employees) {
        const newOpts = data.employees.map(emp => ({ value: emp._id, label: emp.name }));
        setEmployeeOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
        setEmployeeHasMore(newOpts.length === PAGE_SIZE);
      }
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setEmployeeLoading(false);
    }
  }, []);

  useEffect(() => {
    setEmployeePage(1);
    setEmployeeHasMore(true);
    setEmployeeOptions([]);
    loadEmployees(1, employeeSearch);
  }, [employeeSearch, loadEmployees]);

  let columnWidth = 90;
  if (view === ViewMode.Month) columnWidth = 300;
  else if (view === ViewMode.Week) columnWidth = 250;

  const handleAdd = async (event) => {
    event.preventDefault();
    await handleTaskAdd();
  };

  const handleTaskSelection = (value) => {
    if (value === "AddNewTask") {
      setTaskAddPopUpShow(!taskAddPopUpShow);
    } else {
      setTaskName(value);
    }
  };

  const handleTaskCancel = () => setTaskAddPopUpShow(!taskAddPopUpShow);

  // ── Opens Action Modal Popup ──
  // Also triggers completion email if taskLevel === 100
  const forActionShow = useCallback(async (taskId, rowId) => {
    try {
      setActionLoading(true);
      setSelectedRowId(rowId);
      const data = await getAllActions(taskId);
      setForTask(data?.actions);
      setShowAction(true);

      // ── Check if the task is 100% complete and notify assignedBy ──
      // Find this task in employeeTaskAssignments to get assignedById & employeeName
      let matchedTask = null;
      let matchedEmployee = null;
      for (const assignment of employeeTaskAssignments) {
        for (const t of assignment.tasks) {
          if (t.taskId === taskId) {
            matchedTask = t;
            matchedEmployee = assignment;
            break;
          }
        }
        if (matchedTask) break;
      }

      if (matchedTask && matchedTask.taskLevel === 100 && matchedTask.assignedById) {
        await sendCompletionNotification(
          taskId,
          matchedTask.assignedById,
          matchedEmployee.employeeId,
          matchedTask.taskName
        );
      }
    } catch {
      toast.error("Failed to load actions");
    } finally {
      setActionLoading(false);
    }
  }, [employeeTaskAssignments, sendCompletionNotification]);

  const handleCloseAction = () => {
    setShowAction(false);
    setSelectedRowId(null);
  };

  const handleViewRemark = (remark, taskName) => {
    setSelectedRemark(remark || "No remark provided");
    setSelectedTaskName(taskName);
    setShowRemarkPopup(true);
  };

  const handleTaskDelete = (task) => {
    confirmAlert({
      title: 'Confirm to Delete',
      message: `Are you sure to delete ${task.name}?`,
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            try {
              setLoading(true);
              const data = await deleteTaskSheet(task.id);
              setTasks(tasks.filter((t) => t.id !== task.id));
              if (data?.success) {
                toast.success(data?.message || "Task deleted successfully");
              } else {
                toast.error(data?.error || "Failed to delete task");
              }
            } catch {
              toast.error("Error deleting task");
            } finally {
              setLoading(false);
            }
          }
        },
        { label: 'No', onClick: () => {} }
      ]
    });
  };

  const handleProgressChange = async (task) => {
    setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
  };

  const handleDblClick = (task) => {
    if (task.type === 'task') forActionShow(task.id, null);
  };

  const handleSelect = () => {};

  const handleExpanderClick = (task) => {
    setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getTaskSheet(id);

        setProjectName(response.task[0].project);

        const transformedTasks = transformProjectToTasks(response);
        setTasks(transformedTasks);

        const taskSheets = response.task || [];
        const assignments = [];
        const employeeIds = new Set();

        taskSheets.forEach(task => {
          if (task.employees && Array.isArray(task.employees)) {
            task.employees.forEach(emp => {
              const empId = typeof emp === 'object' ? emp._id : emp;
              if (empId) employeeIds.add(empId);
            });
          }
        });

        if (employeeIds.size > 0) {
          try {
            const employeesData = await getEmployees(1, 1000, "");
            const employeeMap = {};
            employeesData.employees.forEach(emp => {
              employeeMap[emp._id] = emp;
            });

            taskSheets.forEach(task => {
              if (task.employees && Array.isArray(task.employees)) {
                task.employees.forEach(emp => {
                  const empId = typeof emp === 'object' ? emp._id : emp;
                  if (empId && employeeMap[empId]) {
                    assignments.push({
                      employeeId: empId,
                      employeeName: employeeMap[empId].name,
                      taskId: task._id,
                      taskName: task.taskName?.name || 'Unknown Task',
                      startDate: task.startDate,
                      endDate: task.endDate,
                      priority: task.priority || 'medium',
                      assignedBy: task.assignedBy?.name || 'Not Assigned',
                      assignedById: task.assignedBy?._id || null,
                      remark: task.remark || '',
                      taskLevel: task.taskLevel || 0,
                    });
                  }
                });
              }
            });

            const groupedAssignments = {};
            assignments.forEach(assignment => {
              if (!groupedAssignments[assignment.employeeId]) {
                groupedAssignments[assignment.employeeId] = {
                  employeeId: assignment.employeeId,
                  employeeName: assignment.employeeName,
                  tasks: []
                };
              }
              groupedAssignments[assignment.employeeId].tasks.push({
                taskId: assignment.taskId,
                taskName: assignment.taskName,
                startDate: assignment.startDate,
                endDate: assignment.endDate,
                priority: assignment.priority,
                assignedBy: assignment.assignedBy,
                assignedById: assignment.assignedById,
                remark: assignment.remark,
                taskLevel: assignment.taskLevel,
              });
            });

            const sortedAssignments = Object.values(groupedAssignments).sort((a, b) =>
              a.employeeName.localeCompare(b.employeeName)
            );

            setEmployeeTaskAssignments(sortedAssignments);
          } catch (error) {
            console.error("Error fetching employee details:", error);
            toast.error("Failed to fetch employee details");
          }
        } else {
          setEmployeeTaskAssignments([]);
        }
      } catch (error) {
        console.error("Error fetching projects: ", error);
        toast.error("Error fetching project data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, renderPage]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getAllTasksForDropdown();
        if (data) setTaskDropDown(data.task || []);
      } catch {
        toast.error("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [taskAddPopUpShow]);

  const transformProjectToTasks = (projectData) => {
    const project = projectData.task[0].project;
    const projectTask = {
      id: project._id,
      name: project.name,
      start: new Date(project.startDate),
      end: new Date(project.endDate),
      progress: project.completeLevel || 0,
      type: "project",
      hideChildren: false,
    };
    const taskList = projectData.task.map((task) => ({
      id: task._id,
      name: task.taskName?.name || 'Unknown Task',
      start: new Date(task.startDate),
      end: new Date(task.endDate),
      project: project._id,
      type: "task",
      progress: task.taskLevel || 0,
      priority: task.priority || 'medium',
    }));
    return [projectTask, ...taskList];
  };

  const handleTaskAdd = async () => {
    if (submitting) return;

    const employeeIds = selectedEmployees.map(emp => emp.value);
    const data = { project: id, employees: employeeIds, taskName, startDate, endDate, remark, priority };

    if (!selectedEmployees.length || !taskName || !startDate || !endDate) {
      return toast.error("Please fill all required fields");
    }
    if (remark.length > 2000) return toast.error("Remark cannot exceed 2000 characters");
    // ✅ REMOVED: back-date restriction — allow past dates for start/end
    if (new Date(endDate) < new Date(startDate)) return toast.error("End date cannot be before start date");

    try {
      setSubmitting(true);
      const result = await createTaskSheet(data);
      if (result?.success) {
        toast.success("Task assigned successfully");
        setRenderPage(!renderPage);
        clearForm();
      } else {
        toast.error(result?.error || "Failed to assign task");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Error assigning task");
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setTaskName("");
    setStartDate("");
    setEndDate("");
    setRemark("");
    setSelectedEmployees([]);
    setPriority("medium");
  };

  useEffect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) setEndDate("");
  }, [startDate, endDate]);

  return (
    <>
      {loading && (
        <div className="overlay">
          <span className="loader"></span>
        </div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <form onSubmit={handleAdd}>
            <Header toggle={toggle} isopen={isopen} />
            <div className="container-fluid page-body-wrapper">
              <Sidebar isopen={isopen} active="TaskSheetMaster" id={id} />

              <div
                className="main-panel"
                style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}
              >
                <div className="content-wrapper ps-3 ps-md-0 pt-3">

                  <div className="col-12 col-lg-12 mx-auto mb-4 mb-lg-0 pt-4">
                    <button className="btn btn-outline-light d-flex align-items-center" onClick={() => navigate('/ProjectMasterGrid')}>
                      <i className="fa-solid text-light fa-angle-left me-2"></i> Back
                    </button>
                  </div>

                  <div className="row px-2 py-1">
                    <div className="col-12 col-lg-6">
                      <h5 className="text-white py-2">
                        <span className="fw-light">Project Name : </span>
                        {projectName && projectName.name + " - " + projectName?.custId?.custName}
                      </h5>
                    </div>
                  </div>

                  {/* ── Employee Task Assignments Table ── */}
                  <div className="row bg-white p-2 m-1 border rounded">
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label label_text fw-bold">
                          Employee Task Assignments
                        </label>
                        {employeeTaskAssignments.length > 0 ? (
                          <div className="table-responsive">
                            <table className="table table-bordered">
                              <thead className="thead-light">
                                <tr>
                                  <th>Assigned By</th>
                                  <th>Assign To</th>
                                  <th>Priority</th>
                                  <th>Task Name</th>
                                  <th>Start Date</th>
                                  <th>End Date</th>
                                  <th className="text-center">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {employeeTaskAssignments.flatMap((assignment) =>
                                  assignment.tasks.map((task, index) => {
                                    const rowId = `${assignment.employeeId}-${task.taskId}-${index}`;
                                    const isSelected = selectedRowId === rowId;
                                    const isCompleted = task.taskLevel === 100;

                                    let rowBg = "transparent";
                                    if (isCompleted) rowBg = "#d4edda";
                                    else if (isSelected) rowBg = "#e7f1ff";

                                    return (
                                      <tr
                                        key={rowId}
                                        style={{
                                          backgroundColor: rowBg,
                                          borderLeft: isSelected
                                            ? "4px solid #0d6efd"
                                            : isCompleted
                                            ? "4px solid #28a745"
                                            : "none",
                                          transition: "all 0.3s ease",
                                        }}
                                      >
                                        <td className="align-middle">
                                          <span className="fw-bold">{task.assignedBy}</span>
                                        </td>
                                        <td className="align-middle">
                                          <strong>{assignment.employeeName}</strong>
                                        </td>
                                        <td className="align-middle text-center">
                                          <span className={`badge ${
                                            task.priority === 'high' ? 'bg-danger' :
                                            task.priority === 'medium' ? 'bg-warning' :
                                            'bg-info'
                                          }`}>
                                            {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                                          </span>
                                        </td>
                                        <td className="align-middle text-start">
                                          <span className="d-flex align-items-center gap-1">
                                            {task.taskName}
                                            {isCompleted && (
                                              <span className="badge bg-success ms-1" style={{ fontSize: "0.65rem" }}>
                                                ✓ Done
                                              </span>
                                            )}
                                            {task.remark && (
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-link p-0 ms-1"
                                                onClick={() => handleViewRemark(task.remark, task.taskName)}
                                                title="View Remark"
                                              >
                                                <i className="fa-solid fa-eye text-primary"></i>
                                              </button>
                                            )}
                                          </span>
                                        </td>
                                        <td className="align-middle">{formatTaskDate(task.startDate)}</td>
                                        <td className="align-middle">{formatTaskDate(task.endDate)}</td>
                                        <td className="align-middle text-center">
                                          <button
                                            type="button"
                                            className="btn btn-sm px-3 py-1 d-inline-flex align-items-center justify-content-center"
                                            onClick={() => forActionShow(task.taskId, rowId)}
                                            title="View Actions"
                                            style={{
                                              backgroundColor: isSelected ? "#0d6efd" : "#e7f1ff",
                                              border: "2px solid #0d6efd",
                                              borderRadius: "6px",
                                              color: isSelected ? "#ffffff" : "#0d6efd",
                                              fontWeight: "600",
                                              fontSize: "13px",
                                              transition: "all 0.3s ease",
                                              cursor: "pointer",
                                            }}
                                            onMouseEnter={(e) => {
                                              if (!isSelected) {
                                                e.currentTarget.style.backgroundColor = "#0d6efd";
                                                e.currentTarget.style.color = "#ffffff";
                                                e.currentTarget.style.transform = "scale(1.05)";
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              if (!isSelected) {
                                                e.currentTarget.style.backgroundColor = "#e7f1ff";
                                                e.currentTarget.style.color = "#0d6efd";
                                                e.currentTarget.style.transform = "scale(1)";
                                              }
                                            }}
                                          >
                                            <i className="fa-solid fa-list-check me-1"></i>
                                            View
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="alert alert-info">No employees assigned to tasks yet</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Task Assignment Form ── */}
                  <div className="row bg-white p-2 m-1 border rounded">

                    <div className="col-12 col-md-6 col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="taskName" className="form-label label_text">Task Name <RequiredStar /></label>
                        <select
                          className="form-select rounded-0"
                          onChange={(e) => handleTaskSelection(e.target.value)}
                          value={taskName}
                          required
                          disabled={submitting}
                        >
                          <option value="">-- Select Task Name --</option>
                          {taskDropDown && taskDropDown.map((task) => (
                            <option key={task._id} value={task._id}>{task.name}</option>
                          ))}
                          <option value="AddNewTask">-- Add New Task --</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="priority" className="form-label label_text">Priority <RequiredStar /></label>
                        <select
                          className="form-select rounded-0"
                          id="priority"
                          onChange={(e) => setPriority(e.target.value)}
                          value={priority}
                          required
                          disabled={submitting}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="startDate" className="form-label label_text">Start Date <RequiredStar /></label>
                        {/* ✅ REMOVED min={today} — back dates are now allowed */}
                        <input
                          type="date"
                          className="form-control rounded-0"
                          id="startDate"
                          onChange={(e) => setStartDate(e.target.value)}
                          value={startDate}
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="endDate" className="form-label label_text">End Date <RequiredStar /></label>
                        {/* ✅ REMOVED min={startDate || today} — back dates are now allowed */}
                        <input
                          type="date"
                          className="form-control rounded-0"
                          id="endDate"
                          onChange={(e) => setEndDate(e.target.value)}
                          value={endDate}
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="employeeSelect" className="form-label label_text">Employee Name <RequiredStar /></label>
                        <Select
                          id="employeeSelect"
                          options={employeeOptions}
                          value={selectedEmployees}
                          isMulti
                          onChange={opts => setSelectedEmployees(opts || [])}
                          onInputChange={val => { setEmployeeSearch(val); setEmployeePage(1); }}
                          onMenuScrollToBottom={() => {
                            if (employeeHasMore) {
                              const nextPage = employeePage + 1;
                              setEmployeePage(nextPage);
                              loadEmployees(nextPage, employeeSearch);
                            }
                          }}
                          placeholder="Search and select employees..."
                          isClearable
                          isLoading={employeeLoading}
                          isDisabled={submitting}
                          styles={{
                            control: (provided) => ({ ...provided, borderRadius: 0, borderColor: '#ced4da', fontSize: '16px' }),
                            option: (provided, state) => ({
                              ...provided,
                              backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#f8f9fa' : 'white',
                              color: state.isSelected ? 'white' : '#212529',
                            }),
                          }}
                          noOptionsMessage={() => employeeLoading ? 'Loading...' : 'No employees'}
                          closeMenuOnSelect={false}
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-12 col-lg-12">
                      <div className="mb-3">
                        <label htmlFor="remark" className="form-label label_text">
                          Remark / Description <span className="text-muted">({remark.length}/2000)</span>
                        </label>
                        <textarea
                          onChange={(e) => setRemark(e.target.value)}
                          value={remark}
                          className="textarea_edit col-12"
                          placeholder=""
                          rows="3"
                          style={{ minHeight: "170px", resize: "vertical" }}
                          disabled={submitting}
                          maxLength={2000}
                        ></textarea>
                        {remark.length > 1800 && (
                          <div className="text-danger small">Warning: Approaching character limit</div>
                        )}
                      </div>
                    </div>

                    <div className="col-12 col-lg-3 pt-3 mt-3">
                      <button type="submit" className="btn adbtn btn-success px-4 me-lg-4 mx-auto" disabled={submitting}>
                        {submitting ? (
                          <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Assigning...</>
                        ) : (
                          <><i className="fa-solid fa-plus"></i> Add</>
                        )}
                      </button>
                      <button onClick={clearForm} type="button" className="btn adbtn btn-danger px-4 mx-auto" disabled={submitting}>
                        <i className="fa-solid fa-xmark"></i> Clear
                      </button>
                    </div>

                    <div className="col-12 py-2 div_scroll">
                      <ViewSwitcher
                        onViewModeChange={(viewMode) => setView(viewMode)}
                        onViewListChange={setIsChecked}
                        isChecked={isChecked}
                      />
                      <Gantt
                        tasks={tasks}
                        viewMode={view}
                        onDelete={handleTaskDelete}
                        onProgressChange={handleProgressChange}
                        onDoubleClick={handleDblClick}
                        onSelect={handleSelect}
                        onExpanderClick={handleExpanderClick}
                        listCellWidth={isChecked ? "155px" : ""}
                        columnWidth={columnWidth}
                        barBackgroundColor="blue"
                        rowHeight={40}
                        fontSize={12}
                      />
                      {taskAddPopUpShow && (
                        <AddTaskPopUp handleAdd={handleTaskSelection} cancelBtnCallBack={handleTaskCancel} />
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Action Modal Popup ── */}
      {showAction && (
        <div
          className="modal fade show"
          style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ maxWidth: "800px", width: "95%" }}>
            <div className="modal-content">
              <div className="modal-header" style={{ background: "linear-gradient(135deg, #f8fafc, #f1f5f9)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                <h6 className="modal-title fw-bold" style={{ color: "#1e293b" }}>
                  <i className="fa-solid fa-list-check me-2 text-primary"></i>Task Actions
                </h6>
                <button type="button" className="btn-close" onClick={handleCloseAction}></button>
              </div>

              <div className="modal-body p-0">
                {actionLoading ? (
                  <div className="d-flex justify-content-center align-items-center p-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-items-center table-flush mb-0">
                      <thead className="thead-light">
                        <tr>
                          <th className="text-center">Action</th>
                          <th className="text-center">Action By</th>
                          <th className="text-center">Start Time</th>
                          <th className="text-center">End Time</th>
                          <th className="text-center">Completion</th>
                        </tr>
                      </thead>
                      {forTask && forTask.length !== 0 ? (
                        <tbody>
                          {forTask.map((action) => (
                            <tr className="text-center" key={action._id}>
                              <td>{action.action}</td>
                              <td>{action.actionBy?.name}</td>
                              <td>{formatDateTimeForDisplay(action.startTime)}</td>
                              <td>{formatDateTimeForDisplay(action.endTime)}</td>
                              <td>
                                <div className="d-flex align-items-center justify-content-center gap-2">
                                  <span className="fw-bold" style={{ minWidth: 36 }}>{action.complated}%</span>
                                  <div className="progress" style={{ width: "80px", height: "8px" }}>
                                    <div
                                      className={`progress-bar ${action.complated === 100 ? "bg-success" : "bg-warning"}`}
                                      role="progressbar"
                                      aria-valuenow={action.complated}
                                      aria-valuemin="0"
                                      aria-valuemax="100"
                                      style={{ width: `${action.complated}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      ) : (
                        <tbody>
                          <tr>
                            <td colSpan="5">
                              <h6 className="text-center text-muted py-4">No Action performed yet...</h6>
                            </td>
                          </tr>
                        </tbody>
                      )}
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseAction}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Remark Modal ── */}
      {showRemarkPopup && (
        <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1060 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Task Remark</h5>
                <button type="button" className="btn-close" onClick={() => setShowRemarkPopup(false)}></button>
              </div>
              <div className="modal-body">
                <h6 className="fw-bold mb-3">Task: {selectedTaskName}</h6>
                <div className="border rounded p-3 bg-light">
                  <p>{selectedRemark}</p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRemarkPopup(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};