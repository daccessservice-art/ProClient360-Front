import React, { useState, useEffect, useCallback } from "react";
import { getDepartment } from "../../../../../hooks/useDepartment";
import toast from "react-hot-toast";
import Select from "react-select";
import { updateDesignation } from "../../../../../hooks/useDesignation";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const PAGE_SIZE = 10;

const UpdateDesignationPopup = ({ handleUpdate, selectedDes }) => {

  const [permissions, setPermissions] = useState([]);
  const [designation, setDesignation] = useState(selectedDes);

  // Department dropdown state
  const [deptOptions, setDeptOptions] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptPage, setDeptPage] = useState(1);
  const [deptHasMore, setDeptHasMore] = useState(true);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");

  // Fetch departments with pagination & search
  const loadDepartments = useCallback(async (page, search) => {
    if (deptLoading || !deptHasMore) return;
    setDeptLoading(true);
    const data = await getDepartment(page, PAGE_SIZE, search);

    if (data.error) {
      toast.error(data.error || 'Failed to load departments');
      setDeptLoading(false);
      return;
    }

    const newOpts = (data.departments || []).map(d => ({ value: d._id, label: d.name }));
    setDeptOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
    setDeptHasMore(newOpts.length === PAGE_SIZE);
    setDeptLoading(false);
    setDeptPage(page + 1);
  }, [deptLoading, deptHasMore]);

  // Initial & search-triggered load (reset on search)
  useEffect(() => {
    setDeptPage(1);
    setDeptHasMore(true);
    setDeptOptions([]);
    loadDepartments(1, deptSearch);
  }, [deptSearch]);

  // Set selected department when designation data is loaded
  useEffect(() => {
    if (designation?.department?._id && deptOptions.length > 0) {
      const selectedOption = deptOptions.find(opt => opt.value === designation.department._id);
      if (selectedOption) {
        setSelectedDept(selectedOption);
      }
    }
  }, [designation, deptOptions]);

  const handlePermissionChange = (permission, isChecked) => {
    setDesignation((prevDesignation) => {
      let newPermissions = [...prevDesignation.permissions];
      if (isChecked) {
        if (!newPermissions.includes(permission)) {
          newPermissions.push(permission);
        }
      } else {
        newPermissions = newPermissions.filter(p => p !== permission);
      }
      return {
        ...prevDesignation,
        permissions: newPermissions,
      };
    });
  };

  const handleInputChange = (event) => {
    event.preventDefault();
    const { name, value } = event.target;
    setDesignation((prevDesignation) => ({
      ...prevDesignation,
      [name]: value,
    }));
  };

  // Handle department selection
  const handleDepartmentChange = (selectedOption) => {
    setSelectedDept(selectedOption);
    setDesignation((prevDesignation) => ({
      ...prevDesignation,
      department: selectedOption ? selectedOption.value : null,
    }));
  };

  // Handle role addition
  const handleUpdateDesignation = async (e) => {
    e.preventDefault();
    if (!designation.name || !designation.department) {
      return toast.error("Please fill all fields");
    }
    if (designation.permissions.length === 0) {
      return toast.error("Please select at least one permission");
    }
    try {
      toast.loading("Updating Designation...")
      const data = await updateDesignation(designation);
      toast.dismiss()
      if (data.success) {
        toast.success(data.message);
        handleUpdate();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update designation");
    }
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: 'center', backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content p-3">
            <form onSubmit={handleUpdateDesignation}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  Update Designation
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
              <div className="modal-body">

                <div className="row modal_body_height">

                  <div className="col-12">
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label label_text">
                        Designation Name <RequiredStar />
                      </label>
                      <input
                        type="text"
                        placeholder="Update Designation Name...."
                        maxLength={50}
                        value={designation.name}
                        onChange={handleInputChange}
                        className="form-control rounded-0"
                        id="name"
                        name="name"
                        required
                        aria-describedby="roleNameHelp"
                      />
                    </div>
                  </div>

                  {/* Department Selection */}
                  <div className="col-12 col-lg-6 my-3">
                    <div className="mb-3">
                      <label htmlFor="Department" className="form-label label_text">
                        Department <RequiredStar />
                      </label>
                      <Select
                        value={selectedDept}
                        onChange={handleDepartmentChange}
                        onInputChange={(inputValue) => setDeptSearch(inputValue)}
                        options={deptOptions}
                        isLoading={deptLoading}
                        onMenuScrollToBottom={() => {
                          if (deptHasMore && !deptLoading) {
                            loadDepartments(deptPage, deptSearch);
                          }
                        }}
                        placeholder="Select Department..."
                        isClearable
                        menuPlacement="auto"
                        className="react-select-container"
                        classNamePrefix="react-select"
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            borderRadius: '0px',
                            border: '1px solid #ced4da',
                            '&:hover': {
                              border: '1px solid #ced4da',
                            },
                          }),
                          menu: (provided) => ({
                            ...provided,
                            zIndex: 9999,
                          }),
                        }}
                      />
                    </div>
                  </div>

                  <div className="col-10 col-lg-12">

                    <label htmlFor="permissions" className="form-label label_text">
                      Permissions
                    </label>

                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">

                        <thead>
                          <tr className="th_border">
                            <th>Form Level Details</th>
                            <th>Add</th>
                            <th>View</th>
                            <th>Update</th>
                            <th>Delete</th>
                          </tr>
                        </thead>
                        <tbody>

                          {/* EMPLOYEE */}
                          <tr>
                            <td>Employee</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createEmployee"
                                  checked={designation.permissions?.includes('createEmployee')}
                                  onChange={(e) => handlePermissionChange('createEmployee', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewEmployee"
                                  checked={designation.permissions?.includes('viewEmployee')}
                                  onChange={(e) => handlePermissionChange('viewEmployee', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateEmployee"
                                  checked={designation.permissions?.includes('updateEmployee')}
                                  onChange={(e) => handlePermissionChange('updateEmployee', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteEmployee"
                                  checked={designation.permissions?.includes('deleteEmployee')}
                                  onChange={(e) => handlePermissionChange('deleteEmployee', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* CUSTOMER */}
                          <tr>
                            <td>Customer</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createCustomer"
                                  checked={designation.permissions?.includes('createCustomer')}
                                  onChange={(e) => handlePermissionChange('createCustomer', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewCustomer"
                                  checked={designation.permissions?.includes('viewCustomer')}
                                  onChange={(e) => handlePermissionChange('viewCustomer', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateCustomer"
                                  checked={designation.permissions?.includes('updateCustomer')}
                                  onChange={(e) => handlePermissionChange('updateCustomer', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteCustomer"
                                  checked={designation.permissions?.includes('deleteCustomer')}
                                  onChange={(e) => handlePermissionChange('deleteCustomer', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* PROJECT */}
                          <tr>
                            <td>Project</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createProject"
                                  checked={designation.permissions?.includes('createProject')}
                                  onChange={(e) => handlePermissionChange('createProject', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewProject"
                                  checked={designation.permissions?.includes('viewProject')}
                                  onChange={(e) => handlePermissionChange('viewProject', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateProject"
                                  checked={designation.permissions?.includes('updateProject')}
                                  onChange={(e) => handlePermissionChange('updateProject', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteProject"
                                  checked={designation.permissions?.includes('deleteProject')}
                                  onChange={(e) => handlePermissionChange('deleteProject', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* TASK NAME */}
                          <tr>
                            <td>Task Name</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createTask"
                                  checked={designation.permissions?.includes('createTask')}
                                  onChange={(e) => handlePermissionChange('createTask', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewTask"
                                  checked={designation.permissions?.includes('viewTask')}
                                  onChange={(e) => handlePermissionChange('viewTask', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateTask"
                                  checked={designation.permissions?.includes('updateTask')}
                                  onChange={(e) => handlePermissionChange('updateTask', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteTask"
                                  checked={designation.permissions?.includes('deleteTask')}
                                  onChange={(e) => handlePermissionChange('deleteTask', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* TASK SHEET */}
                          <tr>
                            <td>Task Sheet</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createTaskSheet"
                                  checked={designation.permissions?.includes('createTaskSheet')}
                                  onChange={(e) => handlePermissionChange('createTaskSheet', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewTaskSheet"
                                  checked={designation.permissions?.includes('viewTaskSheet')}
                                  onChange={(e) => handlePermissionChange('viewTaskSheet', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateTaskSheet"
                                  checked={designation.permissions?.includes('updateTaskSheet')}
                                  onChange={(e) => handlePermissionChange('updateTaskSheet', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteTaskSheet"
                                  checked={designation.permissions?.includes('deleteTaskSheet')}
                                  onChange={(e) => handlePermissionChange('deleteTaskSheet', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* DEPARTMENT */}
                          <tr>
                            <td>Department</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createDepartment"
                                  checked={designation.permissions?.includes('createDepartment')}
                                  onChange={(e) => handlePermissionChange('createDepartment', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewDepartment"
                                  checked={designation.permissions?.includes('viewDepartment')}
                                  onChange={(e) => handlePermissionChange('viewDepartment', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateDepartment"
                                  checked={designation.permissions?.includes('updateDepartment')}
                                  onChange={(e) => handlePermissionChange('updateDepartment', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteDepartment"
                                  checked={designation.permissions?.includes('deleteDepartment')}
                                  onChange={(e) => handlePermissionChange('deleteDepartment', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* DESIGNATION */}
                          <tr>
                            <td>Designation</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createDesignation"
                                  checked={designation.permissions?.includes('createDesignation')}
                                  onChange={(e) => handlePermissionChange('createDesignation', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewDesignation"
                                  checked={designation.permissions?.includes('viewDesignation')}
                                  onChange={(e) => handlePermissionChange('viewDesignation', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateDesignation"
                                  checked={designation.permissions?.includes('updateDesignation')}
                                  onChange={(e) => handlePermissionChange('updateDesignation', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteDesignation"
                                  checked={designation.permissions?.includes('deleteDesignation')}
                                  onChange={(e) => handlePermissionChange('deleteDesignation', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* SERVICE */}
                          <tr>
                            <td>Service</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createService"
                                  checked={designation.permissions?.includes('createService')}
                                  onChange={(e) => handlePermissionChange('createService', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewService"
                                  checked={designation.permissions?.includes('viewService')}
                                  onChange={(e) => handlePermissionChange('viewService', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateService"
                                  checked={designation.permissions?.includes('updateService')}
                                  onChange={(e) => handlePermissionChange('updateService', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteService"
                                  checked={designation.permissions?.includes('deleteService')}
                                  onChange={(e) => handlePermissionChange('deleteService', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* LEADS */}
                          <tr>
                            <td>Leads</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createLead"
                                  checked={designation.permissions?.includes('createLead')}
                                  onChange={(e) => handlePermissionChange('createLead', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewLead"
                                  checked={designation.permissions?.includes('viewLead')}
                                  onChange={(e) => handlePermissionChange('viewLead', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateLead"
                                  checked={designation.permissions?.includes('updateLead')}
                                  onChange={(e) => handlePermissionChange('updateLead', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteLead"
                                  checked={designation.permissions?.includes('deleteLead')}
                                  onChange={(e) => handlePermissionChange('deleteLead', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* ANNUAL REPORT */}
                          <tr>
                            <td>Annual Report</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createAnnualReport"
                                  checked={designation.permissions?.includes('createAnnualReport')}
                                  onChange={(e) => handlePermissionChange('createAnnualReport', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewAnnualReport"
                                  checked={designation.permissions?.includes('viewAnnualReport')}
                                  onChange={(e) => handlePermissionChange('viewAnnualReport', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateAnnualReport"
                                  checked={designation.permissions?.includes('updateAnnualReport')}
                                  onChange={(e) => handlePermissionChange('updateAnnualReport', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteAnnualReport"
                                  checked={designation.permissions?.includes('deleteAnnualReport')}
                                  onChange={(e) => handlePermissionChange('deleteAnnualReport', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* ACTIVITY LOGS */}
                          <tr>
                            <td>Activity Logs</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createActivityLog"
                                  checked={designation.permissions?.includes('createActivityLog')}
                                  onChange={(e) => handlePermissionChange('createActivityLog', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewActivityLog"
                                  checked={designation.permissions?.includes('viewActivityLog')}
                                  onChange={(e) => handlePermissionChange('viewActivityLog', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateActivityLog"
                                  checked={designation.permissions?.includes('updateActivityLog')}
                                  onChange={(e) => handlePermissionChange('updateActivityLog', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteActivityLog"
                                  checked={designation.permissions?.includes('deleteActivityLog')}
                                  onChange={(e) => handlePermissionChange('deleteActivityLog', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* FEEDBACK */}
                          <tr>
                            <td>Feedback</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createFeedback"
                                  checked={designation.permissions?.includes('createFeedback')}
                                  onChange={(e) => handlePermissionChange('createFeedback', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewFeedback"
                                  checked={designation.permissions?.includes('viewFeedback')}
                                  onChange={(e) => handlePermissionChange('viewFeedback', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateFeedback"
                                  checked={designation.permissions?.includes('updateFeedback')}
                                  onChange={(e) => handlePermissionChange('updateFeedback', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteFeedback"
                                  checked={designation.permissions?.includes('deleteFeedback')}
                                  onChange={(e) => handlePermissionChange('deleteFeedback', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* MARKETING */}
                          <tr>
                            <td>Marketing</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="assignLead"
                                  checked={designation.permissions?.includes('assignLead')}
                                  onChange={(e) => handlePermissionChange('assignLead', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewMarketingDashboard"
                                  checked={designation.permissions?.includes('viewMarketingDashboard')}
                                  onChange={(e) => handlePermissionChange('viewMarketingDashboard', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateMarketing"
                                  checked={designation.permissions?.includes('updateMarketing')}
                                  onChange={(e) => handlePermissionChange('updateMarketing', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteMarketing"
                                  checked={designation.permissions?.includes('deleteMarketing')}
                                  onChange={(e) => handlePermissionChange('deleteMarketing', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* AMC */}
                          <tr>
                            <td>AMC</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createAMC"
                                  checked={designation.permissions?.includes('createAMC')}
                                  onChange={(e) => handlePermissionChange('createAMC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewAMC"
                                  checked={designation.permissions?.includes('viewAMC')}
                                  onChange={(e) => handlePermissionChange('viewAMC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateAMC"
                                  checked={designation.permissions?.includes('updateAMC')}
                                  onChange={(e) => handlePermissionChange('updateAMC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteAMC"
                                  checked={designation.permissions?.includes('deleteAMC')}
                                  onChange={(e) => handlePermissionChange('deleteAMC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* INVENTORY */}
                          <tr>
                            <td>Inventory</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createInventory"
                                  checked={designation.permissions?.includes('createInventory')}
                                  onChange={(e) => handlePermissionChange('createInventory', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewInventory"
                                  checked={designation.permissions?.includes('viewInventory')}
                                  onChange={(e) => handlePermissionChange('viewInventory', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateInventory"
                                  checked={designation.permissions?.includes('updateInventory')}
                                  onChange={(e) => handlePermissionChange('updateInventory', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteInventory"
                                  checked={designation.permissions?.includes('deleteInventory')}
                                  onChange={(e) => handlePermissionChange('deleteInventory', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* VENDOR */}
                          <tr>
                            <td>Vendor</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createVendor"
                                  checked={designation.permissions?.includes('createVendor')}
                                  onChange={(e) => handlePermissionChange('createVendor', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewVendor"
                                  checked={designation.permissions?.includes('viewVendor')}
                                  onChange={(e) => handlePermissionChange('viewVendor', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateVendor"
                                  checked={designation.permissions?.includes('updateVendor')}
                                  onChange={(e) => handlePermissionChange('updateVendor', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteVendor"
                                  checked={designation.permissions?.includes('deleteVendor')}
                                  onChange={(e) => handlePermissionChange('deleteVendor', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* PRODUCT */}
                          <tr>
                            <td>Product</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createProduct"
                                  checked={designation.permissions?.includes('createProduct')}
                                  onChange={(e) => handlePermissionChange('createProduct', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewProduct"
                                  checked={designation.permissions?.includes('viewProduct')}
                                  onChange={(e) => handlePermissionChange('viewProduct', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateProduct"
                                  checked={designation.permissions?.includes('updateProduct')}
                                  onChange={(e) => handlePermissionChange('updateProduct', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteProduct"
                                  checked={designation.permissions?.includes('deleteProduct')}
                                  onChange={(e) => handlePermissionChange('deleteProduct', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* PURCHASE ORDER */}
                          <tr>
                            <td>Purchase Order</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createPurchaseOrder"
                                  checked={designation.permissions?.includes('createPurchaseOrder')}
                                  onChange={(e) => handlePermissionChange('createPurchaseOrder', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewPurchaseOrder"
                                  checked={designation.permissions?.includes('viewPurchaseOrder')}
                                  onChange={(e) => handlePermissionChange('viewPurchaseOrder', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updatePurchaseOrder"
                                  checked={designation.permissions?.includes('updatePurchaseOrder')}
                                  onChange={(e) => handlePermissionChange('updatePurchaseOrder', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deletePurchaseOrder"
                                  checked={designation.permissions?.includes('deletePurchaseOrder')}
                                  onChange={(e) => handlePermissionChange('deletePurchaseOrder', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* GRN */}
                          <tr>
                            <td>GRN</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createGRN"
                                  checked={designation.permissions?.includes('createGRN')}
                                  onChange={(e) => handlePermissionChange('createGRN', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewGRN"
                                  checked={designation.permissions?.includes('viewGRN')}
                                  onChange={(e) => handlePermissionChange('viewGRN', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateGRN"
                                  checked={designation.permissions?.includes('updateGRN')}
                                  onChange={(e) => handlePermissionChange('updateGRN', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteGRN"
                                  checked={designation.permissions?.includes('deleteGRN')}
                                  onChange={(e) => handlePermissionChange('deleteGRN', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* QUALITY INSPECTION */}
                          <tr>
                            <td>Quality Inspection</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createQC"
                                  checked={designation.permissions?.includes('createQC')}
                                  onChange={(e) => handlePermissionChange('createQC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewQC"
                                  checked={designation.permissions?.includes('viewQC')}
                                  onChange={(e) => handlePermissionChange('viewQC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateQC"
                                  checked={designation.permissions?.includes('updateQC')}
                                  onChange={(e) => handlePermissionChange('updateQC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteQC"
                                  checked={designation.permissions?.includes('deleteQC')}
                                  onChange={(e) => handlePermissionChange('deleteQC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* DELIVERY CHALLAN */}
                          <tr>
                            <td>Delivery Challan</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createDC"
                                  checked={designation.permissions?.includes('createDC')}
                                  onChange={(e) => handlePermissionChange('createDC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewDC"
                                  checked={designation.permissions?.includes('viewDC')}
                                  onChange={(e) => handlePermissionChange('viewDC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateDC"
                                  checked={designation.permissions?.includes('updateDC')}
                                  onChange={(e) => handlePermissionChange('updateDC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteDC"
                                  checked={designation.permissions?.includes('deleteDC')}
                                  onChange={(e) => handlePermissionChange('deleteDC', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* MRF */}
                          <tr>
                            <td>MRF</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createMRF"
                                  checked={designation.permissions?.includes('createMRF')}
                                  onChange={(e) => handlePermissionChange('createMRF', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewMRF"
                                  checked={designation.permissions?.includes('viewMRF')}
                                  onChange={(e) => handlePermissionChange('viewMRF', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateMRF"
                                  checked={designation.permissions?.includes('updateMRF')}
                                  onChange={(e) => handlePermissionChange('updateMRF', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteMRF"
                                  checked={designation.permissions?.includes('deleteMRF')}
                                  onChange={(e) => handlePermissionChange('deleteMRF', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* SALES MANAGER MASTER */}
                          <tr>
                            <td>Sales Manager Master</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createSalesManagerMaster"
                                  checked={designation.permissions?.includes('createSalesManagerMaster')}
                                  onChange={(e) => handlePermissionChange('createSalesManagerMaster', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewSalesManagerMaster"
                                  checked={designation.permissions?.includes('viewSalesManagerMaster')}
                                  onChange={(e) => handlePermissionChange('viewSalesManagerMaster', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateSalesManagerMaster"
                                  checked={designation.permissions?.includes('updateSalesManagerMaster')}
                                  onChange={(e) => handlePermissionChange('updateSalesManagerMaster', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteSalesManagerMaster"
                                  checked={designation.permissions?.includes('deleteSalesManagerMaster')}
                                  onChange={(e) => handlePermissionChange('deleteSalesManagerMaster', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* EXHIBITION MASTER */}
                          <tr>
                            <td>Exhibition Master</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createExhibition"
                                  checked={designation.permissions?.includes('createExhibition')}
                                  onChange={(e) => handlePermissionChange('createExhibition', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewExhibition"
                                  checked={designation.permissions?.includes('viewExhibition')}
                                  onChange={(e) => handlePermissionChange('viewExhibition', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateExhibition"
                                  checked={designation.permissions?.includes('updateExhibition')}
                                  onChange={(e) => handlePermissionChange('updateExhibition', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteExhibition"
                                  checked={designation.permissions?.includes('deleteExhibition')}
                                  onChange={(e) => handlePermissionChange('deleteExhibition', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* EXHIBITION VISIT */}
                          <tr>
                            <td>Exhibition Visit</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createExhibitionVisit"
                                  checked={designation.permissions?.includes('createExhibitionVisit')}
                                  onChange={(e) => handlePermissionChange('createExhibitionVisit', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewExhibitionVisit"
                                  checked={designation.permissions?.includes('viewExhibitionVisit')}
                                  onChange={(e) => handlePermissionChange('viewExhibitionVisit', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateExhibitionVisit"
                                  checked={designation.permissions?.includes('updateExhibitionVisit')}
                                  onChange={(e) => handlePermissionChange('updateExhibitionVisit', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteExhibitionVisit"
                                  checked={designation.permissions?.includes('deleteExhibitionVisit')}
                                  onChange={(e) => handlePermissionChange('deleteExhibitionVisit', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* ACCOUNT MASTER */}
                          <tr className="table-primary">
                            <td className="fw-bold">Accounts Master</td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="createAccountMaster"
                                  checked={designation.permissions?.includes('createAccountMaster')}
                                  onChange={(e) => handlePermissionChange('createAccountMaster', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewAccountMaster"
                                  checked={designation.permissions?.includes('viewAccountMaster')}
                                  onChange={(e) => handlePermissionChange('viewAccountMaster', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="updateAccountMaster"
                                  checked={designation.permissions?.includes('updateAccountMaster')}
                                  onChange={(e) => handlePermissionChange('updateAccountMaster', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="deleteAccountMaster"
                                  checked={designation.permissions?.includes('deleteAccountMaster')}
                                  onChange={(e) => handlePermissionChange('deleteAccountMaster', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                            </td>
                          </tr>

                          {/* SURVEY ENGINEER */}
                          <tr className="table-info" style={{ backgroundColor: '#e3f2fd' }}>
                            <td className="fw-bold text-primary">
                              <i className="fa-solid fa-clipboard-list me-2"></i>
                              Survey Engineer
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="surveyEngineer"
                                  checked={designation.permissions?.includes('surveyEngineer')}
                                  onChange={(e) => handlePermissionChange('surveyEngineer', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                              <span className="ms-2 small text-muted">Role</span>
                            </td>
                            <td>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox" name="viewSurveyDashboard"
                                  checked={designation.permissions?.includes('viewSurveyDashboard')}
                                  onChange={(e) => handlePermissionChange('viewSurveyDashboard', e.target.checked)} />
                                <div className="toggler-slider"><div className="toggler-knob"></div></div>
                              </label>
                              <span className="ms-2 small text-muted">Dashboard</span>
                            </td>
                            <td colSpan="2" className="text-muted">—</td>
                          </tr>

                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="col-12 pt-3 mt-2">
                    <button
                      type="submit"
                      className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                    >
                      Update
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
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpdateDesignationPopup;