import React, { useState, useEffect, useCallback } from 'react';
import toast from "react-hot-toast";
import Select from "react-select";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getDepartment } from "../../../../../hooks/useDepartment";
import { getEmployee } from "../../../../../hooks/useEmployees";
import { sendNotification } from "../../../../../hooks/useNotification";

const PAGE_SIZE = 10;

const AssignMarketingLeadPopUp = ({ selectedLead, onUpdate, onClose }) => {
  const [formData, setFormData] = useState({
    feasibility: '',
    notFeasibleReason: '',
    feasibleReason: '', 
    callUnansweredReason: '', // New field for call unanswered reason
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

  useEffect(() => {
    console.log('Employee options updated:', employeeOptions);
  }, [employeeOptions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'feasibility') {
      setFormData({
        feasibility: value,
        notFeasibleReason: '',
        feasibleReason: '',
        callUnansweredReason: '', // Reset call unanswered reason
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
    }

    onUpdate(selectedLead._id, actionData);
    onClose();
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-lg" style={{ width: "800px", maxWidth: "800px" }}>
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Assign Lead</h5>
              <button type="button" onClick={onClose} className="btn-close" aria-label="Close"></button>
            </div>

            <div className="modal-body">
              <div className="row g-3">
                <div className="col-12 mb-2 mt-2">
                  <label className="form-label fw-bold">Feasibility <RequiredStar /></label>
                  <div className="d-flex gap-4">
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="feasibility" id="feasible" value="feasible" 
                      onChange={handleChange} checked={formData.feasibility === 'feasible'} />
                      <label className="form-check-label" htmlFor="feasible">Feasible & Assign</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="feasibility" id="notFeasible" value="not-feasible" 
                      onChange={handleChange} checked={formData.feasibility === 'not-feasible'} />
                      <label className="form-check-label" htmlFor="notFeasible">Not Feasible</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="feasibility" id="callUnanswered" value="call-unanswered" 
                      onChange={handleChange} checked={formData.feasibility === 'call-unanswered'} />
                      <label className="form-check-label" htmlFor="callUnanswered">Call Unanswered</label>
                    </div>
                  </div>
                </div>

                <div className="col-12 mt-2" style={{ minHeight: "180px" }}>
                  <div className={formData.feasibility === 'feasible' ? 'row' : 'd-none'}>
               <div className="col-12 col-lg-6 mt-2">
               <label htmlFor="department" className="form-label label_text">Assigned to Department <RequiredStar /></label>
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
          <label htmlFor="employee" className="form-label label_text">Assigned to Employee <RequiredStar /></label>
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

                  <div className={formData.feasibility === 'not-feasible' ? 'row' : 'd-none'}>
                    <div className="col-12 mt-3">
                      <label htmlFor="notFeasibleReason" className="form-label fw-bold">Remarks <RequiredStar /></label>
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

                  <div className={formData.feasibility === 'call-unanswered' ? 'row' : 'd-none'}>
                    <div className="col-12 mt-3">
                      <label htmlFor="callUnansweredReason" className="form-label fw-bold">Remarks <RequiredStar /></label>
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
                  </div>
                </div>
              </div>
            </div>  

            <div className="modal-footer border-0 justify-content-start">
              <button type="submit" className="btn addbtn rounded-0 add_button px-4">Submit</button>
              <button type="button" onClick={onClose} className="btn addbtn rounded-0 Cancel_button px-4">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignMarketingLeadPopUp;