import React, { useState, useEffect, useCallback } from 'react';
import toast from "react-hot-toast";
import Select from "react-select";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getDepartment } from "../../../../../hooks/useDepartment";
import { getEmployee } from "../../../../../hooks/useEmployees";

const PAGE_SIZE = 10;

const AssignMarketingLeadPopUp = ({ selectedLead, currentUser, onUpdate, onClose }) => {
  const [formData, setFormData] = useState({
    feasibility: '',
    notFeasibleReason: '',
    feasibleReason: '', 
    callUnansweredReason: '',
  });

  // Department dropdown state
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [hasMoreDepartments, setHasMoreDepartments] = useState(true);
  const [deptPage, setDeptPage] = useState(1);
  const [deptSearchTerm, setDeptSearchTerm] = useState("");
  
  // Employee dropdown state
  const [assignedEmployee, setAssignedEmployee] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [hasMoreEmployees, setHasMoreEmployees] = useState(true);
  const [empPage, setEmpPage] = useState(1);
  const [empSearchTerm, setEmpSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Call history state
  const [callHistoryData, setCallHistoryData] = useState([]);

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

      setLoading(true);
      const data = await getEmployee(selectedDepartment.value, page, PAGE_SIZE, search);
      
      let employeeArray = [];
      
      if (Array.isArray(data)) {
        employeeArray = data;
      } else if (data && Array.isArray(data.employee)) {
        employeeArray = data.employee;
      } else if (data && Array.isArray(data.employees)) {
        employeeArray = data.employees;
      } else if (data && Array.isArray(data.data)) {
        employeeArray = data.data;
      }
      
      if (employeeArray.length > 0) {
        const formattedData = employeeArray.map((employee) => ({
          value: employee._id,
          label: employee.name,
          employeeData: employee,
        }));
        
        if (page === 1) {
          setEmployeeOptions(formattedData);
        } else {
          setEmployeeOptions(prev => [...prev, ...formattedData]);
        }
        setHasMoreEmployees(employeeArray.length === PAGE_SIZE);
      } else {
        if (page === 1) {
          setEmployeeOptions([]);
          if (search === "") {
            toast.info('No employees found for this department');
          }
        }
        setHasMoreEmployees(false);
      }
    } catch (error) {
      console.log('Error fetching employees:', error);
      if (page === 1) {
        toast.error('Failed to fetch employees');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    loadDepartments(1, deptSearchTerm);
  }, [loadDepartments, deptSearchTerm]);

  useEffect(() => {
    if (selectedDepartment) {
      setEmpPage(1);
      setEmployeeOptions([]);
      setAssignedEmployee(null);
      loadEmployees(1, empSearchTerm);
    } else {
      setEmployeeOptions([]);
      setAssignedEmployee(null);
    }
  }, [selectedDepartment, loadEmployees, empSearchTerm]);

  // Initialize call history from selected lead
  useEffect(() => {
    if (selectedLead && selectedLead.callHistory) {
      setCallHistoryData(selectedLead.callHistory);
    }
  }, [selectedLead]);

  // Set initial form data based on selected lead
  useEffect(() => {
    if (selectedLead) {
      setFormData({
        feasibility: selectedLead.feasibility || '',
        notFeasibleReason: selectedLead.remark || '',
        feasibleReason: '', 
        callUnansweredReason: selectedLead.remark || '',
      });
    }
  }, [selectedLead]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'feasibility') {
      setFormData({
        feasibility: value,
        notFeasibleReason: '',
        feasibleReason: '',
        callUnansweredReason: '',
      });
      setSelectedDepartment(null);
      setAssignedEmployee(null);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.feasibility) return toast.error('Please select a Feasibility option.');

    if (formData.feasibility === 'feasible') {
      if (!selectedDepartment) return toast.error("Please select a Department to assign.");
      if (!assignedEmployee) return toast.error("Please select an Employee to assign.");
    }

    if (formData.feasibility === 'not-feasible') {
      if (!formData.notFeasibleReason) return toast.error('Please enter the reason in Remarks.');
    }

    if (formData.feasibility === 'call-unanswered') {
      if (!formData.callUnansweredReason) return toast.error('Please enter the reason for call unanswered.');
    }

    const actionData = {};

    actionData.feasibility = formData.feasibility;

    if(actionData.feasibility === 'feasible') {
      actionData.assignedTo = assignedEmployee;
      actionData.feasibleReason = formData.feasibleReason;
    } else if(actionData.feasibility === 'not-feasible') {
      actionData.remark = formData.notFeasibleReason;
    } else if(actionData.feasibility === 'call-unanswered') {
      actionData.remark = formData.callUnansweredReason;
      actionData.callHistory = callHistoryData;
    }

    onUpdate(selectedLead._id, actionData);
    onClose();
  };

  // Function to handle call attempts
  const handleCallAttempt = (day, attempt) => {
    // Check if this specific call attempt already exists
    const existingCallIndex = callHistoryData.findIndex(
      call => call.day === day && call.attempt === attempt
    );
    
    let updatedCallHistory = [...callHistoryData];
    
    if (existingCallIndex === -1) {
      // Add new call attempt
      updatedCallHistory.push({
        day,
        attempt,
        date: new Date(),
        status: 'attempted',
        remarks: '',
        attemptedBy: currentUser._id
      });
    } else {
      // Update existing call attempt
      updatedCallHistory[existingCallIndex] = {
        ...updatedCallHistory[existingCallIndex],
        date: new Date(),
        status: 'attempted',
        attemptedBy: currentUser._id
      };
    }
    
    setCallHistoryData(updatedCallHistory);
    
    // Check if this was the 9th call (3 days × 3 attempts)
    const uniqueDays = [...new Set(updatedCallHistory.map(call => call.day))];
    if (updatedCallHistory.length >= 9 || uniqueDays.length >= 3) {
      // Automatically mark as call-unanswered after 9 total attempts or 3 days
      toast.info('Lead will be marked as Call Unanswered (3 days completed)');
      setFormData(prev => ({
        ...prev,
        feasibility: 'call-unanswered',
        callUnansweredReason: 'Automatically marked after 3 days of call attempts'
      }));
    } else {
      toast.success(`Call attempt ${attempt} recorded for Day ${day}`);
    }
  };

  // Function to check if a specific call attempt has been made
  const isCallAttemptMade = (day, attempt) => {
    return callHistoryData.some(
      call => call.day === day && call.attempt === attempt
    );
  };

  // Function to get the current day of attempts
  const getCurrentDay = () => {
    if (!callHistoryData || callHistoryData.length === 0) return 1;
    const uniqueDays = [...new Set(callHistoryData.map(call => call.day))];
    const maxDay = Math.max(...uniqueDays);
    
    // Check if current day has 3 attempts already
    const currentDayCalls = callHistoryData.filter(call => call.day === maxDay);
    if (currentDayCalls.length >= 3) {
      return maxDay + 1;
    }
    return maxDay;
  };

  // Display call attempts summary
  const displayCallAttempts = () => {
    if (callHistoryData && callHistoryData.length > 0) {
      const uniqueDays = [...new Set(callHistoryData.map(call => call.day))];
      return (
        <div className="alert alert-info mt-3">
          <i className="fa-solid fa-info-circle me-2"></i>
          <strong>Call History:</strong> {callHistoryData.length} total call(s) across {uniqueDays.length} day(s)
          {uniqueDays.length >= 3 && callHistoryData.length >= 9 && 
            <span className="text-danger fw-bold"> - Eligible for Call Unanswered status</span>
          }
        </div>
      );
    }
    return null;
  };

  // Display call attempt buttons
  const displayCallButtons = () => {
    const currentDay = getCurrentDay();
    const maxDays = 3;
    
    // Don't show buttons if already reached 3 days and 9 calls
    const uniqueDays = [...new Set(callHistoryData.map(call => call.day))];
    if (uniqueDays.length >= 3 && callHistoryData.length >= 9) {
      return (
        <div className="alert alert-warning mt-3">
          <i className="fa-solid fa-exclamation-triangle me-2"></i>
          <strong>Maximum call attempts reached (3 days, 9 calls total).</strong> 
          Please mark this lead as Call Unanswered.
        </div>
      );
    }
    
    return (
      <div className="mt-3">
        <h6 className="fw-bold">Record Call Attempts</h6>
        <p className="text-muted small">
          Click buttons to record call attempts. Maximum 3 attempts per day for 3 days (9 total calls).
        </p>
        
        {[...Array(Math.min(maxDays, currentDay))].map((_, dayIndex) => {
          const day = dayIndex + 1;
          const maxAttempts = 3;
          
          return (
            <div key={day} className="mb-3 border p-3 rounded">
              <h6 className="fw-bold text-primary mb-2">
                <i className="fa-solid fa-calendar-day me-2"></i>
                Day {day}
              </h6>
              <div className="d-flex gap-2 flex-wrap">
                {[...Array(maxAttempts)].map((_, attemptIndex) => {
                  const attempt = attemptIndex + 1;
                  const isMade = isCallAttemptMade(day, attempt);
                  
                  return (
                    <button
                      key={attempt}
                      type="button"
                      className={`btn btn-sm ${isMade ? 'btn-success' : 'btn-outline-primary'}`}
                      onClick={() => handleCallAttempt(day, attempt)}
                      disabled={isMade}
                      style={{ minWidth: '100px' }}
                    >
                      {isMade ? (
                        <>
                          <i className="fa-solid fa-check me-1"></i>
                          Attempt {attempt} ✓
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-phone me-1"></i>
                          Attempt {attempt}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Display call history table
  const displayCallHistory = () => {
    if (!callHistoryData || callHistoryData.length === 0) {
      return (
        <div className="alert alert-secondary mt-3">
          <i className="fa-solid fa-info-circle me-2"></i>
          No call attempts recorded yet.
        </div>
      );
    }
    
    // Group calls by day
    const callsByDay = {};
    callHistoryData.forEach(call => {
      if (!callsByDay[call.day]) {
        callsByDay[call.day] = [];
      }
      callsByDay[call.day].push(call);
    });
    
    return (
      <div className="mt-3">
        <h6 className="fw-bold mb-3">
          <i className="fa-solid fa-history me-2"></i>
          Call Attempt History
        </h6>
        <div className="table-responsive">
          <table className="table table-sm table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th style={{ width: '80px' }}>Day</th>
                <th style={{ width: '100px' }}>Attempt #</th>
                <th>Date & Time</th>
                <th style={{ width: '100px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(callsByDay).sort((a, b) => a - b).map(day => (
                callsByDay[day].sort((a, b) => a.attempt - b.attempt).map((call, index) => (
                  <tr key={`${day}-${call.attempt}`}>
                    <td className="fw-bold">Day {day}</td>
                    <td className="text-center">#{call.attempt}</td>
                    <td>
                      {new Date(call.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <span className={`badge ${call.status === 'answered' ? 'bg-success' : 'bg-warning'}`}>
                        {call.status === 'answered' ? 'Answered' : 'Attempted'}
                      </span>
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-muted small mt-2">
          <strong>Total Calls:</strong> {callHistoryData.length} | 
          <strong className="ms-2">Days:</strong> {Object.keys(callsByDay).length}
        </div>
      </div>
    );
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl" style={{ width: "900px", maxWidth: "900px" }}>
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0 border-0">
              <h5 className="card-title fw-bold">
                <i className="fa-solid fa-user-plus me-2"></i>
                Assign Lead
              </h5>
              <button type="button" onClick={onClose} className="btn-close" aria-label="Close"></button>
            </div>

            <div className="modal-body">
              <div className="row g-3">
                {/* Feasibility Selection */}
                <div className="col-12 mb-2">
                  <label className="form-label fw-bold">
                    Feasibility Status <RequiredStar />
                  </label>
                  <div className="d-flex gap-4 flex-wrap">
                    <div className="form-check">
                      <input 
                        className="form-check-input" 
                        type="radio" 
                        name="feasibility" 
                        id="feasible" 
                        value="feasible" 
                        onChange={handleChange} 
                        checked={formData.feasibility === 'feasible'} 
                      />
                      <label className="form-check-label" htmlFor="feasible">
                        <i className="fa-solid fa-check-circle text-success me-1"></i>
                        Feasible & Assign
                      </label>
                    </div>
                    <div className="form-check">
                      <input 
                        className="form-check-input" 
                        type="radio" 
                        name="feasibility" 
                        id="notFeasible" 
                        value="not-feasible" 
                        onChange={handleChange} 
                        checked={formData.feasibility === 'not-feasible'} 
                      />
                      <label className="form-check-label" htmlFor="notFeasible">
                        <i className="fa-solid fa-times-circle text-danger me-1"></i>
                        Not Feasible
                      </label>
                    </div>
                    <div className="form-check">
                      <input 
                        className="form-check-input" 
                        type="radio" 
                        name="feasibility" 
                        id="callUnanswered" 
                        value="call-unanswered" 
                        onChange={handleChange} 
                        checked={formData.feasibility === 'call-unanswered'} 
                      />
                      <label className="form-check-label" htmlFor="callUnanswered">
                        <i className="fa-solid fa-phone-slash text-warning me-1"></i>
                        Call Unanswered
                      </label>
                    </div>
                  </div>
                </div>

                {/* Call History Display */}
                {displayCallAttempts()}
                {displayCallHistory()}

                {/* Conditional Form Sections */}
                <div className="col-12 mt-3">
                  {/* Feasible Section */}
                  <div className={formData.feasibility === 'feasible' ? 'row' : 'd-none'}>
                    <div className="col-12 col-lg-6 mt-2">
                      <label htmlFor="department" className="form-label label_text">
                        Assigned to Department <RequiredStar />
                      </label>
                      <Select
                        id="department"
                        options={departments.map(dept => ({ value: dept._id, label: dept.name }))}
                        value={selectedDepartment}
                        onChange={(selectedOption) => {
                          setSelectedDepartment(selectedOption);
                          setAssignedEmployee(null);
                          setEmployeeOptions([]);
                        }}
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
                    <div className="col-12 col-lg-6 mt-2">
                      <label htmlFor="employee" className="form-label label_text">
                        Assigned to Employee <RequiredStar />
                      </label>
                      <Select
                        id="employee"
                        options={employeeOptions}
                        isClearable
                        isLoading={loading}
                        onChange={(selectedOption) => {
                          setAssignedEmployee(selectedOption ? selectedOption.value : null);
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
                        value={assignedEmployee ? employeeOptions.find(opt => opt.value === assignedEmployee) : null}
                        placeholder={loading ? "Loading employees..." : "Select Employee..."}
                        noOptionsMessage={() => selectedDepartment ? "No employees found" : "Select a department first"}
                        isDisabled={!selectedDepartment || loading}
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
                    <div className="col-12 mt-3">
                      <label htmlFor="feasibleReason" className="form-label fw-bold">Remarks</label>
                      <textarea
                        className="form-control rounded-0"
                        id="feasibleReason"
                        name="feasibleReason"
                        rows="2"
                        placeholder="Enter any optional remarks..."
                        maxLength={200}
                        value={formData.feasibleReason}
                        onChange={handleChange}
                      ></textarea>
                    </div>
                  </div>

                  {/* Not Feasible Section */}
                  <div className={formData.feasibility === 'not-feasible' ? 'row' : 'd-none'}>
                    <div className="col-12">
                      <label htmlFor="notFeasibleReason" className="form-label fw-bold">
                        Remarks <RequiredStar />
                      </label>
                      <textarea
                        className="form-control rounded-0"
                        id="notFeasibleReason"
                        name="notFeasibleReason"
                        rows="4"
                        placeholder="Enter the detailed reason for non-feasibility..."
                        maxLength={200}
                        value={formData.notFeasibleReason}
                        onChange={handleChange}
                      ></textarea>
                    </div>
                  </div>

                  {/* Call Unanswered Section */}
                  <div className={formData.feasibility === 'call-unanswered' ? 'row' : 'd-none'}>
                    <div className="col-12 mb-3">
                      <label htmlFor="callUnansweredReason" className="form-label fw-bold">
                        Remarks <RequiredStar />
                      </label>
                      <textarea
                        className="form-control rounded-0"
                        id="callUnansweredReason"
                        name="callUnansweredReason"
                        rows="4"
                        placeholder="Enter the detailed reason for call unanswered..."
                        maxLength={200}
                        value={formData.callUnansweredReason}
                        onChange={handleChange}
                      ></textarea>
                    </div>
                    {displayCallButtons()}
                  </div>
                </div>
              </div>
            </div>  

            <div className="modal-footer border-0 justify-content-start">
              <button type="submit" className="btn addbtn rounded-0 add_button px-4">
                <i className="fa-solid fa-check me-2"></i>
                Submit
              </button>
              <button type="button" onClick={onClose} className="btn addbtn rounded-0 Cancel_button px-4">
                <i className="fa-solid fa-times me-2"></i>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignMarketingLeadPopUp;