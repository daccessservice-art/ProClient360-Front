import React, { useState, useEffect, useCallback } from 'react';
import toast from "react-hot-toast";
import Select from "react-select";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getDepartment } from "../../../../../hooks/useDepartment";
import { getEmployee } from "../../../../../hooks/useEmployees";
import axios from 'axios';

const PAGE_SIZE = 10;
const DELAY_BETWEEN_ATTEMPTS_MS = 2 * 60 * 1000; // 2 minutes in milliseconds

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingCall, setSavingCall] = useState(false);
  const [firstCallDate, setFirstCallDate] = useState(null);

  // Timer state for countdown
  const [, setCurrentTime] = useState(new Date());

  // API endpoint
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5443';

  // Debug: Log API URL on component mount
  useEffect(() => {
    console.log('=== API CONFIGURATION ===');
    console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('Final API_URL:', API_URL);
    console.log('Token present:', !!localStorage.getItem('token'));
    console.log('========================');
  }, [API_URL]);

  // Update current time every second for countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Function to save a single call attempt
  const saveCallAttemptToDatabase = async (leadId, day, attempt) => {
    try {
      setSavingCall(true);
      
      const apiEndpoint = `${API_URL}/api/leads/call-attempt/${leadId}`;
      
      console.log('=== SAVING CALL ATTEMPT ===');
      console.log('API_URL:', API_URL);
      console.log('Full endpoint:', apiEndpoint);
      console.log('Lead ID:', leadId);
      console.log('Day:', day, 'Attempt:', attempt);
      
      const newCall = {
        day,
        attempt,
        date: new Date(),
        status: 'attempted',
        remarks: '',
        attemptedBy: currentUser._id
      };
      
      console.log('Request body:', newCall);
      
      const response = await axios.post(apiEndpoint, newCall, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('API Response Status:', response.status);
      console.log('API Response Data:', response.data);
      
      if (response.data && response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to save call attempt');
      }
    } catch (error) {
      console.error('=== ERROR SAVING CALL ATTEMPT ===');
      
      if (error.response) {
        console.error('Error Response Status:', error.response.status);
        console.error('Error Response Data:', error.response.data);
        
        if (error.response.status === 404) {
          toast.error('❌ API endpoint not found!');
        } else if (error.response.status === 401) {
          toast.error('❌ Authentication failed. Please log in again.');
        } else if (error.response.status === 403) {
          toast.error('❌ Permission denied. Contact administrator.');
        } else {
          const errorMessage = error.response.data?.error || error.response.data?.message || 'Failed to save call attempt.';
          toast.error(errorMessage);
        }
      } else if (error.request) {
        console.error('Error Request:', error.request);
        toast.error('❌ No response from server. Check your connection.');
      } else {
        console.error('Error Message:', error.message);
        toast.error('Error: ' + error.message);
      }
      
      return { success: false };
    } finally {
      setSavingCall(false);
    }
  };

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
            toast('No employees found for this department');
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
    if (selectedLead && selectedLead.callHistory && selectedLead.callHistory.length > 0) {
      const sortedHistory = [...selectedLead.callHistory].sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.attempt - b.attempt;
      });
      setCallHistoryData(sortedHistory);
      
      // Set first call date from lead
      if (selectedLead.firstCallDate) {
        setFirstCallDate(new Date(selectedLead.firstCallDate));
      } else if (sortedHistory.length > 0) {
        setFirstCallDate(new Date(sortedHistory[0].date));
      }
      
      console.log('Call history loaded from lead:', sortedHistory);
      console.log('First call date:', selectedLead.firstCallDate);
    } else {
      setCallHistoryData([]);
      setFirstCallDate(null);
      console.log('No call history found in lead');
    }
    setRefreshKey(prev => prev + 1);
  }, [selectedLead]);

  // Set initial form data based on selected lead
  useEffect(() => {
    if (selectedLead) {
      setFormData({
        feasibility: selectedLead.feasibility === 'none' ? '' : (selectedLead.feasibility || ''),
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

    if (!formData.feasibility) {
      toast.error('Please select a Feasibility Status!');
      return;
    }

    // Validation for Feasible & Assign
    if (formData.feasibility === 'feasible') {
      if (!selectedDepartment) {
        toast.error("Please select a Department to assign.");
        return;
      }
      if (!assignedEmployee) {
        toast.error("Please select an Employee to assign.");
        return;
      }
    }

    // Validation for Not Feasible
    if (formData.feasibility === 'not-feasible') {
      if (!formData.notFeasibleReason.trim()) {
        toast.error('Please enter the reason in Remarks.');
        return;
      }
    }

    // Validation for Call Unanswered
    if (formData.feasibility === 'call-unanswered') {
      if (!formData.callUnansweredReason.trim()) {
        toast.error('Please enter the reason for call unanswered.');
        return;
      }
      
      // Check if all 9 calls (3 days x 3 attempts) are completed
      const uniqueDays = [...new Set(callHistoryData.map(call => call.day))];
      if (callHistoryData.length < 9 || uniqueDays.length < 3) {
        toast.error('Please complete all 3 days (9 total calls) before marking as Call Unanswered.');
        return;
      }
    }

    // Prepare action data
    const actionData = {
      feasibility: formData.feasibility
    };

    // Add specific data based on feasibility type
    if (actionData.feasibility === 'feasible') {
      actionData.assignedTo = assignedEmployee;
      actionData.remark = formData.feasibleReason;
    } else if (actionData.feasibility === 'not-feasible') {
      actionData.remark = formData.notFeasibleReason;
    } else if (actionData.feasibility === 'call-unanswered') {
      actionData.remark = formData.callUnansweredReason;
      // ✅ FIX: Do NOT send callHistory here.
      // All 9 calls were already individually saved to the DB via /call-attempt/:id route
      // when the user clicked each attempt button. Sending the array again causes:
      // "lead validation failed: callHistory.9.attempt: Path `attempt` is required"
    }

    console.log('Submitting form with data:', actionData);
    
    onUpdate(selectedLead._id, actionData);
    onClose();
  };

  // Helper function to get days difference
  const getDaysDifference = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Function to get which day should be shown based on DATE
  const getCurrentDayBasedOnDate = () => {
    if (!firstCallDate) {
      return 1;
    }

    const today = new Date();
    const daysSinceFirstCall = getDaysDifference(firstCallDate, today);

    console.log('First call date:', firstCallDate);
    console.log('Today:', today);
    console.log('Days since first call:', daysSinceFirstCall);

    if (daysSinceFirstCall === 0) {
      return 1;
    } else if (daysSinceFirstCall === 1) {
      return 2;
    } else if (daysSinceFirstCall >= 2) {
      return 3;
    }

    return 1;
  };

  // Function to get time remaining until next attempt is available
  const getTimeUntilNextAttempt = (day, attempt) => {
    if (attempt === 1) return 0;
    
    const previousAttempt = attempt - 1;
    const previousCall = callHistoryData.find(
      call => call.day === day && call.attempt === previousAttempt
    );
    
    if (!previousCall) return Infinity;
    
    const previousCallTime = new Date(previousCall.date).getTime();
    const now = new Date().getTime();
    const timeSincePrevious = now - previousCallTime;
    const timeRemaining = DELAY_BETWEEN_ATTEMPTS_MS - timeSincePrevious;
    
    return Math.max(0, timeRemaining);
  };

  // Format milliseconds to MM:SS
  const formatTimeRemaining = (ms) => {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Function to handle call attempts with TIME validation
  const handleCallAttempt = async (day, attempt) => {
    const existingCallIndex = callHistoryData.findIndex(
      call => call.day === day && call.attempt === attempt
    );
    
    if (existingCallIndex !== -1) {
      toast.error(`Day ${day} - Attempt ${attempt} is already recorded`);
      return;
    }

    const currentDayBasedOnDate = getCurrentDayBasedOnDate();
    if (day !== currentDayBasedOnDate) {
      toast.error(`You can only make calls for Day ${currentDayBasedOnDate} today. Please try again tomorrow for Day ${day}.`);
      return;
    }

    if (attempt > 1) {
      const timeRemaining = getTimeUntilNextAttempt(day, attempt);
      if (timeRemaining > 0) {
        const formattedTime = formatTimeRemaining(timeRemaining);
        toast.error(`⏳ Please wait ${formattedTime} before making Attempt ${attempt}`);
        return;
      }
    }

    if (attempt > 1) {
      const previousAttempt = attempt - 1;
      const previousAttemptExists = callHistoryData.some(
        call => call.day === day && call.attempt === previousAttempt
      );
      
      if (!previousAttemptExists) {
        toast.error(`Please complete Attempt ${previousAttempt} first for Day ${day}`);
        return;
      }
    }

    if (day > 1) {
      const previousDay = day - 1;
      const previousDayCalls = callHistoryData.filter(call => call.day === previousDay);
      
      if (previousDayCalls.length < 3) {
        toast.error(`Please complete all 3 attempts of Day ${previousDay} first`);
        return;
      }
    }
    
    const result = await saveCallAttemptToDatabase(selectedLead._id, day, attempt);
    
    if (result.success) {
      const newCall = {
        day,
        attempt,
        date: new Date(),
        status: 'attempted',
        remarks: '',
        attemptedBy: currentUser._id
      };
      
      const updatedCallHistory = [...callHistoryData, newCall];
      
      updatedCallHistory.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.attempt - b.attempt;
      });
      
      setCallHistoryData(updatedCallHistory);
      
      if (!firstCallDate && day === 1 && attempt === 1) {
        setFirstCallDate(new Date());
      }
      
      setRefreshKey(prev => prev + 1);
      
      toast.success(`Day ${day} - Attempt ${attempt} recorded successfully!`);
      
      if (attempt < 3) {
        toast.success(`⏳ Next attempt (Attempt ${attempt + 1}) will be available in 2 minutes`, {
          duration: 4000,
        });
      }
      
      const dayCallsCount = updatedCallHistory.filter(call => call.day === day).length;
      if (dayCallsCount === 3) {
        if (day < 3) {
          toast.success(`Day ${day} completed! Day ${day + 1} will be available tomorrow.`, {
            duration: 5000,
          });
        } else {
          toast('All 3 days completed! You can now select Call Unanswered and submit.', {
            icon: '✅',
            duration: 5000,
          });
        }
      }
    }
  };

  // Function to check if a specific call attempt has been made
  const isCallAttemptMade = (day, attempt) => {
    return callHistoryData.some(
      call => call.day === day && call.attempt === attempt
    );
  };

  // Function to check if a button should be disabled with TIME validation
  const isButtonDisabled = (day, attempt) => {
    const currentDayBasedOnDate = getCurrentDayBasedOnDate();
    if (day !== currentDayBasedOnDate) {
      return true;
    }

    if (isCallAttemptMade(day, attempt)) {
      return true;
    }

    if (attempt > 1) {
      const timeRemaining = getTimeUntilNextAttempt(day, attempt);
      if (timeRemaining > 0) {
        return true;
      }
    }

    if (attempt > 1) {
      const previousAttempt = attempt - 1;
      const previousAttemptExists = callHistoryData.some(
        call => call.day === day && call.attempt === previousAttempt
      );
      
      if (!previousAttemptExists) {
        return true;
      }
    }

    if (day > 1) {
      const previousDay = day - 1;
      const previousDayCalls = callHistoryData.filter(call => call.day === previousDay);
      
      if (previousDayCalls.length < 3) {
        return true;
      }
    }

    return false;
  };

  // Display call attempts summary
  const displayCallAttempts = () => {
    if (callHistoryData && callHistoryData.length > 0) {
      const uniqueDays = [...new Set(callHistoryData.map(call => call.day))];
      const isComplete = uniqueDays.length === 3 && callHistoryData.length === 9;
      
      return (
        <div className={`alert ${isComplete ? 'alert-success' : 'alert-info'} mt-3 mb-0`} key={`summary-${refreshKey}`}>
          <i className={`fa-solid ${isComplete ? 'fa-check-circle' : 'fa-info-circle'} me-2`}></i>
          <strong>Call Summary:</strong> {callHistoryData.length} attempt(s) across {uniqueDays.length} day(s)
          {isComplete && 
            <span className="fw-bold ms-2">- All attempts completed ✓</span>
          }
        </div>
      );
    }
    return null;
  };

  // Display call attempt buttons with countdown timer
  const displayCallButtons = () => {
    const uniqueDays = [...new Set(callHistoryData.map(call => call.day))];
    const allDaysCompleted = uniqueDays.length === 3 && callHistoryData.length === 9;
    
    if (allDaysCompleted) {
      return (
        <div className="alert alert-success mt-3" key={`buttons-complete-${refreshKey}`}>
          <i className="fa-solid fa-check-circle me-2"></i>
          <strong>All call attempts completed!</strong> 
          <div className="mt-2">
            <small className="d-block">✓ Day 1: 3/3 attempts completed</small>
            <small className="d-block">✓ Day 2: 3/3 attempts completed</small>
            <small className="d-block">✓ Day 3: 3/3 attempts completed</small>
            <small className="d-block text-muted mt-2">
              Total: 9 calls completed across 3 days
            </small>
          </div>
        </div>
      );
    }

    const currentDayBasedOnDate = getCurrentDayBasedOnDate();
    
    return (
      <div className="mt-3" key={`buttons-${refreshKey}`}>
        <h6 className="fw-bold text-primary">
          <i className="fa-solid fa-phone-volume me-2"></i>
          Record Call Attempts
        </h6>
        <p className="text-muted small mb-3">
          <i className="fa-solid fa-info-circle me-1"></i>
          <strong>Today you can only make calls for Day {currentDayBasedOnDate}.</strong> Wait 2 minutes between attempts.
        </p>
        
        {[1, 2, 3].map((day) => {
          const maxAttempts = 3;
          const dayCallsCount = callHistoryData.filter(call => call.day === day).length;
          const isDayComplete = dayCallsCount === 3;
          const isCurrentDay = day === currentDayBasedOnDate;
          const isPastDay = day < currentDayBasedOnDate;
          const isFutureDay = day > currentDayBasedOnDate;
          
          return (
            <div 
              key={`day-${day}-${refreshKey}`} 
              className={`mb-3 p-3 border rounded ${
                isDayComplete ? 'bg-light-success' : 
                isCurrentDay ? 'bg-light' : 
                'bg-secondary bg-opacity-10'
              }`}
              style={{ opacity: isFutureDay ? 0.5 : 1 }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0" style={{ 
                  color: isDayComplete ? '#28a745' : 
                         isCurrentDay ? '#007bff' : 
                         '#6c757d' 
                }}>
                  <i className={`fa-solid ${
                    isDayComplete ? 'fa-check-circle' : 
                    isCurrentDay ? 'fa-calendar-day' : 
                    isFutureDay ? 'fa-lock' :
                    'fa-calendar-check'
                  } me-2`}></i>
                  Day {day}
                  {isCurrentDay && <span className="badge bg-primary ms-2">Today</span>}
                  {isFutureDay && <span className="badge bg-secondary ms-2">Locked</span>}
                  {isPastDay && !isDayComplete && <span className="badge bg-warning ms-2">Missed</span>}
                </h6>
                <span className={`badge ${
                  isDayComplete ? 'bg-success' : 
                  isCurrentDay ? 'bg-primary' : 
                  'bg-secondary'
                }`}>
                  {dayCallsCount}/3 completed
                </span>
              </div>
              
              {isFutureDay && (
                <div className="alert alert-secondary mb-2 py-2">
                  <small>
                    <i className="fa-solid fa-calendar-days me-1"></i>
                    This day will be available tomorrow
                  </small>
                </div>
              )}
              
              {isPastDay && !isDayComplete && (
                <div className="alert alert-warning mb-2 py-2">
                  <small>
                    <i className="fa-solid fa-exclamation-triangle me-1"></i>
                    This day was not completed
                  </small>
                </div>
              )}
              
              <div className="d-flex gap-2 flex-wrap">
                {[...Array(maxAttempts)].map((_, attemptIndex) => {
                  const attempt = attemptIndex + 1;
                  const isMade = isCallAttemptMade(day, attempt);
                  const isDisabled = isButtonDisabled(day, attempt);
                  const timeRemaining = attempt > 1 ? getTimeUntilNextAttempt(day, attempt) : 0;
                  const showTimer = isCurrentDay && !isMade && timeRemaining > 0 && attempt > 1;
                  
                  return (
                    <div key={`attempt-${day}-${attempt}-${refreshKey}`} className="position-relative">
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          isMade 
                            ? 'btn-success' 
                            : isDisabled 
                            ? 'btn-secondary' 
                            : 'btn-primary'
                        }`}
                        onClick={() => handleCallAttempt(day, attempt)}
                        disabled={isDisabled || savingCall}
                        style={{ minWidth: '120px' }}
                      >
                        {isMade ? (
                          <>
                            <i className="fa-solid fa-check-circle me-1"></i>
                            Attempt {attempt} ✓
                          </>
                        ) : showTimer ? (
                          <>
                            <i className="fa-solid fa-clock me-1"></i>
                            {formatTimeRemaining(timeRemaining)}
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-phone me-1"></i>
                            Attempt {attempt}
                          </>
                        )}
                      </button>
                      {showTimer && (
                        <small className="text-muted d-block text-center mt-1" style={{ fontSize: '0.7rem' }}>
                          Wait {formatTimeRemaining(timeRemaining)}
                        </small>
                      )}
                    </div>
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
        <div className="alert alert-secondary mt-3" key={`history-empty-${refreshKey}`}>
          <i className="fa-solid fa-history me-2"></i>
          No call attempts recorded yet. Start with Day 1, Attempt 1.
        </div>
      );
    }
    
    const callsByDay = {};
    callHistoryData.forEach(call => {
      if (!callsByDay[call.day]) {
        callsByDay[call.day] = [];
      }
      callsByDay[call.day].push(call);
    });
    
    return (
      <div className="mt-4" key={`history-${refreshKey}`}>
        <h6 className="fw-bold text-success mb-3">
          <i className="fa-solid fa-history me-2"></i>
          Call Attempt History
        </h6>
        <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table className="table table-sm table-bordered table-hover mb-0">
            <thead className="table-dark" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ width: '15%' }}>Day</th>
                <th style={{ width: '15%' }}>Attempt</th>
                <th style={{ width: '50%' }}>Date & Time</th>
                <th style={{ width: '20%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(callsByDay).sort((a, b) => a - b).map(day => (
                callsByDay[day].sort((a, b) => a.attempt - b.attempt).map((call, index) => (
                  <tr key={`${day}-${call.attempt}-${index}-${refreshKey}`}>
                    <td className="fw-bold">
                      <i className="fa-solid fa-calendar me-1"></i>
                      Day {day}
                    </td>
                    <td className="text-center fw-bold">#{call.attempt}</td>
                    <td>
                      <i className="fa-solid fa-clock me-1"></i>
                      {new Date(call.date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <span className={`badge ${call.status === 'answered' ? 'bg-success' : 'bg-warning text-dark'}`}>
                        <i className={`fa-solid ${call.status === 'answered' ? 'fa-check' : 'fa-phone'} me-1`}></i>
                        {call.status === 'answered' ? 'Answered' : 'Attempted'}
                      </span>
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-light p-2 mt-2 rounded border">
          <div className="row text-center">
            <div className="col-6">
              <small className="text-muted">Total Calls:</small>
              <strong className="ms-2 text-primary">{callHistoryData.length}/9</strong>
            </div>
            <div className="col-6">
              <small className="text-muted">Days Completed:</small>
              <strong className="ms-2 text-primary">{Object.keys(callsByDay).length}/3</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl modal-dialog-centered" style={{ width: "900px", maxWidth: "95%", maxHeight: '90vh' }}>
        <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="modal-header border-bottom bg-white" style={{ flexShrink: 0, zIndex: 1000 }}>
              <h5 className="modal-title fw-bold">
                <i className="fa-solid fa-user-plus me-2 text-primary"></i>
                Assign Marketing Lead
              </h5>
              <button type="button" onClick={onClose} className="btn-close" aria-label="Close"></button>
            </div>

            <div className="modal-body" style={{ flexGrow: 1, padding: '1.5rem' }}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label fw-bold text-dark">
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

                {displayCallAttempts()}

                <div className="col-12">
                  {formData.feasibility === 'feasible' && (
                    <div className="row">
                      <div className="col-12 col-lg-6 mt-2">
                        <label htmlFor="department" className="form-label fw-bold">
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
                              borderRadius: 4,
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
                        <label htmlFor="employee" className="form-label fw-bold">
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
                              borderRadius: 4,
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
                        <label htmlFor="feasibleReason" className="form-label fw-bold">Remarks (Optional)</label>
                        <textarea
                          className="form-control"
                          id="feasibleReason"
                          name="feasibleReason"
                          rows="3"
                          placeholder="Enter any optional remarks..."
                          maxLength={200}
                          value={formData.feasibleReason}
                          onChange={handleChange}
                          style={{ borderRadius: '4px' }}
                        ></textarea>
                        <small className="text-muted">{formData.feasibleReason.length}/200 characters</small>
                      </div>
                    </div>
                  )}

                  {formData.feasibility === 'not-feasible' && (
                    <div className="row">
                      <div className="col-12">
                        <label htmlFor="notFeasibleReason" className="form-label fw-bold">
                          Remarks <RequiredStar />
                        </label>
                        <textarea
                          className="form-control"
                          id="notFeasibleReason"
                          name="notFeasibleReason"
                          rows="4"
                          placeholder="Enter the detailed reason for non-feasibility..."
                          maxLength={200}
                          value={formData.notFeasibleReason}
                          onChange={handleChange}
                          style={{ borderRadius: '4px' }}
                        ></textarea>
                        <small className="text-muted">{formData.notFeasibleReason.length}/200 characters</small>
                      </div>
                    </div>
                  )}

                  {formData.feasibility === 'call-unanswered' && (
                    <div className="row">
                      <div className="col-12 mb-3">
                        <label htmlFor="callUnansweredReason" className="form-label fw-bold">
                          Remarks <RequiredStar />
                        </label>
                        <textarea
                          className="form-control"
                          id="callUnansweredReason"
                          name="callUnansweredReason"
                          rows="4"
                          placeholder="Enter the detailed reason for call unanswered..."
                          maxLength={200}
                          value={formData.callUnansweredReason}
                          onChange={handleChange}
                          style={{ borderRadius: '4px' }}
                        ></textarea>
                        <small className="text-muted">{formData.callUnansweredReason.length}/200 characters</small>
                      </div>
                      
                      <div className="col-12">
                        {displayCallButtons()}
                      </div>
                      
                      <div className="col-12">
                        {displayCallHistory()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>  

            <div className="modal-footer border-top bg-light" style={{ flexShrink: 0, zIndex: 1000 }}>
              <button type="submit" className="btn btn-primary px-4">
                <i className="fa-solid fa-check me-2"></i>
                Submit & Assign
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary px-4">
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