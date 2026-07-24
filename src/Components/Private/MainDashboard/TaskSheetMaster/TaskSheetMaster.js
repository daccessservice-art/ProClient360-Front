/**
 * TaskSheetMaster.jsx  (UPDATED — Manager sub-task tree view + Tester/QA workflow)
 *
 * Changes vs previous version:
 *  - Manager can assign a Tester alongside employees when creating a task
 *  - Assignment table shows a Tester column + QA Status badge with bug-report access
 *  - Everything else (sub-task tree, Gantt, original handlers) is untouched
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import {
  getTaskSheet,
  createTaskSheet,
  deleteTaskSheet,
  getSubTasksForParent,
} from "../../../../hooks/useTaskSheet";
import toast from "react-hot-toast";
import { getAllTasksForDropdown } from "../../../../hooks/useTask";
import { getEmployees } from "../../../../hooks/useEmployees";
import AddTaskPopUp from "../TaskMaster/PopUp/AddTaskPopUp";
import { getAllActions } from "../../../../hooks/useAction";
import { formatDateforEditAction, formatDateTimeForDisplay } from "../../../../utils/formatDate";
import { RequiredStar } from "../../RequiredStar/RequiredStar";
import axios from "axios";

const PAGE_SIZE = 10;

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

  const [selectedTasks, setSelectedTasks] = useState([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskDropDown, setTaskDropDown] = useState([]);

  const [subtaskName, setSubtaskName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [remark, setRemark] = useState("");
  const [priority, setPriority] = useState("medium");

  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeHasMore, setEmployeeHasMore] = useState(true);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // ✅ NEW — Optional Tester assigned alongside the developer(s)
  const [selectedTester, setSelectedTester] = useState(null);

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
  const [deletingTaskIds, setDeletingTaskIds] = useState(new Set());

  // ✅ Map of parentTaskId → array of sub-task rows for Manager's view
  const [subTaskMap, setSubTaskMap] = useState({});
  // Track which parent rows are expanded to show sub-tasks
  const [expandedParents, setExpandedParents] = useState(new Set());

  const filteredTaskOptions = useMemo(() => {
    if (!taskDropDown || taskDropDown.length === 0) return [];
    const searchLower = taskSearch.toLowerCase().trim();
    return taskDropDown
      .filter(t => !searchLower || t.name.toLowerCase().includes(searchLower))
      .map(t => ({ value: t._id, label: t.name }));
  }, [taskDropDown, taskSearch]);

  const sendCompletionNotification = useCallback(async (taskId, assignedById, employeeId, taskNameStr) => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL;
      await axios.post(
        `${baseUrl}/api/tasksheet/notify-completion`,
        { taskId, assignedById, employeeId, taskName: taskNameStr },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
    } catch (err) {
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
    if (value && value !== "AddNewTask") {
      const exists = selectedTasks.find(t => t.value === value);
      if (!exists) {
        const newTask = taskDropDown.find(t => t._id === value);
        if (newTask) {
          setSelectedTasks(prev => [...prev, { value: newTask._id, label: newTask.name }]);
        }
      }
    }
    setTaskAddPopUpShow(false);
  };

  const handleTaskCancel = () => setTaskAddPopUpShow(false);

  const forActionShow = useCallback(async (taskId, rowId) => {
    try {
      setActionLoading(true);
      setSelectedRowId(rowId);
      const data = await getAllActions(taskId);
      setForTask(data?.actions);
      setShowAction(true);

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
        await sendCompletionNotification(taskId, matchedTask.assignedById, matchedEmployee.employeeId, matchedTask.taskName);
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
      message: `Are you sure to delete "${task.name}"? This task will be removed for all assigned employees.`,
      buttons: [
        {
          label: 'Yes, Delete',
          onClick: async () => {
            try {
              setDeletingTaskIds(prev => new Set(prev).add(task.id));
              const data = await deleteTaskSheet(task.id);
              if (data?.success) {
                toast.success(data?.message || "Task deleted successfully");
                setTasks(prev => prev.filter((t) => t.id !== task.id));
                setEmployeeTaskAssignments(prev =>
                  prev.map(assignment => ({
                    ...assignment,
                    tasks: assignment.tasks.filter(t => t.taskId !== task.id)
                  })).filter(assignment => assignment.tasks.length > 0)
                );
              } else {
                toast.error(data?.error || "Failed to delete task");
              }
            } catch {
              toast.error("Error deleting task");
            } finally {
              setDeletingTaskIds(prev => {
                const next = new Set(prev);
                next.delete(task.id);
                return next;
              });
            }
          }
        },
        { label: 'Cancel', onClick: () => {} }
      ]
    });
  };

  const handleEmployeeTaskDelete = (taskId, taskNameStr) => {
    confirmAlert({
      title: 'Delete Task Assignment',
      message: `Are you sure you want to delete "${taskNameStr}"?\n\nThis will permanently remove the task for ALL assigned employees on this page.`,
      buttons: [
        {
          label: 'Yes, Delete',
          onClick: async () => {
            try {
              setDeletingTaskIds(prev => new Set(prev).add(taskId));
              const data = await deleteTaskSheet(taskId);
              if (data?.success) {
                toast.success(data?.message || "Task deleted successfully");
                setTasks(prev => prev.filter((t) => t.id !== taskId));
                setEmployeeTaskAssignments(prev =>
                  prev.map(assignment => ({
                    ...assignment,
                    tasks: assignment.tasks.filter(t => t.taskId !== taskId)
                  })).filter(assignment => assignment.tasks.length > 0)
                );
                // Also remove from subTaskMap if it was a parent
                setSubTaskMap(prev => {
                  const next = { ...prev };
                  delete next[taskId];
                  return next;
                });
              } else {
                toast.error(data?.error || "Failed to delete task");
              }
            } catch (error) {
              console.error("Error deleting task:", error);
              toast.error("Error deleting task");
            } finally {
              setDeletingTaskIds(prev => {
                const next = new Set(prev);
                next.delete(taskId);
                return next;
              });
            }
          }
        },
        { label: 'Cancel', onClick: () => {} }
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

  // ✅ Toggle expand/collapse sub-tasks for a parent row
  const handleToggleSubTasks = async (taskId) => {
    if (expandedParents.has(taskId)) {
      // Collapse
      setExpandedParents(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    } else {
      // Expand — fetch if not yet loaded
      if (!subTaskMap[taskId]) {
        try {
          const result = await getSubTasksForParent(taskId);
          if (result?.success) {
            // Build sub-task rows in the same shape as main task rows
            const rows = [];
            (result.subTasks || []).forEach(st => {
              if (st.employees && Array.isArray(st.employees)) {
                st.employees.forEach(emp => {
                  rows.push({
                    taskId: st._id,
                    taskName: st.taskName?.name || 'Unknown Task',
                    subtaskName: st.subtaskName || "",
                    startDate: st.startDate,
                    endDate: st.endDate,
                    priority: st.priority || 'medium',
                    assignedBy: st.assignedBy?.name || 'Team Lead',
                    assignedById: st.assignedBy?._id || null,
                    remark: st.remark || '',
                    taskLevel: st.taskLevel || 0,
                    employeeName: typeof emp === 'object' ? emp.name : emp,
                    employeeId: typeof emp === 'object' ? emp._id : emp,
                    isSubTask: true,
                  });
                });
              }
            });
            setSubTaskMap(prev => ({ ...prev, [taskId]: rows }));
          }
        } catch {
          toast.error("Failed to load sub-tasks");
        }
      }
      setExpandedParents(prev => new Set(prev).add(taskId));
    }
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
              // ✅ Only show manager-assigned tasks in the top-level table
              // Sub-tasks (assignedByRole: 'teamlead') are shown as expandable children
              if (task.assignedByRole === 'teamlead') return;

              if (task.employees && Array.isArray(task.employees)) {
                task.employees.forEach(emp => {
                  const empId = typeof emp === 'object' ? emp._id : emp;
                  if (empId && employeeMap[empId]) {
                    assignments.push({
                      employeeId: empId,
                      employeeName: employeeMap[empId].name,
                      taskId: task._id,
                      taskName: task.taskName?.name || 'Unknown Task',
                      subtaskName: task.subtaskName || "",
                      startDate: task.startDate,
                      endDate: task.endDate,
                      priority: task.priority || 'medium',
                      assignedBy: task.assignedBy?.name || 'Not Assigned',
                      assignedById: task.assignedBy?._id || null,
                      remark: task.remark || '',
                      taskLevel: task.taskLevel || 0,
                      // ✅ NEW — QA / Tester workflow fields
                      assignedTesterName: task.assignedTester?.name || null,
                      qaStatus: task.qaStatus || 'none',
                      bugHistory: task.bugHistory || [],
                      testCycles: task.testCycles || 0,
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
                subtaskName: assignment.subtaskName,
                startDate: assignment.startDate,
                endDate: assignment.endDate,
                priority: assignment.priority,
                assignedBy: assignment.assignedBy,
                assignedById: assignment.assignedById,
                remark: assignment.remark,
                taskLevel: assignment.taskLevel,
                // ✅ NEW — carry QA/Tester fields into the grouped table rows
                assignedTesterName: assignment.assignedTesterName,
                qaStatus: assignment.qaStatus,
                bugHistory: assignment.bugHistory,
                testCycles: assignment.testCycles,
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
    const taskList = projectData.task
      .filter(task => !task.parentTaskId) // Only top-level tasks on Gantt
      .map((task) => ({
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
    const taskIds = selectedTasks.map(t => t.value);

    if (taskIds.length === 0) return toast.error("Please select at least one task");
    if (!selectedEmployees.length) return toast.error("Please select at least one employee");
    if (!startDate || !endDate) return toast.error("Please select start date and end date");
    if (new Date(endDate) < new Date(startDate)) return toast.error("End date cannot be before start date");
    if (remark.length > 2000) return toast.error("Remark cannot exceed 2000 characters");

    try {
      setSubmitting(true);

      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const taskId of taskIds) {
        const data = {
          project: id,
          employees: employeeIds,
          taskName: taskId,
          subtaskName,
          startDate,
          endDate,
          remark,
          priority,
          // ✅ NEW — Optional tester for the QA workflow
          assignedTester: selectedTester?.value || undefined,
        };

        try {
          const result = await createTaskSheet(data);
          if (result?.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(result?.error || "Unknown error");
          }
        } catch (err) {
          failCount++;
          errors.push(err?.message || "Request failed");
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} task(s) assigned successfully`);
        setRenderPage(prev => !prev);
        clearForm();
      }

      if (failCount > 0) {
        const uniqueErrors = [...new Set(errors)];
        toast.error(`${failCount} task(s) failed: ${uniqueErrors.join(', ')}`);
      }
    } catch (error) {
      console.error("Error creating tasks:", error);
      toast.error("Error assigning tasks");
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setSelectedTasks([]);
    setTaskSearch("");
    setSubtaskName("");
    setStartDate("");
    setEndDate("");
    setRemark("");
    setSelectedEmployees([]);
    setPriority("medium");
    setSelectedTester(null); // ✅ NEW
  };

  useEffect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) setEndDate("");
  }, [startDate, endDate]);

  const selectStyles = {
    control: (provided) => ({
      ...provided,
      borderRadius: 0,
      borderColor: '#ced4da',
      fontSize: '16px',
      minHeight: '38px',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#e9ecef' : 'white',
      color: state.isSelected ? 'white' : '#212529',
      padding: '8px 12px',
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#e7f1ff',
      border: '1px solid #b6d4fe',
      borderRadius: '4px',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#0d6efd',
      fontWeight: '500',
      fontSize: '14px',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#0d6efd',
      ':hover': { backgroundColor: '#0d6efd', color: 'white' },
    }),
    placeholder: (provided) => ({ ...provided, color: '#6c757d' }),
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

                        {/* ✅ Legend for sub-task rows */}
                        <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
                          <span className="d-flex align-items-center gap-1" style={{ fontSize: "12px" }}>
                            <span style={{ width: "14px", height: "14px", background: "#e7f1ff", border: "2px solid #0d6efd", display: "inline-block", borderRadius: "2px" }}></span>
                            Manager-assigned Task
                          </span>
                          <span className="d-flex align-items-center gap-1" style={{ fontSize: "12px" }}>
                            <span style={{ width: "14px", height: "14px", background: "#f0fdf4", border: "2px solid #16a34a", display: "inline-block", borderRadius: "2px" }}></span>
                            Team Lead Sub-Task
                          </span>
                          {/* ✅ NEW — QA legend */}
                          <span className="d-flex align-items-center gap-1" style={{ fontSize: "12px" }}>
                            <span style={{ width: "14px", height: "14px", background: "#f0f9ff", border: "2px solid #0dcaf0", display: "inline-block", borderRadius: "2px" }}></span>
                            With Tester
                          </span>
                          <span className="d-flex align-items-center gap-1" style={{ fontSize: "12px" }}>
                            <span style={{ width: "14px", height: "14px", background: "#fff5f5", border: "2px solid #dc3545", display: "inline-block", borderRadius: "2px" }}></span>
                            Bug Found — Back with Developer
                          </span>
                        </div>

                        {employeeTaskAssignments.length > 0 ? (
                          <div className="table-responsive">
                            <table className="table table-bordered">
                              <thead className="thead-light">
                                <tr>
                                  <th>Assigned By</th>
                                  <th>Assign To</th>
                                  <th>Priority</th>
                                  <th>Task Name</th>
                                  <th>Subtask Name</th>
                                  <th>Start Date</th>
                                  <th>End Date</th>
                                  {/* ✅ NEW columns */}
                                  <th className="text-center">Tester</th>
                                  <th className="text-center">QA Status</th>
                                  <th className="text-center" style={{ minWidth: "180px" }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {employeeTaskAssignments.flatMap((assignment) =>
                                  assignment.tasks.flatMap((task, index) => {
                                    const rowId = `${assignment.employeeId}-${task.taskId}-${index}`;
                                    const isSelected = selectedRowId === rowId;
                                    // ✅ UPDATED — "completed" now also requires QA to have passed (or no tester assigned)
                                    const isCompleted = task.taskLevel === 100 && (!task.qaStatus || task.qaStatus === 'none' || task.qaStatus === 'passed');
                                    const isPendingTest = task.qaStatus === 'pending_test' || task.qaStatus === 'testing';
                                    const isBugFound = task.qaStatus === 'bug_found';
                                    const isDeleting = deletingTaskIds.has(task.taskId);
                                    const isExpanded = expandedParents.has(task.taskId);
                                    const subRows = subTaskMap[task.taskId] || [];

                                    let rowBg = "transparent";
                                    if (isDeleting) rowBg = "#fff3cd";
                                    else if (isBugFound) rowBg = "#fff5f5";
                                    else if (isPendingTest) rowBg = "#f0f9ff";
                                    else if (isCompleted) rowBg = "#d4edda";
                                    else if (isSelected) rowBg = "#e7f1ff";

                                    // Build the parent row
                                    const parentRow = (
                                      <tr
                                        key={rowId}
                                        style={{
                                          backgroundColor: rowBg,
                                          borderLeft: isDeleting ? "4px solid #ffc107" : isSelected ? "4px solid #0d6efd" : isBugFound ? "4px solid #dc3545" : isPendingTest ? "4px solid #0dcaf0" : isCompleted ? "4px solid #28a745" : "none",
                                          transition: "all 0.3s ease",
                                          opacity: isDeleting ? 0.7 : 1,
                                        }}
                                      >
                                        <td className="align-middle"><span className="fw-bold">{task.assignedBy}</span></td>
                                        <td className="align-middle"><strong>{assignment.employeeName}</strong></td>
                                        <td className="align-middle text-center">
                                          <span className={`badge ${task.priority === 'high' ? 'bg-danger' : task.priority === 'medium' ? 'bg-warning' : 'bg-info'}`}>
                                            {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                                          </span>
                                        </td>
                                        <td className="align-middle text-start">
                                          <span className="d-flex align-items-center gap-1">
                                            {task.taskName}
                                            {isCompleted && <span className="badge bg-success ms-1" style={{ fontSize: "0.65rem" }}>✓ Done</span>}
                                            {task.remark && (
                                              <button type="button" className="btn btn-sm btn-link p-0 ms-1" onClick={() => handleViewRemark(task.remark, task.taskName)} title="View Remark">
                                                <i className="fa-solid fa-eye text-primary"></i>
                                              </button>
                                            )}
                                          </span>
                                        </td>
                                        <td className="align-middle text-start">
                                          <span className="text-muted">{task.subtaskName || "-"}</span>
                                        </td>
                                        <td className="align-middle">{formatTaskDate(task.startDate)}</td>
                                        <td className="align-middle">{formatTaskDate(task.endDate)}</td>

                                        {/* ✅ NEW — Tester column */}
                                        <td className="align-middle text-center">
                                          <small className="text-muted">{task.assignedTesterName || "-"}</small>
                                        </td>

                                        {/* ✅ NEW — QA Status column */}
                                        <td className="align-middle text-center">
                                          {task.assignedTesterName ? (
                                            <>
                                              <span className={`badge ${
                                                task.qaStatus === 'passed' ? 'bg-success' :
                                                (task.qaStatus === 'pending_test' || task.qaStatus === 'testing') ? 'bg-info text-dark' :
                                                task.qaStatus === 'bug_found' ? 'bg-danger' : 'bg-secondary'
                                              }`}>
                                                {task.qaStatus === 'passed' ? 'Passed' :
                                                 (task.qaStatus === 'pending_test' || task.qaStatus === 'testing') ? 'With Tester' :
                                                 task.qaStatus === 'bug_found' ? `Bug (Cycle ${task.testCycles || 1})` : 'Not Submitted'}
                                              </span>
                                              {task.bugHistory && task.bugHistory.length > 0 && (
                                                <button
                                                  type="button"
                                                  className="btn btn-sm btn-link p-0 ms-1"
                                                  onClick={() => handleViewRemark(task.bugHistory[task.bugHistory.length - 1].remark, task.taskName + " — Bug Report")}
                                                  title="View Latest Bug Report"
                                                >
                                                  <i className="fa-solid fa-bug text-danger"></i>
                                                </button>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-muted small">No Tester</span>
                                          )}
                                        </td>

                                        <td className="align-middle text-center">
                                          <div className="d-flex align-items-center justify-content-center gap-1 flex-wrap">
                                            {/* View Actions */}
                                            <button
                                              type="button"
                                              className="btn btn-sm px-2 py-1 d-inline-flex align-items-center justify-content-center"
                                              onClick={() => forActionShow(task.taskId, rowId)}
                                              disabled={isDeleting}
                                              title="View Actions"
                                              style={{
                                                backgroundColor: isSelected ? "#0d6efd" : "#e7f1ff",
                                                border: "2px solid #0d6efd",
                                                borderRadius: "6px",
                                                color: isSelected ? "#ffffff" : "#0d6efd",
                                                fontWeight: "600",
                                                fontSize: "13px",
                                                transition: "all 0.3s ease",
                                                cursor: isDeleting ? "not-allowed" : "pointer",
                                              }}
                                              onMouseEnter={(e) => {
                                                if (!isSelected && !isDeleting) {
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
                                              <i className="fa-solid fa-list-check me-1"></i> View
                                            </button>

                                            {/* ✅ Toggle Sub-Tasks button */}
                                            <button
                                              type="button"
                                              className="btn btn-sm px-2 py-1 d-inline-flex align-items-center"
                                              onClick={() => handleToggleSubTasks(task.taskId)}
                                              disabled={isDeleting}
                                              title={isExpanded ? "Hide Sub-Tasks" : "Show Sub-Tasks assigned by Team Lead"}
                                              style={{
                                                backgroundColor: isExpanded ? "#16a34a" : "#f0fdf4",
                                                border: "2px solid #16a34a",
                                                borderRadius: "6px",
                                                color: isExpanded ? "#fff" : "#16a34a",
                                                fontWeight: "600",
                                                fontSize: "12px",
                                                gap: "3px",
                                                transition: "all 0.3s ease",
                                              }}
                                            >
                                              <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-diagram-project'}`}></i>
                                              <span>{isExpanded ? "Hide" : "Sub-Tasks"}</span>
                                            </button>

                                            {/* Delete */}
                                            <button
                                              type="button"
                                              className="btn btn-sm px-2 py-1 d-inline-flex align-items-center justify-content-center"
                                              onClick={() => handleEmployeeTaskDelete(task.taskId, task.taskName)}
                                              disabled={isDeleting}
                                              title="Delete Task"
                                              style={{
                                                backgroundColor: isDeleting ? "#f8d7da" : "#fff0f0",
                                                border: "2px solid #dc3545",
                                                borderRadius: "6px",
                                                color: "#dc3545",
                                                fontWeight: "600",
                                                fontSize: "13px",
                                                transition: "all 0.3s ease",
                                                cursor: isDeleting ? "not-allowed" : "pointer",
                                              }}
                                              onMouseEnter={(e) => {
                                                if (!isDeleting) {
                                                  e.currentTarget.style.backgroundColor = "#dc3545";
                                                  e.currentTarget.style.color = "#ffffff";
                                                  e.currentTarget.style.transform = "scale(1.05)";
                                                }
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = isDeleting ? "#f8d7da" : "#fff0f0";
                                                e.currentTarget.style.color = "#dc3545";
                                                e.currentTarget.style.transform = "scale(1)";
                                              }}
                                            >
                                              {isDeleting ? (
                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                              ) : (
                                                <i className="fa-solid fa-trash-can"></i>
                                              )}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );

                                    // ✅ Sub-task rows (expanded under parent)
                                    const childRows = isExpanded
                                      ? subRows.length === 0
                                        ? [(
                                          <tr key={`${task.taskId}-empty`} style={{ backgroundColor: "#f8fffe" }}>
                                            <td colSpan="10" className="text-center text-muted py-2" style={{ paddingLeft: "48px", fontSize: "13px" }}>
                                              <i className="fa-solid fa-info-circle me-1"></i>
                                              No sub-tasks assigned by Team Lead yet
                                            </td>
                                          </tr>
                                        )]
                                        : subRows.map((sub, si) => {
                                          const subCompleted = sub.taskLevel === 100;
                                          return (
                                            <tr
                                              key={`${task.taskId}-sub-${si}`}
                                              style={{
                                                backgroundColor: subCompleted ? "#f0fdf4" : "#fafffe",
                                                borderLeft: "4px solid #16a34a",
                                              }}
                                            >
                                              {/* Indentation marker */}
                                              <td className="align-middle" style={{ paddingLeft: "32px", color: "#16a34a" }}>
                                                <i className="fa-solid fa-turn-down me-1" style={{ transform: "scaleX(-1)" }}></i>
                                                <span style={{ fontSize: "12px", fontWeight: "600" }}>{sub.assignedBy}</span>
                                              </td>
                                              <td className="align-middle">
                                                <span style={{ fontSize: "13px" }}>{sub.employeeName}</span>
                                                <span className="badge ms-1" style={{ backgroundColor: "#dcfce7", color: "#16a34a", fontSize: "10px" }}>Employee</span>
                                              </td>
                                              <td className="align-middle text-center">
                                                <span className={`badge ${sub.priority === 'high' ? 'bg-danger' : sub.priority === 'medium' ? 'bg-warning' : 'bg-info'}`} style={{ fontSize: "11px" }}>
                                                  {sub.priority?.charAt(0).toUpperCase() + sub.priority?.slice(1)}
                                                </span>
                                              </td>
                                              <td className="align-middle" style={{ fontSize: "13px" }}>
                                                {sub.taskName}
                                                {subCompleted && <span className="badge bg-success ms-1" style={{ fontSize: "0.6rem" }}>✓ Done</span>}
                                              </td>
                                              <td className="align-middle" style={{ fontSize: "13px", color: "#16a34a" }}>
                                                {sub.subtaskName || "-"}
                                              </td>
                                              <td className="align-middle" style={{ fontSize: "13px" }}>{formatTaskDate(sub.startDate)}</td>
                                              <td className="align-middle" style={{ fontSize: "13px" }}>{formatTaskDate(sub.endDate)}</td>

                                              {/* ✅ NEW — placeholder cells to keep column alignment */}
                                              <td className="align-middle text-center"><small className="text-muted">-</small></td>
                                              <td className="align-middle text-center"><small className="text-muted">-</small></td>

                                              <td className="align-middle text-center">
                                                <div className="d-flex align-items-center justify-content-center gap-1">
                                                  {/* Progress badge */}
                                                  <span
                                                    className="badge"
                                                    style={{
                                                      backgroundColor: subCompleted ? "#16a34a" : sub.taskLevel > 50 ? "#2563eb" : "#f59e0b",
                                                      fontSize: "12px",
                                                      minWidth: "52px"
                                                    }}
                                                  >
                                                    {sub.taskLevel}%
                                                  </span>
                                                  {/* View sub-task actions */}
                                                  <button
                                                    type="button"
                                                    className="btn btn-sm px-2 py-1 d-inline-flex align-items-center"
                                                    onClick={() => forActionShow(sub.taskId, null)}
                                                    title="View Sub-Task Actions"
                                                    style={{
                                                      backgroundColor: "#f0fdf4",
                                                      border: "1.5px solid #16a34a",
                                                      borderRadius: "6px",
                                                      color: "#16a34a",
                                                      fontWeight: "600",
                                                      fontSize: "12px",
                                                    }}
                                                  >
                                                    <i className="fa-solid fa-list-check me-1"></i> View
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      : [];

                                    return [parentRow, ...childRows];
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

                    <div className="col-12 col-md-6 col-lg-4">
                      <div className="mb-3">
                        <label htmlFor="taskName" className="form-label label_text">Task Name <RequiredStar /></label>
                        <div className="d-flex gap-2">
                          <div className="flex-grow-1">
                            <Select
                              id="taskName"
                              options={filteredTaskOptions}
                              value={selectedTasks}
                              isMulti
                              onChange={opts => setSelectedTasks(opts || [])}
                              onInputChange={val => setTaskSearch(val)}
                              placeholder="Search & select tasks..."
                              isClearable
                              isDisabled={submitting}
                              isLoading={loading}
                              styles={selectStyles}
                              noOptionsMessage={() => taskSearch ? `No task found for "${taskSearch}"` : "No tasks available"}
                              closeMenuOnSelect={false}
                              hideSelectedOptions={false}
                              components={{
                                MultiValueLabel: ({ data }) => (
                                  <div style={{ padding: '2px 6px' }}>{data.label}</div>
                                ),
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline-primary d-flex align-items-center justify-content-center"
                            onClick={() => setTaskAddPopUpShow(true)}
                            disabled={submitting}
                            title="Add New Task"
                            style={{ borderRadius: 0, minWidth: "42px", height: "38px", flexShrink: 0 }}
                          >
                            <i className="fa-solid fa-plus"></i>
                          </button>
                        </div>
                        {selectedTasks.length > 0 && (
                          <small className="text-muted mt-1 d-block">
                            <i className="fa-solid fa-circle-info me-1"></i>
                            {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} selected — will create {selectedTasks.length} assignment{selectedTasks.length > 1 ? 's' : ''}
                          </small>
                        )}
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="subtaskName" className="form-label label_text">Subtask Name</label>
                        <input
                          type="text"
                          className="form-control rounded-0"
                          id="subtaskName"
                          placeholder="Enter Subtask Details"
                          value={subtaskName}
                          onChange={(e) => setSubtaskName(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-2">
                      <div className="mb-3">
                        <label htmlFor="priority" className="form-label label_text">Priority <RequiredStar /></label>
                        <select className="form-select rounded-0" id="priority" onChange={(e) => setPriority(e.target.value)} value={priority} required disabled={submitting}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="startDate" className="form-label label_text">Start Date <RequiredStar /></label>
                        <input type="date" className="form-control rounded-0" id="startDate" onChange={(e) => setStartDate(e.target.value)} value={startDate} required disabled={submitting} />
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="endDate" className="form-label label_text">End Date <RequiredStar /></label>
                        <input type="date" className="form-control rounded-0" id="endDate" onChange={(e) => setEndDate(e.target.value)} value={endDate} required disabled={submitting} />
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
                          styles={selectStyles}
                          noOptionsMessage={() => employeeLoading ? 'Loading...' : 'No employees found'}
                          closeMenuOnSelect={false}
                        />
                      </div>
                    </div>

                    {/* ✅ NEW — Assign Tester (optional, enables QA workflow) */}
                    <div className="col-12 col-md-6 col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="testerSelect" className="form-label label_text">
                          Assign Tester <span className="text-muted small">(optional — enables QA pass/fail workflow)</span>
                        </label>
                        <Select
                          id="testerSelect"
                          options={employeeOptions}
                          value={selectedTester}
                          onChange={opt => setSelectedTester(opt)}
                          onInputChange={val => { setEmployeeSearch(val); setEmployeePage(1); }}
                          onMenuScrollToBottom={() => {
                            if (employeeHasMore) {
                              const nextPage = employeePage + 1;
                              setEmployeePage(nextPage);
                              loadEmployees(nextPage, employeeSearch);
                            }
                          }}
                          placeholder="Search and select a tester..."
                          isClearable
                          isLoading={employeeLoading}
                          isDisabled={submitting}
                          styles={selectStyles}
                          noOptionsMessage={() => employeeLoading ? 'Loading...' : 'No employees found'}
                        />
                        <small className="text-muted d-block mt-1">
                          <i className="fa-solid fa-circle-info me-1"></i>
                          If set, the developer must click "Submit for Testing" once done — the task only counts as fully completed after the tester passes it.
                        </small>
                      </div>
                    </div>

                    <div className="col-12 col-md-12 col-lg-12">
                      <div className="mb-3">
                        <label htmlFor="remark" className="form-label label_text">Remark / Description <span className="text-muted">({remark.length}/2000)</span></label>
                        <textarea onChange={(e) => setRemark(e.target.value)} value={remark} className="textarea_edit col-12" rows="3" style={{ minHeight: "170px", resize: "vertical" }} disabled={submitting} maxLength={2000}></textarea>
                        {remark.length > 1800 && <div className="text-danger small">Warning: Approaching character limit</div>}
                      </div>
                    </div>

                    <div className="col-12 col-lg-3 pt-3 mt-3">
                      <button type="submit" className="btn adbtn btn-success px-4 me-lg-4 mx-auto" disabled={submitting}>
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Assigning {selectedTasks.length > 1 ? `(${selectedTasks.length})` : ''}...
                          </>
                        ) : (
                          <><i className="fa-solid fa-plus"></i> Add</>
                        )}
                      </button>
                      <button onClick={clearForm} type="button" className="btn adbtn btn-danger px-4 mx-auto" disabled={submitting}>
                        <i className="fa-solid fa-xmark"></i> Clear
                      </button>
                    </div>

                    <div className="col-12 py-2 div_scroll">
                      <ViewSwitcher onViewModeChange={(viewMode) => setView(viewMode)} onViewListChange={setIsChecked} isChecked={isChecked} />
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
                      {taskAddPopUpShow && <AddTaskPopUp handleAdd={handleTaskSelection} cancelBtnCallBack={handleTaskCancel} />}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Action Modal Popup (original — untouched) ── */}
      {showAction && (
        <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ maxWidth: "800px", width: "95%" }}>
            <div className="modal-content">
              <div className="modal-header" style={{ background: "linear-gradient(135deg, #f8fafc, #f1f5f9)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                <h6 className="modal-title fw-bold" style={{ color: "#1e293b" }}><i className="fa-solid fa-list-check me-2 text-primary"></i>Task Actions</h6>
                <button type="button" className="btn-close" onClick={handleCloseAction}></button>
              </div>
              <div className="modal-body p-0">
                {actionLoading ? (
                  <div className="d-flex justify-content-center align-items-center p-5">
                    <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
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
                                    <div className={`progress-bar ${action.complated === 100 ? "bg-success" : "bg-warning"}`} role="progressbar" aria-valuenow={action.complated} aria-valuemin="0" aria-valuemax="100" style={{ width: `${action.complated}%` }}></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      ) : (
                        <tbody><tr><td colSpan="5"><h6 className="text-center text-muted py-4">No Action performed yet...</h6></td></tr></tbody>
                      )}
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseAction}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Remark Modal (original — untouched) ── */}
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
                <div className="border rounded p-3 bg-light"><p>{selectedRemark}</p></div>
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