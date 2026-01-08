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
    if(!designation.name || !designation.department){
      return toast.error("Please fill all fields");
    }
    if(designation.permissions.length === 0){
      return toast.error("Please select at least one permission");
    }
   try{
    toast.loading("Updating Designation...")
    const data = await updateDesignation(designation);
    toast.dismiss()
    if(data.success){
      toast.success(data.message);
      handleUpdate();
    }else{
      toast.error(data.error);
    }
   }catch(error){
    toast.error(error.response.data.error);
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

                      <tr className="th_border" >
                        <th >Form Level Details</th>
                        <th >Add</th>
                        <th >View</th>
                        <th>Update</th>
                        <th >Delete</th>
                      </tr>
                      <tbody>
              
                        <tr>
  <td>Employee</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="createEmployee"
                          checked={designation.permissions.includes('createEmployee')}
                          onChange={(e) => handlePermissionChange('createEmployee', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        name="viewEmployee"
                        id="permissions"
                          checked={designation.permissions.includes('viewEmployee')}
                          onChange={(e) => handlePermissionChange('viewEmployee', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="updateEmployee"
                          checked={designation.permissions.includes('updateEmployee')}
                          onChange={(e) => handlePermissionChange('updateEmployee', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="deleteEmployee"
                          checked={designation.permissions.includes('deleteEmployee')}
                          onChange={(e) => handlePermissionChange('deleteEmployee', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>

<tr>
  <td>Customer</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="createCustomer"
                          checked={designation.permissions.includes('createCustomer')}
                          onChange={(e) => handlePermissionChange('createCustomer', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="viewCustomer"
                          checked={designation.permissions.includes('viewCustomer')}
                          onChange={(e) => handlePermissionChange('viewCustomer', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="updateCustomer"
                          checked={designation.permissions.includes('updateCustomer')}
                          onChange={(e) => handlePermissionChange('updateCustomer', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="deleteCustomer"
                          checked={designation.permissions.includes('deleteCustomer')}
                          onChange={(e) => handlePermissionChange('deleteCustomer', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>

                      
                        <tr>
  <td>Project</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                          id="permissions"
                          name="createProject"
                          checked={designation.permissions.includes('createProject')}
                          onChange={(e) => handlePermissionChange('createProject', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="viewProject"
                          checked={designation.permissions.includes('viewProject')}
                          onChange={(e) => handlePermissionChange('viewProject', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="updateProject"
                          checked={designation.permissions.includes('updateProject')}
                          onChange={(e) => handlePermissionChange('updateProject', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="deleteProject"
                          checked={designation.permissions.includes('deleteProject')}
                          onChange={(e) => handlePermissionChange('deleteProject', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>
<tr>
  <td>Task Name</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="createTask"
                          checked={designation.permissions.includes('createTask')}
                          onChange={(e) => handlePermissionChange('createTask', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="viewTask"
                          checked={designation.permissions.includes('viewTask')}
                          onChange={(e) => handlePermissionChange('viewTask', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="updateTask"
                          checked={designation.permissions.includes('updateTask')}
                          onChange={(e) => handlePermissionChange('updateTask', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="deleteTask"
                          checked={designation.permissions.includes('deleteTask')}
                          onChange={(e) => handlePermissionChange('deleteTask', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>
<tr>
  <td>Task Sheet</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="createTaskSheet"
                          checked={designation.permissions.includes('createTaskSheet')}
                          onChange={(e) => handlePermissionChange('createTaskSheet', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="viewTaskSheet"
                          checked={designation.permissions.includes('viewTaskSheet')}
                          onChange={(e) => handlePermissionChange('viewTaskSheet', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="updateTaskSheet"
                          checked={designation.permissions.includes('updateTaskSheet')}
                          onChange={(e) => handlePermissionChange('updateTaskSheet', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="deleteTaskSheet"
                          checked={designation.permissions.includes('deleteTaskSheet')}
                          onChange={(e) => handlePermissionChange('deleteTaskSheet', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>
<tr>
  <td>Department</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="createDepartment"
                          checked={designation.permissions.includes('createDepartment')}
                          onChange={(e) => handlePermissionChange('createDepartment', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="viewDepartment"
                          checked={designation.permissions.includes('viewDepartment')}
                          onChange={(e) => handlePermissionChange('viewDepartment', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="updateDepartment"
                          checked={designation.permissions.includes('updateDepartment')}
                          onChange={(e) => handlePermissionChange('updateDepartment', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="deleteDepartment"
                          checked={designation.permissions.includes('deleteDepartment')}
                          onChange={(e) => handlePermissionChange('deleteDepartment', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>
<tr>
  <td>Designation</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="createDesignation"
                          checked={designation.permissions.includes('createDesignation')}
                          onChange={(e) => handlePermissionChange('createDesignation', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="viewDesignation"
                          checked={designation.permissions.includes('viewDesignation')}
                          onChange={(e) => handlePermissionChange('viewDesignation', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="updateDesignation"
                        checked={designation.permissions.includes('updateDesignation')}
                          onChange={(e) => handlePermissionChange('updateDesignation', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        name="deleteDesignation"
                        id="permissions"
                          checked={designation.permissions.includes('deleteDesignation')}
                          onChange={(e) => handlePermissionChange('deleteDesignation', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>




<tr>
  <td>Service</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="createService"
                          checked={designation.permissions.includes('createService')}
                          onChange={(e) => handlePermissionChange('createService', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="viewService"
                          checked={designation.permissions.includes('viewService')}
                          onChange={(e) => handlePermissionChange('viewService', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="updateService"
                          checked={designation.permissions.includes('updateService')}
                          onChange={(e) => handlePermissionChange('updateService', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="deleteService"
                          checked={designation.permissions.includes('deleteService')}
                          onChange={(e) => handlePermissionChange('deleteService', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>

<tr>
  <td>Leads</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
        id="permissions"
        name="createLead"
          checked={designation.permissions.includes('createLead')}
          onChange={(e) => handlePermissionChange('createLead', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
        id="permissions"
        name="viewLead"
          checked={designation.permissions.includes('viewLead')}
          onChange={(e) => handlePermissionChange('viewLead', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
        id="permissions"
        name="updateLead"
        checked={designation.permissions.includes('updateLead')}
          onChange={(e) => handlePermissionChange('updateLead', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
        name="deleteLead"
        id="permissions"
          checked={designation.permissions.includes('deleteLead')}
          onChange={(e) => handlePermissionChange('deleteLead', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>

<tr>
  <td>Feedback</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
        id="permissions"
        name="createFeedback"
          checked={designation.permissions.includes('createFeedback')}
          onChange={(e) => handlePermissionChange('createFeedback', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
        id="permissions"
        name="viewFeedback"
          checked={designation.permissions.includes('viewFeedback')}
          onChange={(e) => handlePermissionChange('viewFeedback', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-23">
        <input type="checkbox"
        id="permissions"
        name="updateFeedback"
        checked={designation.permissions.includes('updateFeedback')}
          onChange={(e) => handlePermissionChange('updateFeedback', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-23">
        <input type="checkbox"
        name="deleteFeedback"
        id="permissions"
          checked={designation.permissions.includes('deleteFeedback')}
          onChange={(e) => handlePermissionChange('deleteFeedback', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>

<tr>
  <td>Marketing</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
        id="permissions"
        name="assignLead"
          checked={designation.permissions.includes('assignLead')}
          onChange={(e) => handlePermissionChange('assignLead', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
        id="permissions"
        name="viewMarketingDashboard"
          checked={designation.permissions.includes('viewMarketingDashboard')}
          onChange={(e) => handlePermissionChange('viewMarketingDashboard', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-23">
        <input type="checkbox"
        id="permissions"
        name="updateMarketing"
        checked={designation.permissions.includes('updateMarketing')}
          onChange={(e) => handlePermissionChange('updateMarketing', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-23">
        <input type="checkbox"
        name="deleteMarketing"
        id="permissions"
          checked={designation.permissions.includes('deleteMarketing')}
          onChange={(e) => handlePermissionChange('deleteMarketing', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>


                        <tr>
  <td>AMC</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                          id="permissions"
                          name="createAMC"
                          checked={designation.permissions.includes('createAMC')}
                          onChange={(e) => handlePermissionChange('createAMC', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="viewAMC"
                          checked={designation.permissions.includes('viewAMC')}
                          onChange={(e) => handlePermissionChange('viewAMC', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="updateAMC"
                          checked={designation.permissions.includes('updateAMC')}
                          onChange={(e) => handlePermissionChange('updateAMC', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
                        <input type="checkbox"
                        id="permissions"
                        name="deleteAMC"
                          checked={designation.permissions.includes('deleteAMC')}
                          onChange={(e) => handlePermissionChange('deleteAMC', e.target.checked)}
                        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>

                        {/* INVENTORY PERMISSIONS - ADDED */}
                        <tr>
                          <td>Inventory</td>
                          <td>
                            <div>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="createInventory"
                                  checked={designation.permissions.includes('createInventory')}
                                  onChange={(e) => handlePermissionChange('createInventory', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>

                          <td>
                            <div>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="viewInventory"
                                  checked={designation.permissions.includes('viewInventory')}
                                  onChange={(e) => handlePermissionChange('viewInventory', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>
                          <td>

                            <div>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="updateInventory"
                                  checked={designation.permissions.includes('updateInventory')}
                                  onChange={(e) => handlePermissionChange('updateInventory', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>

                          <td>
                            <div>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="deleteInventory"
                                  checked={designation.permissions.includes('deleteInventory')}
                                  onChange={(e) => handlePermissionChange('deleteInventory', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>
                        </tr>


                          {/* VENDOR PERMISSIONS - ADDED */}

                        <tr>
                          <td>Vendor</td>
                          <td>
                            <div>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="createVendor"
                                  checked={designation.permissions.includes('createVendor')}
                                  onChange={(e) => handlePermissionChange('createVendor', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>

                          <td>
                            <div>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="viewVendor"
                                  checked={designation.permissions.includes('viewVendor')}
                                  onChange={(e) => handlePermissionChange('viewVendor', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>

                          <td>
                            <div>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="updateVendor"
                                  checked={designation.permissions.includes('updateVendor')}
                                  onChange={(e) => handlePermissionChange('updateVendor', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>
                          <td>

                            <div>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="deleteVendor"
                                  checked={designation.permissions.includes('deleteVendor')}
                                  onChange={(e) => handlePermissionChange('deleteVendor', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>
                        </tr>


                         {/* PRODUCT PERMISSIONS - ADDED */}

                        <tr>
                          <td>Product</td>
                          <td>
                            <div>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="createProduct"
                                  checked={designation.permissions.includes('createProduct')}
                                  onChange={(e) => handlePermissionChange('createProduct', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>
                          <td>
                            <div>

                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="viewProduct"
                                  checked={designation.permissions.includes('viewProduct')}
                                  onChange={(e) => handlePermissionChange('viewProduct', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>

                          <td>
                            <div>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="updateProduct"
                                  checked={designation.permissions.includes('updateProduct')}
                                  onChange={(e) => handlePermissionChange('updateProduct', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>

                          <td>
                            <div>
                              <label className="toggler-wrapper style-22">
                                <input type="checkbox"
                                  id="permissions"
                                  name="deleteProduct"
                                  checked={designation.permissions.includes('deleteProduct')}
                                  onChange={(e) => handlePermissionChange('deleteProduct', e.target.checked)}
                                />
                                <div className="toggler-slider">
                                  <div className="toggler-knob"></div>
                                </div>
                              </label>
                            </div>
                          </td>
                        </tr>

     {/* PURCHASE ORDER PERMISSIONS */}
<tr>
  <td>Purchase Order</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="createPurchaseOrder"
          checked={designation.permissions.includes('createPurchaseOrder')}
          onChange={(e) => handlePermissionChange('createPurchaseOrder', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="viewPurchaseOrder"
          checked={designation.permissions.includes('viewPurchaseOrder')}
          onChange={(e) => handlePermissionChange('viewPurchaseOrder', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="updatePurchaseOrder"
          checked={designation.permissions.includes('updatePurchaseOrder')}
          onChange={(e) => handlePermissionChange('updatePurchaseOrder', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="deletePurchaseOrder"
          checked={designation.permissions.includes('deletePurchaseOrder')}
          onChange={(e) => handlePermissionChange('deletePurchaseOrder', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>

<tr>
  <td>GRN</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="createGRN"
          checked={designation.permissions.includes('createGRN')}
          onChange={(e) => handlePermissionChange('createGRN', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="viewGRN"
          checked={designation.permissions.includes('viewGRN')}
          onChange={(e) => handlePermissionChange('viewGRN', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="updateGRN"
          checked={designation.permissions.includes('updateGRN')}
          onChange={(e) => handlePermissionChange('updateGRN', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="deleteGRN"
          checked={designation.permissions.includes('deleteGRN')}
          onChange={(e) => handlePermissionChange('deleteGRN', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>

{/* QUALITY INSPECTION PERMISSIONS */}
<tr>
  <td>Quality Inspection</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="createQC"
          checked={designation.permissions.includes('createQC')}
          onChange={(e) => handlePermissionChange('createQC', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="viewQC"
          checked={designation.permissions.includes('viewQC')}
          onChange={(e) => handlePermissionChange('viewQC', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="updateQC"
          checked={designation.permissions.includes('updateQC')}
          onChange={(e) => handlePermissionChange('updateQC', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="deleteQC"
          checked={designation.permissions.includes('deleteQC')}
          onChange={(e) => handlePermissionChange('deleteQC', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>


{/* DELIVERY CHALLAN PERMISSIONS */}
<tr>
  <td>Delivery Challan</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="createDC"
          checked={designation.permissions.includes('createDC')}
          onChange={(e) => handlePermissionChange('createDC', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="viewDC"
          checked={designation.permissions.includes('viewDC')}
          onChange={(e) => handlePermissionChange('viewDC', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="updateDC"
          checked={designation.permissions.includes('updateDC')}
          onChange={(e) => handlePermissionChange('updateDC', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="deleteDC"
          checked={designation.permissions.includes('deleteDC')}
          onChange={(e) => handlePermissionChange('deleteDC', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>

{/* MRF (MATERIAL REQUEST FORM) PERMISSIONS - NEW */}
<tr>
  <td>MRF</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="createMRF"
          checked={designation.permissions.includes('createMRF')}
          onChange={(e) => handlePermissionChange('createMRF', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="viewMRF"
          checked={designation.permissions.includes('viewMRF')}
          onChange={(e) => handlePermissionChange('viewMRF', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="updateMRF"
          checked={designation.permissions.includes('updateMRF')}
          onChange={(e) => handlePermissionChange('updateMRF', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="deleteMRF"
          checked={designation.permissions.includes('deleteMRF')}
          onChange={(e) => handlePermissionChange('deleteMRF', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
</tr>

{/* SALES MANAGER MASTER PERMISSIONS - NEW */}
<tr>
  <td>Sales Manager Master</td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="createSalesManagerMaster"
          checked={designation.permissions.includes('createSalesManagerMaster')}
          onChange={(e) => handlePermissionChange('createSalesManagerMaster', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="viewSalesManagerMaster"
          checked={designation.permissions.includes('viewSalesManagerMaster')}
          onChange={(e) => handlePermissionChange('viewSalesManagerMaster', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          id="permissions"
          name="updateSalesManagerMaster"
          checked={designation.permissions.includes('updateSalesManagerMaster')}
          onChange={(e) => handlePermissionChange('updateSalesManagerMaster', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
  <td>
    <div>
      <label className="toggler-wrapper style-22">
        <input type="checkbox"
          name="deleteSalesManagerMaster"
          id="permissions"
          checked={designation.permissions.includes('deleteSalesManagerMaster')}
          onChange={(e) => handlePermissionChange('deleteSalesManagerMaster', e.target.checked)}
        />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    </div>
  </td>
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