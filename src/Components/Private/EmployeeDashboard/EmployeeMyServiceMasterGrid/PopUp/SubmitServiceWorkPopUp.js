import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  formatDateTimeForDisplay,
} from "../../../../../utils/formatDate";
import {
  createServiceAction,
  getAllServiceActions,
} from "../../../../../hooks/useServiceAction";
import { getEmployee } from "../../../../../hooks/useEmployees";
import { getDepartment } from "../../../../../hooks/useDepartment";
import { sendNotification } from "../../../../../hooks/useNotification";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const PAGE_SIZE = 10;

const SubmitServiceWorkPopUp = ({ selectedService, handleUpdate }) => {
  const [status, setStatus] = useState("");
  const [action, setAction] = useState("");
  const [stuckReason, setStuckReason] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [previousActions, setPreviousActions] = useState([]);
  const [responsibleParty, setResponsibleParty] = useState("");

  // ── NEW FIELDS ──
  const [suggestion, setSuggestion] = useState("");
  const [tentativeNextVisitDate, setTentativeNextVisitDate] = useState("");

  // Department dropdown state
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [hasMoreDepartments, setHasMoreDepartments] = useState(true);
  const [deptPage, setDeptPage] = useState(1);
  const [deptSearchTerm, setDeptSearchTerm] = useState("");

  // Employee dropdown state
  const [employees, setEmployees] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [hasMoreEmployees, setHasMoreEmployees] = useState(true);
  const [empPage, setEmpPage] = useState(1);
  const [empSearchTerm, setEmpSearchTerm] = useState("");

  const [showInfo, setShowInfo] = useState(false);

  // Work completion
  const [workComplete, setWorkComplete] = useState("");
  const [currentCompletionLevel, setCurrentCompletionLevel] = useState(0);

  // ── Extract completion % from action ──
  const extractCompletionFromAction = (action) => {
    if (
      action.complateLevel !== undefined &&
      action.complateLevel !== null &&
      action.complateLevel !== "" &&
      action.complateLevel !== 0
    ) {
      const level = parseInt(action.complateLevel);
      return level >= 0 && level <= 100 ? level : 0;
    }
    const actionText = (action.action || "").toLowerCase().trim();
    if (!actionText) return 0;

    const percentPatterns = [
      /(\d+)\s*percent/gi,
      /(\d+)\s*%/gi,
      /(\d+)\s*per\s*cent/gi,
    ];
    for (const pattern of percentPatterns) {
      const matches = actionText.match(pattern);
      if (matches) {
        const numbers = matches
          .map((match) => {
            const num = parseInt(match.match(/\d+/)[0]);
            return num >= 0 && num <= 100 ? num : 0;
          })
          .filter((num) => num > 0);
        if (numbers.length > 0) return Math.max(...numbers);
      }
    }

    const completionKeywords = ["completed", "complete", "done", "finished", "progress"];
    const hasCompletionKeyword = completionKeywords.some((k) => actionText.includes(k));
    if (hasCompletionKeyword) {
      const numberMatch = actionText.match(/(\d+)/);
      if (numberMatch) {
        const num = parseInt(numberMatch[1]);
        if (num >= 0 && num <= 100) return num;
      }
      if (actionText.match(/^(work\s+)?(completed|complete|done|finished)$/)) return 100;
    }

    const justNumberMatch = actionText.match(/^\d+$/);
    if (justNumberMatch) {
      const num = parseInt(actionText);
      if (num >= 0 && num <= 100) return num;
    }

    const fractionMatch = actionText.match(/(\d+)\s*\/\s*(\d+)/);
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1]);
      const denominator = parseInt(fractionMatch[2]);
      if (denominator > 0) {
        const percentage = Math.round((numerator / denominator) * 100);
        return percentage >= 0 && percentage <= 100 ? percentage : 0;
      }
    }

    const wordToPercent = {
      half: 50,
      quarter: 25,
      "three quarter": 75,
      "three-quarter": 75,
      full: 100,
      complete: 100,
    };
    for (const [word, percent] of Object.entries(wordToPercent)) {
      if (actionText.includes(word)) return percent;
    }

    const advancedPatterns = [
      /work\s+(\d+)/i,
      /(\d+)\s+work/i,
      /progress\s+(\d+)/i,
      /(\d+)\s+progress/i,
      /level\s+(\d+)/i,
      /(\d+)\s+level/i,
    ];
    for (const pattern of advancedPatterns) {
      const match = actionText.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 0 && num <= 100) return num;
      }
    }
    return 0;
  };

  // ── Calculate current completion ──
  useEffect(() => {
    let latestCompletion = parseInt(selectedService.complateLevel) || 0;
    if (previousActions && previousActions.length > 0) {
      const levels = previousActions.map((a) => extractCompletionFromAction(a));
      latestCompletion = Math.max(latestCompletion, ...levels);
    }
    setCurrentCompletionLevel(latestCompletion);
  }, [selectedService, previousActions]);

  // ── Load departments ──
  const loadDepartments = useCallback(async (page = 1, search = "") => {
    try {
      const data = await getDepartment(page, PAGE_SIZE, search);
      if (data?.departments) {
        setDepartments((prev) =>
          page === 1 ? data.departments : [...prev, ...data.departments]
        );
        setHasMoreDepartments(data.departments.length === PAGE_SIZE);
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  // ── Load employees ──
  const loadEmployees = useCallback(
    async (page = 1, search = "") => {
      try {
        if (!selectedDepartment) return;
        const data = await getEmployee(selectedDepartment.value, page, PAGE_SIZE, search);
        if (data?.employee) {
          const formatted = data.employee.map((e) => ({
            value: e._id,
            label: e.name,
          }));
          setEmployeeOptions((prev) =>
            page === 1 ? formatted : [...prev, ...formatted]
          );
          setHasMoreEmployees(data.employee.length === PAGE_SIZE);
        }
      } catch (error) {
        console.log(error);
      }
    },
    [selectedDepartment]
  );

  const FetchPreviousActions = async () => {
    try {
      const data = await getAllServiceActions(selectedService._id);
      if (data.success) setPreviousActions(data.serviceActions);
      else toast(data.error);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    FetchPreviousActions();
  }, [selectedService._id]);

  useEffect(() => {
    loadDepartments(1, deptSearchTerm);
  }, [loadDepartments, deptSearchTerm]);

  useEffect(() => {
    if (selectedDepartment) {
      setEmpPage(1);
      setEmployeeOptions([]);
      setEmployees("");
      loadEmployees(1, empSearchTerm);
    } else {
      setEmployeeOptions([]);
      setEmployees("");
    }
  }, [selectedDepartment, loadEmployees, empSearchTerm]);

  const handleSendNotification = async () => {
    await sendNotification({ message: stuckReason, userIds: employees });
  };

  // ── Submit ──
  const handleMyService = async (event) => {
    event.preventDefault();

    if (!startTime || !endTime) return toast.error("Please select Date and Time");
    if (!status) return toast.error("Please select status");
    if (status !== "Stuck" && !action) return toast.error("Please enter Action");
    if (status === "Inprogress" && workComplete === "")
      return toast.error("Please enter Work Complete Percentage");

    if (status === "Stuck") {
      if (!responsibleParty) return toast.error("Please select Responsible Party");
      if (!stuckReason) return toast.error("Please enter Stuck Reason");
      if (responsibleParty === "Company") {
        if (!selectedDepartment) return toast.error("Please select Department");
        if (!employees) return toast.error("Please select Employee");
        handleSendNotification();
        handleUpdate();
      }
    }

    let completionLevelToSave = currentCompletionLevel;
    if (status === "Completed") {
      completionLevelToSave = 100;
    } else if (status === "Inprogress" && workComplete !== "") {
      completionLevelToSave = parseInt(workComplete);
    }

    const actionData = {
      service: selectedService._id,
      status,
      startTime,
      endTime,
      stuckReason,
      complateLevel: completionLevelToSave,
      action,
      // ── NEW FIELDS ──
      suggestion: suggestion.trim(),
      tentativeNextVisitDate: tentativeNextVisitDate || null,
    };

    toast.loading("Submitting Work...");
    const data = await createServiceAction(actionData);
    toast.dismiss();
    if (data.success) {
      toast.success(data.message);
      handleUpdate();
      FetchPreviousActions();
    } else {
      toast.error(data?.error);
    }
  };

  const onStatusChange = (e) => {
    setStatus(e.target.value);
    if (e.target.value !== "Stuck") {
      setResponsibleParty("");
      setStuckReason("");
    }
    if (e.target.value === "Completed") {
      setWorkComplete("100");
    } else if (e.target.value === "Inprogress") {
      setWorkComplete(currentCompletionLevel.toString());
    } else {
      setWorkComplete("");
    }
  };

  const handleWorkCompleteChange = (e) => {
    const value = e.target.value;
    if (value === "") { setWorkComplete(""); return; }
    const numValue = parseInt(value);
    if (value.length <= 3 && numValue >= 0 && numValue <= 100) {
      setWorkComplete(value);
    }
  };

  const selectStyles = {
    control: (p) => ({ ...p, borderRadius: 0, borderColor: "#ced4da", fontSize: "16px" }),
    option: (p, s) => ({
      ...p,
      backgroundColor: s.isSelected ? "#007bff" : s.isFocused ? "#f8f9fa" : "white",
      color: s.isSelected ? "white" : "#212529",
    }),
  };

  return (
    <div
      className="modal fade show"
      style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content p-3">
          <form onSubmit={handleMyService}>
            {/* ── Header ── */}
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Work Submit</h5>
              <button
                onClick={handleUpdate}
                type="button"
                className="close px-3"
                style={{ marginLeft: "auto" }}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="row modal_body_height">
              <div className="col-12 mt-2">
                {/* Show / Hide Info toggle */}
                <div className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    onClick={() => setShowInfo(!showInfo)}
                  >
                    {showInfo ? "Hide Info" : "Show Info"}
                  </button>
                </div>

                {/* ── Service Info Panel ── */}
                {showInfo && (
                  <div className="row border rounded p-2 mb-2" style={{ background: "#f9f9f9" }}>
                    <div className="col-sm col-md col-lg">
                      <p className="fw-bold mb-1">Complaint:</p>
                      <p className="text-muted">{selectedService?.ticket?.details || "-"}</p>
                      <p className="fw-bold mb-1 mt-2">Client:</p>
                      <p className="text-muted">{selectedService?.ticket?.client?.custName || "-"}</p>
                      <p className="fw-bold mb-1 mt-2">Product:</p>
                      <p className="text-muted">{selectedService?.ticket?.product || "-"}</p>
                      <p className="fw-bold mb-1 mt-2">Service Type:</p>
                      <p className="text-muted">{selectedService?.serviceType || "-"}</p>
                    </div>
                    <div className="col-sm col-md col-lg">
                      <p className="fw-bold mb-1">Allotment Date:</p>
                      <p className="text-muted">{formatDateTimeForDisplay(selectedService.allotmentDate)}</p>
                      <p className="fw-bold mb-1 mt-2">Allocated To:</p>
                      <p className="text-muted">{selectedService?.allotTo?.[0]?.name || "-"}</p>
                      <p className="fw-bold mb-1 mt-2">Status:</p>
                      <p className="text-muted">{selectedService?.status || "-"}</p>
                      <p className="fw-bold mb-1 mt-2">Priority:</p>
                      <p className="text-muted">{selectedService?.priority || "-"}</p>
                      <p className="fw-bold mb-1 mt-2">Work Mode:</p>
                      <p className="text-muted">{selectedService?.workMode || "-"}</p>
                      <p className="fw-bold mb-1 mt-2">Created At:</p>
                      <p className="text-muted">{formatDateTimeForDisplay(selectedService?.ticket?.date)}</p>
                      <p className="fw-bold mb-1 mt-2">Current Work Complete:</p>
                      <span className="badge bg-primary">{currentCompletionLevel}%</span>
                    </div>
                  </div>
                )}

                {/* ── Status Row ── */}
                <div className="row">
                  <div className="col-12 col-md-6 mt-2">
                    <label htmlFor="status" className="form-label label_text">
                      Status <RequiredStar />
                    </label>
                    <select
                      className="form-control rounded-0"
                      id="status"
                      onChange={onStatusChange}
                      value={status}
                      required
                    >
                      <option value="">Select Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Inprogress">Inprogress</option>
                      <option value="Completed">Completed</option>
                      <option value="Stuck">Stuck</option>
                    </select>
                  </div>

                  {status === "Inprogress" && (
                    <div className="col-12 col-md-6 mt-2">
                      <label htmlFor="workComplete" className="form-label label_text">
                        Work Complete (%) <RequiredStar />
                        <small className="text-muted ms-2">Current: {currentCompletionLevel}%</small>
                      </label>
                      <input
                        type="number"
                        className="form-control rounded-0"
                        id="workComplete"
                        placeholder="Enter work completion percentage (0-100)"
                        min="0"
                        max="100"
                        value={workComplete}
                        onChange={handleWorkCompleteChange}
                        required
                      />
                      <small className="text-info">Note: Enter a value between 0% and 100%</small>
                    </div>
                  )}

                  {status === "Completed" && (
                    <div className="col-12 col-md-6 mt-2">
                      <label className="form-label label_text">Work Complete (%)</label>
                      <div className="form-control rounded-0 d-flex align-items-center">
                        <span className="badge bg-success">100% — Completed</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Stuck: Responsible Party ── */}
                {status === "Stuck" && (
                  <div className="col-12 mt-2">
                    <label className="form-label label_text">
                      Responsible Party <RequiredStar />
                    </label>
                    <select
                      className="form-control rounded-0"
                      onChange={(e) => setResponsibleParty(e.target.value)}
                      value={responsibleParty}
                      required
                    >
                      <option value="">Select Responsible Party</option>
                      <option value="Company">Company</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Client">Client</option>
                    </select>
                  </div>
                )}

                {/* ── Stuck: Department + Employee ── */}
                {responsibleParty === "Company" && (
                  <div className="row">
                    <div className="col-6 mt-2">
                      <label className="form-label label_text">
                        Department <RequiredStar />
                      </label>
                      <Select
                        options={departments.map((d) => ({ value: d._id, label: d.name }))}
                        value={selectedDepartment}
                        onChange={(opt) => setSelectedDepartment(opt)}
                        onInputChange={(val) => { setDeptSearchTerm(val); setDeptPage(1); }}
                        onMenuScrollToBottom={() => {
                          if (hasMoreDepartments) {
                            const np = deptPage + 1;
                            setDeptPage(np);
                            loadDepartments(np, deptSearchTerm);
                          }
                        }}
                        placeholder="Select Department..."
                        isClearable
                        styles={selectStyles}
                      />
                    </div>
                    <div className="col-6 mt-2">
                      <label className="form-label label_text">
                        Employee Name <RequiredStar />
                      </label>
                      <Select
                        options={employeeOptions}
                        value={employeeOptions.find((o) => o.value === employees) || null}
                        onChange={(opt) => setEmployees(opt ? opt.value : "")}
                        onInputChange={(val) => { setEmpSearchTerm(val); setEmpPage(1); }}
                        onMenuScrollToBottom={() => {
                          if (hasMoreEmployees) {
                            const np = empPage + 1;
                            setEmpPage(np);
                            loadEmployees(np, empSearchTerm);
                          }
                        }}
                        placeholder="Select Employee..."
                        isClearable
                        isDisabled={!selectedDepartment}
                        styles={selectStyles}
                      />
                    </div>
                  </div>
                )}

                {/* ── Stuck Reason ── */}
                {status === "Stuck" && (
                  <div className="col-12 mt-2">
                    <label className="form-label label_text">
                      Stuck Reason <RequiredStar />
                    </label>
                    <textarea
                      className="form-control rounded-0"
                      placeholder="Enter Stuck Reason...."
                      maxLength={500}
                      onChange={(e) => setStuckReason(e.target.value)}
                      value={stuckReason}
                      required
                    />
                  </div>
                )}

                {/* ── Action & Progress ── */}
                {status !== "Stuck" && (
                  <div className="col-12 mt-2">
                    <label htmlFor="action" className="form-label label_text">
                      Action & Progress <RequiredStar />
                    </label>
                    <textarea
                      className="form-control rounded-0"
                      id="action"
                      placeholder="Enter Action & Progress..."
                      maxLength={500}
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* ── Start & End Time ── */}
                <div className="row g-3 mt-2">
                  <div className="col">
                    <label htmlFor="StartTime" className="form-label label_text">
                      Start Date & Time <RequiredStar />
                    </label>
                    <input
                      className="form-control rounded-0"
                      id="StartTime"
                      type="datetime-local"
                      onChange={(e) => setStartTime(e.target.value)}
                      value={startTime || ""}
                      required
                    />
                  </div>
                  <div className="col">
                    <label htmlFor="EndTime" className="form-label label_text">
                      End Date & Time <RequiredStar />
                    </label>
                    <input
                      className="form-control rounded-0"
                      id="EndTime"
                      type="datetime-local"
                      onChange={(e) => setEndTime(e.target.value)}
                      value={endTime || ""}
                      required
                    />
                  </div>
                </div>

                {/* ══════════════════════════════════════════
                    NEW FIELDS: Suggestion / Remark  +  Tentative Next Visit Date
                    ══════════════════════════════════════════ */}
                <div className="row g-3 mt-2">
                  {/* Suggestion / Remark */}
                  <div className="col-12 col-md-6">
                    <label htmlFor="suggestion" className="form-label label_text">
                      Suggestion / Remark
                      <small className="text-muted ms-1">(Optional)</small>
                    </label>
                    <textarea
                      className="form-control rounded-0"
                      id="suggestion"
                      placeholder="Enter any suggestion or remark for the client..."
                      maxLength={500}
                      rows={3}
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                    />
                    <small className="text-muted">{suggestion.length}/500 characters</small>
                  </div>

                  {/* Tentative Next Visit Date */}
                  <div className="col-12 col-md-6">
                    <label htmlFor="tentativeNextVisitDate" className="form-label label_text">
                      Tentative Next Visit Date
                      <small className="text-muted ms-1">(Optional)</small>
                    </label>
                    <input
                      className="form-control rounded-0"
                      id="tentativeNextVisitDate"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={tentativeNextVisitDate}
                      onChange={(e) => setTentativeNextVisitDate(e.target.value)}
                    />
                    <small className="text-info">
                      <i className="fa-solid fa-circle-info me-1" />
                      This date will be included in the client notification email.
                    </small>
                  </div>
                </div>
                {/* ══════════════════════════════════════════ */}

                {/* ── Submit / Cancel ── */}
                <div className="row mt-3">
                  <div className="col-12 pt-2">
                    <button
                      type="submit"
                      className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                    >
                      Submit Work
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdate}
                      className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* ── Previous Actions Table ── */}
                {previousActions && previousActions.length > 0 ? (
                  <>
                    <h6 className="mt-3">Past Actions</h6>
                    <div className="table-responsive">
                      <table className="table table-bordered table-sm">
                        <thead className="thead-light">
                          <tr>
                            <th>Sr.</th>
                            <th className="text-start">Action</th>
                            <th>By</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Progress</th>
                            <th className="text-start">Suggestion</th>
                            <th>Next Visit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previousActions.map((act, index) => {
                            const completionPercent = extractCompletionFromAction(act);
                            return (
                              <tr key={act._id}>
                                <td>{index + 1}</td>
                                <td
                                  className="text-start text-wrap"
                                  style={{ maxWidth: "18rem" }}
                                >
                                  {act?.action || "-"}
                                </td>
                                <td>{act?.actionBy?.name || "-"}</td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  {formatDateTimeForDisplay(act?.startTime)}
                                </td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  {formatDateTimeForDisplay(act?.endTime)}
                                </td>
                                <td>
                                  <div className="d-flex flex-column align-items-center">
                                    {completionPercent > 0 ? (
                                      <>
                                        <span
                                          className={`badge mb-1 ${
                                            completionPercent >= 100
                                              ? "bg-success"
                                              : completionPercent >= 75
                                              ? "bg-primary"
                                              : completionPercent >= 50
                                              ? "bg-warning"
                                              : "bg-info"
                                          }`}
                                        >
                                          {completionPercent}%
                                        </span>
                                        <div
                                          className="progress"
                                          style={{ width: "60px", height: "4px" }}
                                        >
                                          <div
                                            className={`progress-bar ${
                                              completionPercent >= 100
                                                ? "bg-success"
                                                : completionPercent >= 75
                                                ? "bg-primary"
                                                : completionPercent >= 50
                                                ? "bg-warning"
                                                : "bg-info"
                                            }`}
                                            style={{ width: `${completionPercent}%` }}
                                          />
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </div>
                                </td>
                                {/* ── NEW columns in table ── */}
                                <td
                                  className="text-start text-wrap"
                                  style={{ maxWidth: "16rem" }}
                                >
                                  {act?.suggestion ? (
                                    <span className="text-secondary">{act.suggestion}</span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  {act?.tentativeNextVisitDate ? (
                                    <span className="badge bg-warning text-dark">
                                      {new Date(act.tentativeNextVisitDate).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="alert alert-warning mt-2" role="alert">
                    No Actions Available
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubmitServiceWorkPopUp;