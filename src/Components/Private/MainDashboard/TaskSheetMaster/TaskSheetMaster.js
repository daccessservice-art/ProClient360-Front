import React, { useEffect, useState, useCallback } from "react";
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import { ViewMode, Gantt } from "gantt-task-react";
import { initTasks } from "../../../Helper/GanttChartHelper";
import "gantt-task-react/dist/index.css";
import { ViewSwitcher } from "../../../Helper/ViewSwitcher";
import { default as ReactSelect } from "react-select";
import Select from "react-select";
import { useParams, useNavigate } from "react-router-dom";
import { getTaskSheet, createTaskSheet, deleteTaskSheet } from "../../../../hooks/useTaskSheet";
import toast from "react-hot-toast";
import { getTask, getAllTasksForDropdown } from "../../../../hooks/useTask";
import { getEmployees } from "../../../../hooks/useEmployees";
import AddTaskPopUp from "../TaskMaster/PopUp/AddTaskPopUp";
import { getAllActions } from "../../../../hooks/useAction";
import { formatDateforEditAction, formatDateTimeForDisplay } from "../../../../utils/formatDate";
import { RequiredStar } from "../../RequiredStar/RequiredStar";
import { getProject } from "../../../../hooks/useProjects";

const PAGE_SIZE = 10;

