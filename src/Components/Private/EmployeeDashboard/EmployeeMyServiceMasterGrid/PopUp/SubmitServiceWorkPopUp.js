import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { default as ReactSelect } from "react-select";
import Select from "react-select";

import {
  formatDate,
  formatDateforupdate,
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

const SubmitServiceWorkPopUp = ({ selectedService, handleUpdate}) => {
  const [status, setStatus] = useState("");
  const [action, setAction] = useState("");
  const [stuckReason, setStuckReason] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [previousActions, setPreviousActions] = useState([]);

  const [responsibleParty, setResponsibleParty] = useState("");

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

  // Updated work completion logic
  const [workComplete, setWorkComplete] = useState('');
  const [currentCompletionLevel, setCurrentCompletionLevel] = useState(0);

  // Extract completion percentage from action text if not in complateLevel field
  const extractCompletionFromAction = (action) => {
    if (action.complateLevel !== undefined && action.complateLevel !== null && action.complateLevel !== '' && action.complateLevel !== 0) {
      const level = parseInt(action.complateLevel);
      return (level >= 0 && level <= 100) ? level : 0;
    }

    const actionText = (action.action || '').toLowerCase().trim();
    if (!actionText) return 0;

    const percentPatterns = [
      /(\d+)\s*percent/gi,
      /(\d+)\s*%/gi,
      /(\d+)\s*per\s*cent/gi
    ];

    for (const pattern of percentPatterns) {
      const matches = actionText.match(pattern);
      if (matches) {
        const numbers = matches.map(match => {
          const num = parseInt(match.match(/\d+/)[0]);
          return (num >= 0 && num <= 100) ? num : 0;
        }).filter(num => num > 0);
        if (numbers.length > 0) return Math.max(...numbers);
      }
    }

    const completionKeywords = ['completed', 'complete', 'done', 'finished', 'progress'];
    const hasCompletionKeyword = completionKeywords.some(keyword => actionText.includes(keyword));

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
        return (percentage >= 0 && percentage <= 100) ? percentage : 0;
      }
    }

    const wordToPercent = {
      'half': 50,
      'quarter': 25,
      'three quarter': 75,
      'three-quarter': 75,
      'full': 100,
      'complete': 100
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
      /(\d+)\s+level/i
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

  // Calculate current completion level from service and previous actions
  useEffect(() => {
    const calculateCurrentCompletion = () => {
      let latestCompletion = parseInt(selectedService.complateLevel) || 0;
      if (previousActions && previousActions.length > 0) {
        const completionLevels = previousActions.map(action => extractCompletionFromAction(action));
        const maxCompletion = Math.max(latestCompletion, ...completionLevels);
        latestCompletion = maxCompletion;
      }
      setCurrentCompletionLevel(latestCompletion);
    };
    calculateCurrentCompletion();
  }, [selectedService, previousActions]);

  // Load departments with pagination and search
  const loadDepartments = useCallback(async (page = 1, search = "") => {
    try {
      const data = await getDepartment(page, PAGE_SIZE, search);
      if (data && data.departments) {
        if (page === 1) {
          setDepartments(data.departments);
        } else {
          setDepartments(prev => [...prev, ...data.departments]);
        }
        setHasMoreDepartments(data.departments.length === PAGE_SIZE);
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  // Load employees with pagination and search
  const loadEmployees = useCallback(async (page = 1, search = "") => {
    try {
      if (!selectedDepartment) return;
      const data = await getEmployee(selectedDepartment.value, page, PAGE_SIZE, search);
      if (data && data.employee) {
        const formattedData = data.employee.map((employee) => ({
          value: employee._id,
          label: employee.name,
        }));
        if (page === 1) {
          setEmployeeOptions(formattedData);
        } else {
          setEmployeeOptions(prev => [...prev, ...formattedData]);
        }
        setHasMoreEmployees(data.employee.length === PAGE_SIZE);
      }
    } catch (error) {
      console.log(error);
    }
  }, [selectedDepartment]);

  const FetchPreviousActions = async () => {
    try {
      const data = await getAllServiceActions(selectedService._id);
      if (data.success)
        setPreviousActions(data.serviceActions);
      else
        toast(data.error);
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
    const notificationData = {
      message: stuckReason,
      userIds: employees,
    };
    await sendNotification(notificationData);
  };

  const handleMyService = async (event) => {
    event.preventDefault();

    let actionData = {};

    if (startTime === null || endTime === null) {
      return toast.error("Please select Date and Time");
    }
    if (status === "") {
      return toast.error("Please select status");
    }
    if (status !== 'Stuck' && action === "") {
      return toast.error("Please enter Action");
    }

    if (status === "Inprogress") {
      if (workComplete === "") {
        return toast.error("Please enter Work Complete Percentage");
      }
    }

    if (status === "Completed") {
      setWorkComplete('100');
    }

    if (status === "Stuck") {
      if (responsibleParty === "") {
        return toast.error("Please select Responsible Party");
      }
      if (stuckReason === "") {
        return toast.error("Please enter Stuck Reason");
      }
      if (responsibleParty === "Company") {
        if (!selectedDepartment) {
          return toast.error("Please select Department");
        }
        if (!employees || employees === "") {
          return toast.error("Please select Employee");
        }
        handleSendNotification();
        handleUpdate();
      }
    }

    let completionLevelToSave = currentCompletionLevel;
    if (status === "Completed") {
      completionLevelToSave = 100;
    } else if (status === "Inprogress" && workComplete !== '') {
      completionLevelToSave = parseInt(workComplete);
    }

    actionData = {
      service: selectedService._id,
      status,
      startTime,
      endTime,
      stuckReason,
      complateLevel: completionLevelToSave,
      action,
    };

    toast.loading("Create Service Action...");
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
      setWorkComplete('100');
    } else if (e.target.value === "Inprogress") {
      setWorkComplete(currentCompletionLevel.toString());
    } else {
      setWorkComplete('');
    }
  };

  const handleWorkCompleteChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setWorkComplete('');
      return;
    }
    const numValue = parseInt(value);
    if (value.length <= 3 && numValue >= 0 && numValue <= 100) {
      setWorkComplete(value);
    }
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
        <div className="modal-dialog modal-lg">
          <div className="modal-content p-3">
            <form onSubmit={handleMyService}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  Work Submit
                </h5>
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
                  <div className="text-end">
                    <div
                      className="btn btn-sm btn-light"
                      onClick={(e) => setShowInfo(!showInfo)}
                    >
                      {showInfo ? "Hide Info" : "Show Info"}
                    </div>
                  </div>
                  {showInfo && (
                    <div className="row">
                      <div className="col-sm- col-md col-lg">
                        <h6>
                          <p className="fw-bold">Complaint:</p>{" "}
                          {selectedService?.ticket?.details || "-"}
                        </h6>
                        <h6>
                          <p className="fw-bold mt-3">Client:</p>{" "}
                          {selectedService?.ticket?.client?.custName}
                        </h6>
                        <h6>
                          <p className="fw-bold mt-3">Product:</p>{" "}
                          {selectedService.ticket.product}
                        </h6>
                        <h6>
                          <p className="fw-bold mt-3">Service Type:</p>{" "}
                          {selectedService.serviceType}
                        </h6>
                      </div>
                      <div className="col-sm- col-md col-lg">
                        <p className="fw-bold"> Allotment Date: </p>
                        {formatDateTimeForDisplay(selectedService.allotmentDate)}
                        <p className="fw-bold mt-3"> Allocated to: </p>
                        {selectedService.allotTo[0].name}
                        <p className="fw-bold mt-3"> Status: </p>
                        {selectedService.status}
                        <p className="fw-bold mt-3"> Priority: </p>
                        {selectedService.priority}
                        <p className="fw-bold mt-3"> Work Mode: </p>
                        {selectedService.workMode}
                        <p className="fw-bold mt-3"> Created At: </p>
                        {formatDateTimeForDisplay(selectedService.ticket.date)}
                        <p className="fw-bold mt-3">Current Work Complete: </p>
                        <span className="badge bg-primary">{currentCompletionLevel}%</span>
                      </div>
                    </div>
                  )}

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
                        aria-describedby="statusHelp"
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
                          <small className="text-muted ms-2">
                            Current: {currentCompletionLevel}%
                          </small>
                        </label>
                        <input
                          type="number"
                          className="form-control rounded-0"
                          id="workComplete"
                          name="workComplete"
                          placeholder="Enter work completion percentage (0-100)"
                          min="0"
                          max="100"
                          maxLength={3}
                          value={workComplete}
                          onChange={handleWorkCompleteChange}
                          required
                        />
                        <small className="text-info">
                          Note: Enter a value between 0% and 100%
                        </small>
                      </div>
                    )}

                    {status === "Completed" && (
                      <div className="col-12 col-md-6 mt-2">
                        <label className="form-label label_text">
                          Work Complete (%)
                        </label>
                        <div className="form-control rounded-0 d-flex align-items-center">
                          <span className="badge bg-success">100% - Completed</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {status === "Stuck" && (
                    <div className="col-12 mt-2 inprocess">
                      <div className="">
                        <label htmlFor="stuckResion" className="form-label label_text">
                          Responsible Party <RequiredStar />
                        </label>
                        <select
                          className="form-control rounded-0"
                          onChange={(e) => setResponsibleParty(e.target.value)}
                          value={responsibleParty}
                          aria-describedby="statusHelp"
                          required
                        >
                          <option value="">Select Responsible Party</option>
                          <option value="Company">Company</option>
                          <option value="Contractor">Contractor</option>
                          <option value="Client">Client</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {responsibleParty === "Company" && (
                    <div className="row">
                      <div className="col-6 col-lg-6 mt-2 inprogress-field">
                        <div className="mb-3">
                          <label htmlFor="department" className="form-label label_text">
                            Department <RequiredStar />
                          </label>
                          <Select
                            id="department"
                            options={departments.map(dept => ({ value: dept._id, label: dept.name }))}
                            value={selectedDepartment}
                            onChange={(selectedOption) => setSelectedDepartment(selectedOption)}
                            onInputChange={(inputValue) => {
                              setDeptSearchTerm(inputValue);
                              setDeptPage(1);
                            }}
                            onMenuScrollToBottom={() => {
                              if (hasMoreDepartments) {
                                const nextPage = deptPage + 1;
                                setDeptPage(nextPage);
                                loadDepartments(nextPage, deptSearchTerm);
                              }
                            }}
                            placeholder="Select Department..."
                            isClearable
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
                          />
                        </div>
                      </div>

                      <div className="col-6 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="employeeSelect" className="form-label label_text">
                            Employee Name <RequiredStar />
                          </label>
                          <Select
                            inputId="employeeSelect"
                            options={employeeOptions}
                            value={employeeOptions.find(option => option.value === employees)}
                            onChange={(selectedOption) => {
                              setEmployees(selectedOption ? selectedOption.value : "");
                            }}
                            onInputChange={(inputValue) => {
                              setEmpSearchTerm(inputValue);
                              setEmpPage(1);
                            }}
                            onMenuScrollToBottom={() => {
                              if (hasMoreEmployees) {
                                const nextPage = empPage + 1;
                                setEmpPage(nextPage);
                                loadEmployees(nextPage, empSearchTerm);
                              }
                            }}
                            placeholder="Select Employee..."
                            isClearable
                            isDisabled={!selectedDepartment}
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
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {status === "Stuck" && (
                    <div className="col-12 mt-2">
                      <div className="">
                        <label htmlFor="stuckResion" className="form-label label_text">
                          Stuck Reason <RequiredStar />
                        </label>
                        <textarea
                          type="textarea"
                          maxLength={500}
                          className="form-control rounded-0"
                          id="stuckResion"
                          placeholder="Enter Stuck Reason...."
                          onChange={(e) => setStuckReason(e.target.value)}
                          value={stuckReason}
                          aria-describedby="emailHelp"
                          required
                        ></textarea>
                      </div>
                    </div>
                  )}

                  {status !== "Stuck" && (
                    <div className="col-12 mt-2">
                      <div className="">
                        <label htmlFor="action" className="form-label label_text">
                          Action & Progress {status !== "Stuck" && <RequiredStar />}
                        </label>
                        <textarea
                          type="textarea"
                          className="form-control rounded-0"
                          id="action"
                          placeholder="Enter Action & Progress..."
                          maxLength={500}
                          value={action}
                          onChange={(e) => setAction(e.target.value)}
                          aria-describedby="nameHelp"
                          required={status !== "Stuck"}
                        ></textarea>
                      </div>
                    </div>
                  )}

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
                        value={startTime}
                        aria-describedby="statusHelp"
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
                        value={endTime}
                        aria-describedby="statusHelp"
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12 pt-3 mt-2">
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

                  {previousActions ? (
                    <>
                      <h6 className="mt-2"> Past Actions</h6>
                      <table className="table table-bordered table-responsive">
                        <thead className="thead-light">
                          <tr>
                            <th scope="col">Sr. No</th>
                            <th scope="col" className="text-start">Action</th>
                            <th scope="col">Action By</th>
                            <th scope="col">Start Date</th>
                            <th scope="col">End Date</th>
                            <th scope="col">Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previousActions.map((action, index) => {
                            const completionPercent = extractCompletionFromAction(action);
                            return (
                              <tr key={action._id}>
                                <td>{index + 1}</td>
                                <td
                                  className="text-start text-wrap w-100"
                                  style={{ maxWidth: "22rem" }}
                                >
                                  {action?.action}
                                </td>
                                <td>{action?.actionBy?.name}</td>
                                <td>{formatDateTimeForDisplay(action?.startTime)}</td>
                                <td>{formatDateTimeForDisplay(action?.endTime)}</td>
                                <td>
                                  <div className="d-flex flex-column align-items-center">
                                    {completionPercent > 0 ? (
                                      <span className={`badge mb-1 ${
                                        completionPercent >= 100 ? 'bg-success' :
                                        completionPercent >= 75 ? 'bg-primary' :
                                        completionPercent >= 50 ? 'bg-warning' :
                                        completionPercent > 0 ? 'bg-info' : 'bg-secondary'
                                      }`}>
                                        {completionPercent}%
                                      </span>
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                    {completionPercent > 0 && (
                                      <div className="progress" style={{ width: '60px', height: '4px' }}>
                                        <div
                                          className={`progress-bar ${
                                            completionPercent >= 100 ? 'bg-success' :
                                            completionPercent >= 75 ? 'bg-primary' :
                                            completionPercent >= 50 ? 'bg-warning' : 'bg-info'
                                          }`}
                                          role="progressbar"
                                          style={{ width: `${completionPercent}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
    </>
  );
};

export default SubmitServiceWorkPopUp;