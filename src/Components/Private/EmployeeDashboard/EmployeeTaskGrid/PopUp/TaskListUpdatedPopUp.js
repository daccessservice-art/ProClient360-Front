import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { formatDate, formatDateforEditAction, formatDateTimeForDisplay } from "../../../../../utils/formatDate";
import { Steps } from "rsuite";
import { createAction, getAllActions } from "../../../../../hooks/useAction";
import { updateAction } from "../../../../../hooks/useAction";
import { submitForTesting } from "../../../../../hooks/useTaskSheet";
import { getEmployees } from "../../../../../hooks/useEmployees";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import ProjectTaskAgentSuggestionHint from "./ProjectTaskAgentSuggestionHint"; // ✅ NEW

const PAGE_SIZE = 10;

const TaskListUpdatedPopUp = ({ handleUpdateTask, selectedTask }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [taskLevel, setTaskLevel] = useState(selectedTask?.taskLevel);
  const [taskStatus, setTaskStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [action, setAction] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [actionHistory, setActionHistory] = useState([]);
  const [forEdit, setForEdit] = useState(false);
  const [editAction, setEditAction] = useState(""); 
  const [addAction, setAddAction] = useState(true);

  const [submittingForTest, setSubmittingForTest] = useState(false);

  // ── developer's own tester pick — only used/shown when the Manager
  // did NOT assign a tester on this task. ──
  const [testerOptions, setTesterOptions] = useState([]);
  const [testerPage, setTesterPage] = useState(1);
  const [testerHasMore, setTesterHasMore] = useState(true);
  const [testerLoading, setTesterLoading] = useState(false);
  const [testerSearch, setTesterSearch] = useState("");
  const [pickedTester, setPickedTester] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableContainerRef = useRef(null);

  // ── derived QA flags ──
  const hasTester = !!selectedTask?.assignedTester;
  const qaStatus = selectedTask?.qaStatus || 'none';
  const isWithTester = qaStatus === 'pending_test' || qaStatus === 'testing';
  const isBugFound = qaStatus === 'bug_found';
  const isPassed = qaStatus === 'passed';
  const canSubmitForTesting = selectedTask?.taskLevel === 100 && (qaStatus === 'none' || qaStatus === 'bug_found');

  // ── load tester options only if this task has no assigned tester yet
  // and the developer is in a position to submit for testing ──
  const loadTesters = useCallback(async (page = 1, search = "") => {
    setTesterLoading(true);
    try {
      const data = await getEmployees(page, PAGE_SIZE, search);
      if (data && data.employees) {
        const newOpts = data.employees.map(emp => ({ value: emp._id, label: emp.name }));
        setTesterOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
        setTesterHasMore(newOpts.length === PAGE_SIZE);
      }
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setTesterLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasTester && canSubmitForTesting) {
      setTesterPage(1);
      setTesterHasMore(true);
      setTesterOptions([]);
      loadTesters(1, testerSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testerSearch, hasTester, canSubmitForTesting]);

  const handleStatusChange = (status) => {
    setTaskStatus(status);
    if (status === "completed") {
      setTaskLevel(100);
    } else if (status === "inprocess" || status === "stuck") { 
      setTaskLevel((prev) => (parseInt(prev) < 100 ? prev : ""));
    } else {
      setTaskLevel("");
    }
  };

  // ── passes the developer's chosen tester only when the task
  // doesn't already have one assigned by the Manager. testStartDate is set
  // automatically on the backend — nothing to pick here. ──
  const handleSubmitForTesting = async () => {
    if (submittingForTest) return;

    if (!hasTester && !pickedTester) {
      toast.error("Please select a tester before submitting for testing");
      return;
    }

    setSubmittingForTest(true);
    try {
      const result = await submitForTesting(selectedTask._id, hasTester ? null : pickedTester.value);
      if (result?.success) {
        toast.success(result.message || "Submitted for testing");
        handleUpdateTask();
      } else {
        toast.error(result?.error || "Failed to submit for testing");
      }
    } catch {
      toast.error("Failed to submit for testing");
    } finally {
      setSubmittingForTest(false);
    }
  };

  const loadActions = useCallback(async (page = 1, isInitial = false) => {
    try {
      if (isInitial) setIsLoadingMore(false);
      else setIsLoadingMore(true);
      
      const res = await getAllActions(selectedTask._id, page, 10);
      
      if (res?.actions && res.actions.length > 0) {
        if (isInitial) setActionHistory(res.actions);
        else setActionHistory(prev => [...prev, ...res.actions]);
        
        const hasMore = res.pagination ? res.pagination.hasNextPage : false;
        setHasMoreData(hasMore);
        setCurrentPage(page);
      } else {
        setHasMoreData(false);
      }
    } catch (error) {
      console.error("Error loading actions:", error);
      toast.error("Failed to load actions");
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedTask?._id]);

  const handleScroll = useCallback(async (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 5 && hasMoreData && !isLoadingMore) {
      await loadActions(currentPage + 1, false);
    }
  }, [hasMoreData, isLoadingMore, currentPage, loadActions]);

  const toggleVisibility = async () => {
    if (!isVisible) {
      setCurrentPage(1);
      setHasMoreData(true);
      setActionHistory([]);
      await loadActions(1, true);
    }
    setIsVisible(!isVisible);
  };

  // ── UPDATED: removed the "process start date cannot be in the past"
  // validation — users can now select back dates freely. ──
  const handelTaskUpdate = async (event) => {
    event.preventDefault();
    if (taskStatus === "completed") setTaskLevel(100); 

    if (!action || !startTime || !endTime || !taskLevel || !taskStatus) return toast.error("Please fill all fields");
    
    if (taskLevel > 100) return toast.error("Task level should be less than 100");
    else if (selectedTask?.taskLevel && taskLevel < selectedTask?.taskLevel) return toast.error("Task level must be greater than previous task level");
    
    if (new Date(startTime) >= new Date(endTime)) return toast.error("Start time must be before end time");

    const data = {
      task: selectedTask?._id,
      action,
      startTime,
      endTime,
      taskLevel: taskStatus === "completed" ? 100 : taskLevel,
      taskStatus,
      remark,
    };

    try {
      await createAction(data);
      if (isVisible) {
        setCurrentPage(1);
        setHasMoreData(true);
        setActionHistory([]);
        await loadActions(1, true);
      }
      handleUpdateTask();
    } catch (error) {
      toast.error(error);
    }
  };

  const editTask = (action) => {
    setEditAction(action);
    setForEdit(true);
    setAddAction(false);
  }

  const handleEditTask = (event) => {
    const { name, value } = event.target;

    if (name === "taskStatus") {
      if (value === "completed") {
        setEditAction((prevAction) => ({ ...prevAction, taskStatus: value, complated: "100" }));
      } else {
        setEditAction((prevAction) => ({ ...prevAction, taskStatus: value, complated: "" }));
      }
      return;
    }

    if (name === "complated") {
      if (editAction.taskStatus !== "completed") {
        if (value === "" || /^\d{1,2}$/.test(value)) {
          if (value === "" || parseInt(value) <= 100) {
            setEditAction((prevAction) => ({ ...prevAction, complated: value }));
          }
        }
      }
      return;
    }

    setEditAction((prevAction) => ({ ...prevAction, [name]: value }));
  };

  // ── UPDATED: removed the "process start date cannot be in the past"
  // validation here too — same rule applies to editing an existing action. ──
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!editAction.action || !editAction.startTime || !editAction.endTime || !editAction.complated || !editAction.taskStatus) return toast.error("Please fill all required fields");
    if (editAction.complated > 100) return toast.error("Completed level should be less than or equal to 100");
    if (new Date(editAction.startTime) >= new Date(editAction.endTime)) return toast.error("Start time must be before end time");

    try {
      await updateAction(editAction._id, editAction);
      if (isVisible) {
        setCurrentPage(1);
        setHasMoreData(true);
        setActionHistory([]);
        await loadActions(1, true);
      }
      handleUpdateTask();
    } catch (error) {
      toast.error(error);
    }
  }

  const selectStyles = {
    control: (provided) => ({ ...provided, borderRadius: 0, borderColor: '#ced4da', fontSize: '15px', minHeight: '38px' }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#e9ecef' : 'white',
      color: state.isSelected ? 'white' : '#212529',
      padding: '8px 12px',
    }),
    placeholder: (p) => ({ ...p, color: '#6c757d' }),
  };

  return (
    <>
     <style>
        {`
          .hidden-scrollbar::-webkit-scrollbar { width: 0px; background: transparent; }
          .hidden-scrollbar::-webkit-scrollbar-thumb { background: transparent; }
          .hidden-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .table td { max-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .table td:first-child { white-space: normal; word-wrap: break-word; }
          @media (max-width: 768px) { .table { font-size: 0.8rem; } }
        `}
      </style>

      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-xl w-100" style={{ maxWidth: '95vw', margin: '1rem auto' }}>
          <div className="modal-content p-3" style={{ maxHeight: '95vh', overflowY: 'auto' }}>
            <form>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  {selectedTask?.taskName?.name}
                </h5>
                <button onClick={() => handleUpdateTask()} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <span className="">
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="progress">
                        <div className="progress-bar" role="progressbar" style={{ width: selectedTask?.taskLevel + "%" }} aria-valuenow="50" aria-valuemin="0" aria-valuemax="100">
                          {selectedTask?.taskLevel && selectedTask?.taskLevel + "%"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Steps current={2}>
                    <Steps.Item title={formatDate(selectedTask?.startDate)} />
                    <Steps.Item title={actionHistory && actionHistory?.length > 0 ? formatDate(actionHistory[actionHistory.length - 1].endTime) : "No actions performed"} />
                  </Steps>
                </span>

                {selectedTask?.subtaskName && (
                  <div className="row mt-3 p-3 border rounded bg-light shadow-sm">
                    <div className="col-12">
                      <label className="form-label label_text fw-bold text-primary mb-1">Subtask Name</label>
                      <p className="mb-0 fs-6 text-dark">{selectedTask.subtaskName}</p>
                    </div>
                  </div>
                )}

                {/* ── QA / Testing Status block — shown whenever this task
                    is in (or has entered) the testing workflow ── */}
                {(hasTester || canSubmitForTesting) && (
                  <div
                    className="row mt-3 p-3 border rounded shadow-sm"
                    style={{
                      background: isBugFound ? '#fff5f5' : isWithTester ? '#f0f9ff' : isPassed ? '#f0fdf4' : '#fff'
                    }}
                  >
                    <div className="col-12 d-flex justify-content-between align-items-start flex-wrap gap-3">
                      <div style={{ minWidth: '220px' }}>
                        <label className="form-label label_text fw-bold mb-1">
                          <i className="fa-solid fa-vial me-1"></i> QA / Testing Status
                        </label>
                        <div>
                          <span className={`badge ${
                            isPassed ? 'bg-success' :
                            isWithTester ? 'bg-info text-dark' :
                            isBugFound ? 'bg-danger' : 'bg-secondary'
                          }`}>
                            {isPassed ? 'Passed by Tester' :
                             isWithTester ? 'With Tester — awaiting review' :
                             isBugFound ? `Bug Reported (Cycle ${selectedTask.testCycles || 1})` :
                             'Not submitted for testing yet'}
                          </span>
                          {selectedTask.assignedTester?.name && (
                            <small className="text-muted ms-2">Tester: {selectedTask.assignedTester.name}</small>
                          )}
                        </div>

                        {/* ── Automatic testing timestamps — read-only, no manual entry ── */}
                        {(selectedTask.testStartDate || selectedTask.testEndDate) && (
                          <div className="mt-2" style={{ fontSize: '12px' }}>
                            {selectedTask.testStartDate && (
                              <div className="text-muted">
                                <i className="fa-solid fa-play me-1"></i>
                                Testing started: {formatDateTimeForDisplay(selectedTask.testStartDate)}
                              </div>
                            )}
                            {selectedTask.testEndDate && (
                              <div className="text-muted">
                                <i className="fa-solid fa-flag-checkered me-1"></i>
                                Testing ended: {formatDateTimeForDisplay(selectedTask.testEndDate)}
                              </div>
                            )}
                            {isWithTester && typeof selectedTask.testProgress === 'number' && (
                              <div className="mt-1">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="text-muted">Tester progress:</span>
                                  <div className="progress flex-grow-1" style={{ height: '8px', maxWidth: '160px' }}>
                                    <div className="progress-bar bg-info" role="progressbar" style={{ width: `${selectedTask.testProgress}%` }}></div>
                                  </div>
                                  <span className="fw-bold">{selectedTask.testProgress}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Submit for Testing area ── */}
                      {canSubmitForTesting && (
                        <div style={{ minWidth: '260px' }}>
                          {!hasTester && (
                            <div className="mb-2">
                              <label className="form-label label_text small fw-bold mb-1">
                                No tester assigned by manager — choose who should test this <RequiredStar />
                              </label>
                              <Select
                                options={testerOptions}
                                value={pickedTester}
                                onChange={opt => setPickedTester(opt)}
                                onInputChange={val => { setTesterSearch(val); setTesterPage(1); }}
                                onMenuScrollToBottom={() => {
                                  if (testerHasMore) {
                                    const nextPage = testerPage + 1;
                                    setTesterPage(nextPage);
                                    loadTesters(nextPage, testerSearch);
                                  }
                                }}
                                placeholder="Search & select a tester..."
                                isClearable
                                isLoading={testerLoading}
                                styles={selectStyles}
                                noOptionsMessage={() => testerLoading ? 'Loading...' : 'No employees found'}
                              />
                              {/* ✅ NEW — Agent suggestion for least-busy tester */}
                              <ProjectTaskAgentSuggestionHint
                                mode="tester"
                                onApply={(s) => setPickedTester({ value: s.employeeId, label: s.name })}
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-info text-white w-100"
                            onClick={handleSubmitForTesting}
                            disabled={submittingForTest || (!hasTester && !pickedTester)}
                          >
                            {submittingForTest ? (
                              <><span className="spinner-border spinner-border-sm me-2"></span>Submitting...</>
                            ) : (
                              <><i className="fa-solid fa-paper-plane me-1"></i> Submit for Testing</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {isBugFound && selectedTask.bugHistory?.length > 0 && (
                      <div className="col-12 mt-2">
                        <div className="alert alert-danger mb-0 py-2">
                          <strong><i className="fa-solid fa-bug me-1"></i>Latest Bug Report:</strong>
                          <p className="mb-0 mt-1">{selectedTask.bugHistory[selectedTask.bugHistory.length - 1].remark}</p>
                        </div>
                      </div>
                    )}

                    {isWithTester && (
                      <div className="col-12 mt-2">
                        <small className="text-muted">
                          <i className="fa-solid fa-circle-info me-1"></i>
                          This task is currently with the tester for review. You'll be notified if any changes are needed.
                        </small>
                      </div>
                    )}
                  </div>
                )}

                <div className="row modal_body_height mt-2">                 
                   <div className="col-12 align-items-center">

                  <div className="d-flex justify-content-end mt-3">
                   <button type="button" className={`btn btn-sm rounded-0 add_button px-4 me-3 text-white ${isVisible ? 'btn-danger' : 'btn-success'}`} onClick={toggleVisibility}>
                     {isVisible ? 'Hide History' : 'Show Action History'}
                   </button>
                  </div>

                  {isVisible && (
                    <div className="bg-white ms-1 rounded p-lg-3">
                      <div className="col-12" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                        <div className="mb-2">
                          <small className="text-muted"><i className="fa-solid fa-info-circle me-1"></i>Scroll down to load more actions</small>
                        </div>
                        <div className="shadow_custom">
                          <div 
                            className="table-responsive hidden-scrollbar"
                            ref={tableContainerRef}
                            onScroll={handleScroll}
                            style={{ maxHeight: '400px', overflowX: 'auto', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem' }}
                          >
                            <table className="table align-items-center table-flush table-bordered">
                              <thead className="thead-light sticky-top bg-light">
                                <tr>
                                  <th className="text-center w-25">Action</th>
                                  <th className="text-center w-15">Action By</th>
                                  <th className="text-center w-15">Start Date</th>
                                  <th className="text-center w-15">End Date</th>
                                  <th className="text-center w-10">Completed</th>
                                  <th className="text-center w-10">Edit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {actionHistory && actionHistory.map((action, index) => (
                                    <tr className="text-center" key={action?._id}>
                                      <td className="text-break">{action?.action}</td>
                                      <td className="text-truncate">{action?.actionBy?.name}</td>
                                      <td className="text-nowrap">{formatDate(action?.startTime)}</td>
                                      <td className="text-nowrap">{formatDate(action?.endTime)}</td>
                                      <td>{action?.complated}%</td>
                                      <td>
                                        {index === actionHistory.length - 1 && (
                                          <button type="button" onClick={() => editTask(action)} className="btn btn-sm btn-link p-0">
                                            <i className="fa-solid fa-pen-to-square"></i>
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                {isLoadingMore && (
                                  <tr>
                                    <td colSpan="6" className="text-center py-3">
                                      <div className="spinner-border spinner-border-sm" role="status"><span className="visually-hidden">Loading...</span></div>
                                      <span className="ms-2">Loading more actions...</span>
                                    </td>
                                  </tr>
                                )}
                                {!hasMoreData && actionHistory.length > 0 && (
                                  <tr>
                                    <td colSpan="6" className="text-center py-2 text-muted"><small>No more actions to load</small></td>
                                  </tr>
                                )}
                                {actionHistory.length === 0 && !isLoadingMore && (
                                  <tr>
                                    <td colSpan="6" className="text-center py-3">No actions found</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                  {forEdit ? (
                    <div className="row modal_body_height mt-2">
                      <div className="col-12 col-lg-12 ">
                        <div className="md-3">
                          <label htmlFor="action" className="form-label label_text ">Action <RequiredStar/></label>
                          <textarea className="textarea_edit col-12" id="action" name="action" rows="2" maxLength={300} onChange={handleEditTask} value={editAction?.action} required></textarea>
                        </div>
                      </div>

                      <div className="col-12 col-md-6 col-lg-3 mt-2">
                        <div className="mb-3">
                          <label htmlFor="startTime" className="form-label label_text">Process Start Date <RequiredStar/></label>
                          <input type="datetime-local" name="startTime" onChange={handleEditTask} value={formatDateforEditAction(editAction?.startTime)} className="form-control rounded-0" id="startTime" required />
                        </div>
                      </div>

                      <div className="col-12 col-md-6 col-lg-3 mt-2">
                        <div className="mb-3">
                          <label htmlFor="endTime" className="form-label label_text">Process End Date <RequiredStar/></label>
                          <input type="datetime-local" name="endTime" onChange={handleEditTask} value={formatDateforEditAction(editAction?.endTime)} className="form-control rounded-0" id="endTime" required />
                        </div>
                      </div>

                      <div className="col-12 col-md-6 col-lg-3 mt-2">
                        <label htmlFor="taskStatus" className="form-label label_text">Status <RequiredStar/></label>
                        <select id="taskStatus" name="taskStatus" className="form-select" onChange={handleEditTask} value={editAction?.taskStatus} required>
                          <option value="">Select Status</option>
                          <option value="inprocess">In Process</option>
                          <option value="completed">Completed</option>
                          <option value="stuck">Stuck</option>
                        </select>
                      </div>

                      <div className="col-12 col-md-6 col-lg-3 mt-2">
                        <div className="">
                          <label htmlFor="complated" className="form-label label_text">Completed Level <RequiredStar/></label>
                          <div className="input-group border mb-3">
                            <input type="text" name="complated" maxLength={3} onChange={handleEditTask} value={editAction?.complated} className="form-control rounded-0 border-0" id="complated" placeholder="eg. 65 %" readOnly={editAction.taskStatus === "completed"} required />
                            <span className="input-group-text rounded-0 bg-white border-0" id="basic-addon1">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-lg-12">
                        <div className="mb-3">
                          <label htmlFor="remark" className="form-label label_text">Remark</label>
                          <textarea className="textarea_edit col-12" id="remark" name="remark" placeholder="Remark ..." maxLength={300} rows="2" onChange={handleEditTask} value={editAction?.remark}></textarea>
                        </div>
                      </div>

                      <div className="row">
                        <div className="col-12 pt-3 mt-2">
                          <button type="submit" onClick={handleSubmit} className="w-80 btn addbtn rounded-0 add_button m-2 px-4">Update</button>
                          <button type="button" onClick={handleUpdateTask} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : ""}

                  {selectedTask?.taskLevel !== 100 && addAction && !isWithTester && (
                    <div className="row modal_body_height mt-2">
                      <div className="col-12 col-lg-12 ">
                        <div className="md-3">
                          <label htmlFor="Action" className="form-label label_text ">Action  <RequiredStar/></label>
                          <textarea className="textarea_edit col-12" id="Action" name="Action" placeholder="Details ..." maxLength={300} rows="2" onChange={(e) => { setAction(e.target.value) }} value={action}></textarea>
                        </div>
                      </div>

                      <div className="col-12 col-md-6 col-lg-3 mt-2">
                        <div className="mb-3">
                          <label htmlFor="processStartDate" className="form-label label_text">Process Start Date  <RequiredStar/></label>
                          <input type="datetime-local" name="processStartDate" onChange={(e) => setStartTime(e.target.value)} value={startTime} className="form-control rounded-0" id="processStartDate" />
                        </div>
                      </div>

                      <div className="col-12 col-md-6 col-lg-3 mt-2">
                        <div className="mb-3">
                          <label htmlFor="processEndDate" className="form-label label_text">Process End Date   <RequiredStar/></label>
                          <input type="datetime-local" name="processEndDate" onChange={(e) => setEndTime(e.target.value)} value={endTime} className="form-control rounded-0" id="processEndDate" />
                        </div>
                      </div>

                      <div className="col-12 col-md-6 col-lg-3 mt-2">
                        <label htmlFor="projectStatus" className="form-label label_text">Status <RequiredStar/></label>
                        <select id="projectStatus" name="projectStatus" className="form-select" onChange={(e) => handleStatusChange(e.target.value)} value={taskStatus}>
                          <option value="">Select Status</option>
                          <option value="inprocess">In Process</option>
                          <option value="completed">Completed</option>
                          <option value="stuck">Stuck</option>
                        </select>
                      </div>

                      <div className="col-12 col-md-6 col-lg-3 mt-2">
                        <div className="">
                          <label htmlFor="completedLevel" className="form-label label_text">Completed Level <RequiredStar/></label>
                          <div className="input-group border mb-3">
                            <input
                              type="text"
                              name="completedLevel"
                              maxLength={3}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (taskStatus !== "completed" && (value === "" || /^\d{1,3}$/.test(value))) {
                                  if (value === "" || parseInt(value) <= 100) {
                                    setTaskLevel(value);
                                  }
                                }
                              }}
                              value={taskLevel}
                              className="form-control rounded-0 border-0"
                              id="completedLevel"
                              placeholder="eg. 65 %"
                              aria-label="Completed Level"
                              readOnly={taskStatus === "completed"}
                            />
                            <span className="input-group-text rounded-0 bg-white border-0" id="basic-addon1">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-lg-12">
                        <div className="mb-3">
                          <label htmlFor="remarkField" className="form-label label_text">Remark</label>
                          <textarea className="textarea_edit col-12" id="remarkField" name="remarkField" placeholder="Remark ..." maxLength={300} rows="2" onChange={(e) => setRemark(e.target.value)} value={remark}></textarea>
                        </div>
                      </div>

                      <div className="row">
                        <div className="col-12 pt-3 mt-2">
                          <button type="submit" onClick={handelTaskUpdate} className="w-80 btn addbtn rounded-0 add_button m-2 px-4">Submit Work</button>
                          <button type="button" onClick={handleUpdateTask} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {isWithTester && (
                    <div className="row mt-2">
                      <div className="col-12">
                        <div className="alert alert-info mb-0">
                          <i className="fa-solid fa-hourglass-half me-1"></i>
                          This task is currently with the tester. You can't log new work until it's reviewed.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskListUpdatedPopUp;