/**
 * SubtaskAssignPopUp.jsx
 *
 * Used by Team Lead on EmployeeTaskGrid page.
 * Allows Team Lead to create a sub-task under one of their own tasks
 * and assign it to one or more employees.
 *
 * Props:
 *   parentTask   — the TaskSheet doc the Team Lead is working on
 *   onClose()    — called to close the popup (no refresh needed)
 *   onSuccess()  — called after successful creation (triggers re-fetch)
 */

import { useState, useEffect, useCallback } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import { createSubTask } from "../../../../../hooks/useTaskSheet";
import { getEmployees } from "../../../../../hooks/useEmployees";
import { getAllTasksForDropdown } from "../../../../../hooks/useTask";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import ProjectTaskAgentSuggestionHint from "./ProjectTaskAgentSuggestionHint"; // ✅ NEW

const PAGE_SIZE = 10;

const selectStyles = {
  control: (provided) => ({
    ...provided,
    borderRadius: 0,
    borderColor: '#ced4da',
    fontSize: '15px',
    minHeight: '38px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#e9ecef' : 'white',
    color: state.isSelected ? 'white' : '#212529',
    padding: '8px 12px',
  }),
  multiValue: (p) => ({ ...p, backgroundColor: '#e7f1ff', border: '1px solid #b6d4fe', borderRadius: '4px' }),
  multiValueLabel: (p) => ({ ...p, color: '#0d6efd', fontWeight: '500', fontSize: '14px' }),
  multiValueRemove: (p) => ({ ...p, color: '#0d6efd', ':hover': { backgroundColor: '#0d6efd', color: 'white' } }),
  placeholder: (p) => ({ ...p, color: '#6c757d' }),
};

