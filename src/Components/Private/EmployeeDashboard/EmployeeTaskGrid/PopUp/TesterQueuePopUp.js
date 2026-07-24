/**
 * TesterQueuePopUp.jsx
 *
 * Tester's own queue of tasks awaiting review. Lets the tester:
 *  - See automatic testing start date (stamped when developer submitted)
 *  - Update their own testing progress % while reviewing
 *  - Pass (marks task fully complete) or Report a Bug (returns to developer)
 *  - See automatic testing end date once they give a final verdict
 */

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getTesterTasks, submitTestResult, updateTestProgress } from "../../../../../hooks/useTaskSheet";
import { formatDate, formatDateTimeForDisplay } from "../../../../../utils/formatDate";

const TesterQueuePopUp = ({ onClose }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [bugRemarkFor, setBugRemarkFor] = useState(null);
  const [bugRemarkText, setBugRemarkText] = useState("");

  // ── NEW: local progress input per task, keyed by task._id ──
  const [progressDraft, setProgressDraft] = useState({});

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await getTesterTasks();
      if (data?.success) setTasks(data.task || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handlePass = async (taskId) => {
    setActingId(taskId);
    try {
      const result = await submitTestResult(taskId, "pass");
      if (result?.success) {
        toast.success(result.message || "Task passed");
        fetchTasks();
      } else {
        toast.error(result?.error || "Failed to submit result");
      }
    } finally {
      setActingId(null);
    }
  };

  const handleOpenBugForm = (taskId) => {
    setBugRemarkFor(taskId);
    setBugRemarkText("");
  };

  const handleSubmitBug = async (taskId) => {
    if (!bugRemarkText.trim()) {
      toast.error("Please describe the bug before submitting");
      return;
    }
    setActingId(taskId);
    try {
      const result = await submitTestResult(taskId, "fail", bugRemarkText.trim());
      if (result?.success) {
        toast.success(result.message || "Bug reported, task returned to developer");
        setBugRemarkFor(null);
        setBugRemarkText("");
        fetchTasks();
      } else {
        toast.error(result?.error || "Failed to submit result");
      }
    } finally {
      setActingId(null);
    }
  };

  // ── NEW: tester logs partial testing progress (e.g. "90% tested so far")
  // without finalizing the task. ──
  const handleUpdateProgress = async (taskId) => {
    const value = progressDraft[taskId];
    if (value === undefined || value === "") {
      toast.error("Enter a progress percentage first");
      return;
    }
    setActingId(taskId);
    try {
      const result = await updateTestProgress(taskId, Number(value));
      if (result?.success) {
        toast.success("Testing progress updated");
        fetchTasks();
      } else {
        toast.error(result?.error || "Failed to update progress");
      }
    } finally {
      setActingId(null);
    }
  };

  const qaBadge = (status, cycles) => {
    switch (status) {
      case 'passed': return <span className="badge bg-success">Passed</span>;
      case 'pending_test': return <span className="badge bg-info text-dark">Awaiting Your Review</span>;
      case 'testing': return <span className="badge bg-primary">In Progress</span>;
      case 'bug_found': return <span className="badge bg-warning text-dark">With Developer (Cycle {cycles || 1})</span>;
      default: return <span className="badge bg-secondary">-</span>;
    }
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1050 }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxWidth: "1100px", width: "95%" }}>
        <div className="modal-content">
          <div className="modal-header" style={{ background: "linear-gradient(135deg, #e0f2fe, #dbeafe)", borderBottom: "1px solid #bae6fd" }}>
            <h6 className="modal-title fw-bold mb-0" style={{ color: "#0c4a6e" }}>
              <i className="fa-solid fa-vial me-2"></i>My Testing Queue
            </h6>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-0">
            {loading ? (
              <div className="d-flex justify-content-center align-items-center p-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-items-center table-flush mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th>Task Name</th>
                      <th>Project</th>
                      <th>Developer(s)</th>
                      {/* ── NEW columns — automatic dates + progress ── */}
                      <th>Testing Started</th>
                      <th style={{ minWidth: "150px" }}>Progress</th>
                      <th className="text-center">Status</th>
                      <th className="text-center" style={{ minWidth: "220px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr><td colSpan="7" className="text-center text-muted py-4">No tasks in your testing queue</td></tr>
                    ) : (
                      tasks.map(task => {
                        const canAct = task.qaStatus === 'pending_test' || task.qaStatus === 'testing';
                        return (
                          <React.Fragment key={task._id}>
                            <tr>
                              <td>{task.taskName?.name || 'Unknown Task'}</td>
                              <td>{task.project?.name || '-'}</td>
                              <td>{(task.employees || []).map(e => e.name).join(', ') || '-'}</td>

                              {/* ── NEW: automatic testing start timestamp — read-only ── */}
                              <td>
                                {task.testStartDate ? (
                                  <small className="text-muted">{formatDateTimeForDisplay(task.testStartDate)}</small>
                                ) : (
                                  <small className="text-muted">-</small>
                                )}
                                {task.testEndDate && (
                                  <div>
                                    <small className="text-success">
                                      <i className="fa-solid fa-flag-checkered me-1"></i>
                                      Ended: {formatDateTimeForDisplay(task.testEndDate)}
                                    </small>
                                  </div>
                                )}
                              </td>

                              {/* ── NEW: tester's own progress % — editable while In Progress ── */}
                              <td>
                                {canAct ? (
                                  <div className="d-flex align-items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="form-control form-control-sm"
                                      style={{ width: "70px" }}
                                      placeholder={`${task.testProgress || 0}%`}
                                      value={progressDraft[task._id] ?? ""}
                                      onChange={e => setProgressDraft(prev => ({ ...prev, [task._id]: e.target.value }))}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => handleUpdateProgress(task._id)}
                                      disabled={actingId === task._id}
                                      title="Save testing progress"
                                    >
                                      <i className="fa-solid fa-floppy-disk"></i>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-muted">{task.testProgress || 0}%</span>
                                )}
                                <div className="progress mt-1" style={{ height: "5px" }}>
                                  <div className="progress-bar bg-info" role="progressbar" style={{ width: `${task.testProgress || 0}%` }}></div>
                                </div>
                              </td>

                              <td className="text-center">{qaBadge(task.qaStatus, task.testCycles)}</td>
                              <td className="text-center">
                                {canAct ? (
                                  <div className="d-flex gap-2 justify-content-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-success"
                                      onClick={() => handlePass(task._id)}
                                      disabled={actingId === task._id}
                                    >
                                      <i className="fa-solid fa-check me-1"></i>Pass
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger"
                                      onClick={() => handleOpenBugForm(task._id)}
                                      disabled={actingId === task._id}
                                    >
                                      <i className="fa-solid fa-bug me-1"></i>Report Bug
                                    </button>
                                  </div>
                                ) : (
                                  <small className="text-muted">
                                    {task.qaStatus === 'passed' ? 'Completed' : 'Waiting on developer'}
                                  </small>
                                )}
                              </td>
                            </tr>
                            {bugRemarkFor === task._id && (
                              <tr>
                                <td colSpan="7" className="bg-light">
                                  <div className="p-2">
                                    <label className="form-label label_text fw-bold">Describe the bug</label>
                                    <textarea
                                      className="form-control rounded-0"
                                      rows="2"
                                      maxLength={1000}
                                      value={bugRemarkText}
                                      onChange={e => setBugRemarkText(e.target.value)}
                                      placeholder="What's wrong? Steps to reproduce, expected vs actual result..."
                                    />
                                    <div className="d-flex gap-2 mt-2">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleSubmitBug(task._id)}
                                        disabled={actingId === task._id}
                                      >
                                        {actingId === task._id ? "Submitting..." : "Return to Developer"}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => setBugRemarkFor(null)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TesterQueuePopUp;