export const TaskSheetMaster = () => {
  const navigate = useNavigate();

  const [isopen, setIsOpen] = useState(false);
  const toggle = () => {
    setIsOpen(!isopen);
  };

  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const { id } = useParams();

  const [view, setView] = React.useState(ViewMode.Day);
  const [tasks, setTasks] = React.useState(initTasks());
  const [isChecked, setIsChecked] = React.useState(true);

  const [employees, setEmployees] = useState([]);
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
  
  const [employeeTaskAssignments, setEmployeeTaskAssignments] = useState([]);

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  const loadEmployees = useCallback(async (page = 1, search = "") => {
    setEmployeeLoading(true);
    try {
      const data = await getEmployees(page, PAGE_SIZE, search);
      if (data && data.employees) {
        const newOpts = data.employees.map(emp => ({ value: emp._id, label: emp.name }));
        setEmployeeOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
        setEmployeeHasMore(newOpts.length === PAGE_SIZE);
      }
    } catch (error) {
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
  if (view === ViewMode.Month) {
    columnWidth = 300;
  } else if (view === ViewMode.Week) {
    columnWidth = 250;
  }

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

  const handleTaskCancel = () => {
    setTaskAddPopUpShow(!taskAddPopUpShow);
  };

  const forActionShow = async (id) => {
    try {
      setActionLoading(true);
      const data = await getAllActions(id);
      setForTask(data?.actions);
      setShowAction(true);
    } catch (error) {
      toast.error("Failed to load actions");
    } finally {
      setActionLoading(false);
    }
  }

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
              if( data?.success) {
                toast.success(data?.message || "Task deleted successfully");
              } else {
                toast.error(data?.error || "Failed to delete task");
              }
            } catch (error) {
              toast.error("Error deleting task");
            } finally {
              setLoading(false);
            }
          }
        },
        {
          label: 'No',
          onClick: () => {
            return;
          }
        }
      ]
    });
  };

  const handleProgressChange = async (task) => {
    setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
  };

  const handleDblClick = (task) => {
    if(task.type==='task')
    forActionShow(task.id);
  };

  const handleSelect = (task, isSelected) => {
    // console.log(task.name + " has " + (isSelected ? "selected" : "unselected"));
  };

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
                      assignedById: task.assignedBy?._id || null
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
                assignedById: assignment.assignedById
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
        if (data) {
          setTaskDropDown(data.task || []);
        }
      } catch (error) {
        console.log(error);
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
    // Prevent multiple submissions
    if (submitting) return;
    
    const employeeIds = selectedEmployees.map(emp => emp.value);
    const data = {
      project: id,
      employees: employeeIds,
      taskName,
      startDate,
      endDate,
      remark,
      priority,
    };
    
    if (!selectedEmployees.length || !taskName || !startDate || !endDate ) {
      return toast.error("Please fill all required fields");
    }

    // Check remark length
    if (remark.length > 2000) {
      return toast.error("Remark cannot exceed 2000 characters");
    }

    // Check if dates are before today
    if (new Date(startDate) < new Date(today)) {
      return toast.error("Start date cannot be before today");
    }

    if (new Date(endDate) < new Date(today)) {
      return toast.error("End date cannot be before today");
    }

    // Check if end date is before start date
    if (new Date(endDate) < new Date(startDate)) {
      return toast.error("End date cannot be before start date");
    }

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

  // Reset end date when start date changes if end date is before new start date
  useEffect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setEndDate("");
    }
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
              <Sidebar isopen={isopen} active="TaskSheetMaster" id={id} style={{ width: isopen ? "" : "calc(100%  - 120px )", marginLeft: isopen ? "" : "125px" }} />

              <div
                className="main-panel"
                style={{
                  width: isopen ? "" : "calc(100%  - 120px )",
                  marginLeft: isopen ? "" : "125px",
                }}
              >
                <div className="content-wrapper ps-3 ps-md-0 pt-3">

                  <div className="col-12 col-lg-12 mx-auto mb-4 mb-lg-0 pt-4 ">
                    <button className="btn btn-outline-light d-flex align-items-center" onClick={() => navigate('/ProjectMasterGrid')}>             
                      <i className="fa-solid text-light fa-angle-left me-2"></i>  Back 
                    </button>
                  </div>

                  <div className="row px-2 py-1   ">
                    <div className="col-12 col-lg-6">
                      <h5 className="text-white py-2">
                        <span className="fw-light">Project Name : </span> {projectName && projectName.name + " - " + projectName?.custId?.custName}
                      </h5>
                    </div>
                  </div>

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
                                  <th>Employee Name</th>
                                  <th>Task Name</th>
                                  <th>Priority</th>
                                  <th>Start Date</th>
                                  <th>End Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {employeeTaskAssignments.flatMap((assignment) =>
                                  assignment.tasks.map((task, index) => (
                                    <tr key={`${assignment.employeeId}-${task.taskId}-${index}`}>
                                     <td className="align-middle"><span className="fw-bold">{task.assignedBy}</span></td>
                                      <td className="align-middle">
                                        <strong>{assignment.employeeName}</strong>
                                      </td>
                                      <td className="align-middle text-start">{task.taskName}</td>
                                      <td className="align-middle text-center">
                                        <span className={`badge ${
                                          task.priority === 'high' ? 'bg-danger' : 
                                          task.priority === 'medium' ? 'bg-warning' : 
                                          'bg-info'
                                        }`}>
                                          {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                                        </span>
                                      </td>
                                      <td className="align-middle">{new Date(task.startDate).toLocaleDateString()}</td>
                                      <td className="align-middle">{new Date(task.endDate).toLocaleDateString()}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="alert alert-info">
                            No employees assigned to tasks yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="row  bg-white p-2 m-1 border rounded">
                    <div className="col-12 col-md-6 col-lg-3">
                      <div className="mb-3">
                        <label
                          htmlFor="taskName"
                          className="form-label label_text"
                        >
                          Task Name <RequiredStar/>
                        </label>
                        <select
                          className="form-select rounded-0"
                          aria-label="Default select example"
                          onChange={(e) => handleTaskSelection(e.target.value)}
                          value={taskName}
                          required
                          disabled={submitting}
                        >
                          <option value="">-- Select Task Name --</option>
                          {taskDropDown &&
                            taskDropDown.map((task) => (
                              <option key={task._id} value={task._id}>{task.name}</option>
                            ))}
                          <option value="AddNewTask" >-- Add New Task --</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                      <div className="mb-3">
                        <label
                          htmlFor="priority"
                          className="form-label label_text"
                        >
                          Priority <RequiredStar/>
                        </label>
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
                        <label
                          htmlFor="startDate"
                          className="form-label label_text"
                        >
                          Start Date <RequiredStar/>
                        </label>
                        <input
                          type="date"
                          className="form-control rounded-0"
                          id="startDate"
                          onChange={(e) => setStartDate(e.target.value)}
                          value={startDate}
                          aria-describedby="emailHelp"
                          required
                          disabled={submitting}
                          min={today}
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="endDate" className="form-label label_text">
                          End Date <RequiredStar/>
                        </label>
                        <input
                          type="date"
                          className="form-control rounded-0"
                          id="endDate"
                          onChange={(e) => setEndDate(e.target.value)}
                          value={endDate}
                          aria-describedby="emailHelp"
                          required
                          disabled={submitting}
                          min={startDate || today}
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-6">
                      <div className="mb-3">
                        <label
                          htmlFor="employeeSelect"
                          className="form-label label_text"
                        >
                          Employee Name <RequiredStar/>
                        </label>
                        <Select
                          id="employeeSelect"
                          options={employeeOptions}
                          value={selectedEmployees}
                          isMulti
                          onChange={opts => setSelectedEmployees(opts || [])}
                          onInputChange={val => {
                            setEmployeeSearch(val);
                            setEmployeePage(1);
                          }}
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
                            control: (provided) => ({
                              ...provided,
                              borderRadius: 0,
                              borderColor: '#ced4da',
                              fontSize: '16px',
                            }),
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
                        <label
                          htmlFor="ProjectName"
                          className="form-label label_text"
                        >
                          Remark / Description <span className="text-muted">({remark.length}/2000)</span>
                        </label>
                        <textarea
                          onChange={(e) => setRemark(e.target.value)}
                          value={remark}
                          className="textarea_edit col-12"
                          id=""
                          name=""
                          placeholder=""
                          rows="3"
                          style={{ minHeight: "170px", resize: "vertical" }}
                          disabled={submitting}
                          maxLength={2000}
                        ></textarea>
                        {remark.length > 1800 && (
                          <div className="text-danger small">
                            Warning: Approaching character limit
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="col-12 col-lg-3  pt-3 mt-3 ">
                      <button
                        type="submit"
                        className="btn adbtn btn-success px-4 me-lg-4 mx-auto"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Assigning...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-plus"></i> Add
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          clearForm();
                        }}
                        type="button"
                        className="btn adbtn btn-danger  px-4 mx-auto"
                        disabled={submitting}
                      >
                        <i className="fa-solid fa-xmark"></i> Clear
                      </button>
                    </div>

                    <div className="col-12 py-2 div_scroll">
                      <div>
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
                        {taskAddPopUpShow ? (
                          <AddTaskPopUp
                            handleAdd={handleTaskSelection}
                            cancelBtnCallBack={handleTaskCancel}
                          />
                        ) : (
                          <></>
                        )}
                      </div>
                    </div>

                    {showAction && (
                      <div className="col-12 col-lg-12  mx-auto  rounded ">
                        <div className="row  bg-white ms-lg-1 pt-5 rounded p-lg-3">
                          <div className="col-12 col-lg-6">
                            <h6 className="mb-0 fw-bold mb-3 text-warning-dark">Task Name </h6>
                          </div>
                          <div className="col-12 col-lg-6 text-end">
                            <span
                              onClick={() => setShowAction(false)}
                              type="button"
                              className="close  px-3"
                            >
                              <span aria-hidden="true">&times;</span>
                            </span>
                          </div>
                          <div className="col-12">
                            {actionLoading ? (
                              <div className="d-flex justify-content-center p-4">
                                <div className="spinner-border text-primary" role="status">
                                  <span className="sr-only">Loading...</span>
                                </div>
                              </div>
                            ) : (
                              <div className="shadow_custom ">
                                <div className="table-responsive">
                                  <table className="table align-items-center table-flush">
                                    <thead className="thead-light">
                                      <tr>
                                        <th className="text-center">Action</th>
                                        <th className="text-center">Action By</th>
                                        <th className="text-center">Start Time </th>
                                        <th className="text-center">End Time</th>
                                        <th className="text-center">Completion</th>
                                      </tr>
                                    </thead>
                                    {forTask && forTask.length !== 0 ? (
                                      <tbody>
                                        {forTask && forTask.map((action) => (
                                          <tr className="text-center" key={action._id}>
                                            <td>{action.action}</td>
                                            <td>{action.actionBy.name}</td>
                                            <td>{formatDateTimeForDisplay(action.startTime)}</td>
                                            <td>{formatDateTimeForDisplay(action.endTime)}</td>
                                            <td className="text-center">
                                              <div className="d-flex align-items-center"
                                                style={{ justifyContent: "center" }}
                                              >
                                              {action.complated}%
                                                  <span className="progress"
                                                        style={{ marginLeft: "10px" }}
                                                  >
                                                    <div
                                                      className="progress-bar bg-warning"
                                                      role="progressbar"
                                                      aria-valuenow={action.complated}
                                                      aria-valuemin="0"
                                                      aria-valuemax="100"
                                                      style={{
                                                        width: `${action.complated}%`,
                                                      }}
                                                    ></div>
                                                  </span>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    ) : (<tbody><tr><td colSpan="5"><h6 className="text-center">No Action performed....</h6></td></tr></tbody>)}
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};