const SubtaskAssignPopUp = ({ parentTask, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);

  // Task selection
  const [taskDropDown, setTaskDropDown] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskLoading, setTaskLoading] = useState(false);

  // Form fields
  const [subtaskName, setSubtaskName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [remark, setRemark] = useState("");

  // Employee multi-select with pagination
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeHasMore, setEmployeeHasMore] = useState(true);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // ── Load tasks for dropdown ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setTaskLoading(true);
      try {
        const data = await getAllTasksForDropdown();
        if (data) setTaskDropDown(data.task || []);
      } catch {
        toast.error("Failed to load tasks");
      } finally {
        setTaskLoading(false);
      }
    };
    load();
  }, []);

  const filteredTaskOptions = taskDropDown
    .filter(t => !taskSearch || t.name.toLowerCase().includes(taskSearch.toLowerCase()))
    .map(t => ({ value: t._id, label: t.name }));

  // ── Load employees with pagination ────────────────────────────────────────
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

  // ── Validate date range ───────────────────────────────────────────────────
  useEffect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setEndDate("");
    }
  }, [startDate, endDate]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!selectedTask) return toast.error("Please select a task name");
    if (!selectedEmployees.length) return toast.error("Please select at least one employee");
    if (!startDate || !endDate) return toast.error("Please select start and end dates");
    if (new Date(endDate) < new Date(startDate)) return toast.error("End date cannot be before start date");
    if (remark.length > 2000) return toast.error("Remark cannot exceed 2000 characters");

    setSubmitting(true);
    try {
      const result = await createSubTask({
        parentTaskId: parentTask._id,
        taskName: selectedTask.value,
        employees: selectedEmployees.map(e => e.value),
        subtaskName,
        startDate,
        endDate,
        priority,
        remark,
      });

      if (result?.success) {
        onSuccess();
        onClose();
      }
    } catch {
      toast.error("Failed to assign sub-task");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="modal fade show"
      style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ maxWidth: "760px", width: "95%" }}>
        <div className="modal-content">

          {/* Header */}
          <div
            className="modal-header"
            style={{ background: "linear-gradient(135deg, #e7f1ff, #dbeafe)", borderBottom: "1px solid #b6d4fe" }}
          >
            <div>
              <h6 className="modal-title fw-bold mb-0" style={{ color: "#1e40af" }}>
                <i className="fa-solid fa-diagram-project me-2"></i>Assign Sub-Task to Employee
              </h6>
              <small className="text-muted">
                Under: <strong>{parentTask.taskName?.name || "Task"}</strong>
                {parentTask.subtaskName && <> &nbsp;›&nbsp; {parentTask.subtaskName}</>}
              </small>
            </div>
            <button type="button" className="btn-close" onClick={onClose} disabled={submitting}></button>
          </div>

          {/* Body */}
          <div className="modal-body p-3">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">

                {/* Task Name */}
                <div className="col-12 col-md-6">
                  <label className="form-label label_text">
                    Task Name <RequiredStar />
                  </label>
                  <Select
                    options={filteredTaskOptions}
                    value={selectedTask}
                    onChange={opt => setSelectedTask(opt)}
                    onInputChange={val => setTaskSearch(val)}
                    placeholder="Search & select task..."
                    isClearable
                    isLoading={taskLoading}
                    isDisabled={submitting}
                    styles={selectStyles}
                    noOptionsMessage={() => taskSearch ? `No task found for "${taskSearch}"` : "No tasks available"}
                  />
                </div>

                {/* Subtask / Description */}
                <div className="col-12 col-md-6">
                  <label className="form-label label_text">Subtask / Description</label>
                  <input
                    type="text"
                    className="form-control rounded-0"
                    placeholder="e.g. Implement login module"
                    value={subtaskName}
                    onChange={e => setSubtaskName(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                {/* Start Date */}
                <div className="col-12 col-md-4">
                  <label className="form-label label_text">Start Date <RequiredStar /></label>
                  <input
                    type="date"
                    className="form-control rounded-0"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                {/* End Date */}
                <div className="col-12 col-md-4">
                  <label className="form-label label_text">End Date <RequiredStar /></label>
                  <input
                    type="date"
                    className="form-control rounded-0"
                    value={endDate}
                    min={startDate || ""}
                    onChange={e => setEndDate(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                {/* Priority */}
                <div className="col-12 col-md-4">
                  <label className="form-label label_text">Priority <RequiredStar /></label>
                  <select
                    className="form-select rounded-0"
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    required
                    disabled={submitting}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Employee Select */}
                <div className="col-12">
                  <label className="form-label label_text">Assign To (Employees) <RequiredStar /></label>
                  <Select
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
                  {/* ✅ NEW — Agent suggestion for least-busy employee, excludes anyone already picked */}
                  <ProjectTaskAgentSuggestionHint
                    mode="assignee"
                    excludeIds={selectedEmployees.map(e => e.value)}
                    onApply={(s) => setSelectedEmployees(prev => [...prev, { value: s.employeeId, label: s.name }])}
                  />
                </div>

                {/* Remark */}
                <div className="col-12">
                  <label className="form-label label_text">
                    Remark / Description &nbsp;
                    <span className="text-muted">({remark.length}/2000)</span>
                  </label>
                  <textarea
                    className="form-control rounded-0"
                    rows="3"
                    value={remark}
                    onChange={e => setRemark(e.target.value)}
                    maxLength={2000}
                    disabled={submitting}
                    style={{ resize: "vertical" }}
                  />
                  {remark.length > 1800 && (
                    <div className="text-danger small mt-1">Warning: Approaching character limit</div>
                  )}
                </div>

              </div>

              {/* Footer Buttons */}
              <div className="d-flex gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary px-4"
                  disabled={submitting}
                  style={{ borderRadius: "6px" }}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Assigning...
                    </>
                  ) : (
                    <><i className="fa-solid fa-plus me-1"></i> Assign Sub-Task</>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary px-4"
                  onClick={onClose}
                  disabled={submitting}
                  style={{ borderRadius: "6px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SubtaskAssignPopUp;