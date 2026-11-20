import React, { useState, useEffect, useCallback } from "react";
import { getDepartment } from "../../../../../hooks/useDepartment";
import toast from "react-hot-toast";
import Select from "react-select";
import { updateDesignation } from "../../../../../hooks/useDesignation";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const PAGE_SIZE = 10;

// ---------- Permission rows (edit here to add/remove modules) ----------
const PERMISSION_GROUPS = [
  {
    title: "General",
    rows: [
      { label: "Employee", add: "createEmployee", view: "viewEmployee", update: "updateEmployee", delete: "deleteEmployee" },
      { label: "Customer", add: "createCustomer", view: "viewCustomer", update: "updateCustomer", delete: "deleteCustomer" },
      { label: "Project", add: "createProject", view: "viewProject", update: "updateProject", delete: "deleteProject" },
      { label: "Task Name", add: "createTask", view: "viewTask", update: "updateTask", delete: "deleteTask" },
      { label: "Task Sheet", add: "createTaskSheet", view: "viewTaskSheet", update: "updateTaskSheet", delete: "deleteTaskSheet" },
      { label: "Department", add: "createDepartment", view: "viewDepartment", update: "updateDepartment", delete: "deleteDepartment" },
      { label: "Designation", add: "createDesignation", view: "viewDesignation", update: "updateDesignation", delete: "deleteDesignation" },
    ],
  },
  {
    title: "Service",
    rows: [
      // Manager only – full Service Master (all services, assign to employees)
      {
        label: "Service Master (Manager)",
        rowClass: "table-warning",
        icon: "fa-solid fa-screwdriver-wrench",
        bold: true,
        add: "createService",
        view: "viewService",
        update: "updateService",
        delete: "deleteService",
      },
      // Employee only – sees ONLY services assigned to him (My Service)
      {
        label: "My Service (Employee)",
        icon: "fa-solid fa-user-gear",
        add: null,
        view: "viewMyService",
        update: "updateMyService",
        delete: null,
      },
    ],
  },
  {
    title: "Sales & Marketing",
    rows: [
      { label: "Leads", add: "createLead", view: "viewLead", update: "updateLead", delete: "deleteLead" },
      { label: "Marketing", add: "assignLead", view: "viewMarketingDashboard", update: "updateMarketing", delete: "deleteMarketing" },
      { label: "Sales Manager Master", add: "createSalesManagerMaster", view: "viewSalesManagerMaster", update: "updateSalesManagerMaster", delete: "deleteSalesManagerMaster" },
      { label: "Exhibition Master", add: "createExhibition", view: "viewExhibition", update: "updateExhibition", delete: "deleteExhibition" },
      { label: "Exhibition Visit", add: "createExhibitionVisit", view: "viewExhibitionVisit", update: "updateExhibitionVisit", delete: "deleteExhibitionVisit" },
      {
        label: "WhatsApp Campaign",
        rowClass: "table-success",
        icon: "fa-brands fa-whatsapp",
        iconStyle: { color: "#25D366" },
        bold: true,
        add: "createCampaign",
        view: "viewCampaign",
        update: "updateCampaign",
        delete: "deleteCampaign",
      },
      { label: "↳ Send Campaign (separate from Create/Edit)", single: "sendCampaign", sub: true },
      {
        label: "Entero WhatsApp Campaign",
        rowClass: "table-success",
        icon: "fa-brands fa-whatsapp",
        iconStyle: { color: "#25D366" },
        bold: true,
        add: "createEnteroCampaign",
        view: "viewEnteroCampaign",
        update: "updateEnteroCampaign",
        delete: "deleteEnteroCampaign",
      },
      { label: "↳ Send Entero Campaign", single: "sendEnteroCampaign", sub: true },
    ],
  },
  {
    title: "AMC",
    rows: [
      { label: "AMC", add: "createAMC", view: "viewAMC", update: "updateAMC", delete: "deleteAMC" },
      { label: "Old AMC History", add: "createOldAMCHistory", view: "viewOldAMCHistory", update: "updateOldAMCHistory", delete: "deleteOldAMCHistory" },
    ],
  },
  {
    title: "Purchase & Inventory",
    rows: [
      { label: "Inventory", add: "createInventory", view: "viewInventory", update: "updateInventory", delete: "deleteInventory" },
      { label: "Vendor", add: "createVendor", view: "viewVendor", update: "updateVendor", delete: "deleteVendor" },
      { label: "Product", add: "createProduct", view: "viewProduct", update: "updateProduct", delete: "deleteProduct" },
      { label: "Purchase Order", add: "createPurchaseOrder", view: "viewPurchaseOrder", update: "updatePurchaseOrder", delete: "deletePurchaseOrder" },
      { label: "GRN", add: "createGRN", view: "viewGRN", update: "updateGRN", delete: "deleteGRN" },
      { label: "Quality Inspection", add: "createQC", view: "viewQC", update: "updateQC", delete: "deleteQC" },
      { label: "Delivery Challan", add: "createDC", view: "viewDC", update: "updateDC", delete: "deleteDC" },
      { label: "MRF", add: "createMRF", view: "viewMRF", update: "updateMRF", delete: "deleteMRF" },
      {
        label: "Project Purchase",
        rowClass: "table-info",
        icon: "fa-solid fa-boxes-stacked",
        bold: true,
        add: "createProjectPurchase",
        view: "viewProjectPurchase",
        update: "updateProjectPurchase",
        delete: "deleteProjectPurchase",
      },
    ],
  },
  {
    title: "Accounts & Reports",
    rows: [
      { label: "Accounts Master", rowClass: "table-primary", bold: true, add: "createAccountMaster", view: "viewAccountMaster", update: "updateAccountMaster", delete: "deleteAccountMaster" },
      { label: "Annual Report", add: "createAnnualReport", view: "viewAnnualReport", update: "updateAnnualReport", delete: "deleteAnnualReport" },
      { label: "Activity Logs", add: "createActivityLog", view: "viewActivityLog", update: "updateActivityLog", delete: "deleteActivityLog" },
      { label: "Feedback", add: "createFeedback", view: "viewFeedback", update: "updateFeedback", delete: "deleteFeedback" },
    ],
  },
  {
    title: "Survey",
    rows: [
      {
        label: "Survey Engineer",
        rowClass: "table-info",
        icon: "fa-solid fa-clipboard-list",
        bold: true,
        add: "surveyEngineer",
        view: "viewSurveyDashboard",
        update: null,
        delete: null,
        notes: { add: "Role", view: "Dashboard" },
      },
    ],
  },
];

const ACTION_COLUMNS = ["add", "view", "update", "delete"];

const Toggle = ({ permKey, checked, onChange }) => (
  <label className="toggler-wrapper style-22">
    <input
      type="checkbox"
      name={permKey}
      checked={checked}
      onChange={(e) => onChange(permKey, e.target.checked)}
    />
    <div className="toggler-slider"><div className="toggler-knob"></div></div>
  </label>
);

const UpdateDesignationPopup = ({ handleUpdate, selectedDes }) => {
  const [designation, setDesignation] = useState({
    ...selectedDes,
    permissions: selectedDes?.permissions || [],
  });

  const [deptOptions, setDeptOptions] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptPage, setDeptPage] = useState(1);
  const [deptHasMore, setDeptHasMore] = useState(true);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");

  // reset = true -> new search, ignore old "hasMore" state
  const loadDepartments = useCallback(async (page, search, reset = false) => {
    if (!reset && (deptLoading || !deptHasMore)) return;
    setDeptLoading(true);
    const data = await getDepartment(page, PAGE_SIZE, search);

    if (data.error) {
      toast.error(data.error || "Failed to load departments");
      setDeptLoading(false);
      return;
    }

    const newOpts = (data.departments || []).map((d) => ({ value: d._id, label: d.name }));
    setDeptOptions((prev) => (page === 1 ? newOpts : [...prev, ...newOpts]));
    setDeptHasMore(newOpts.length === PAGE_SIZE);
    setDeptLoading(false);
    setDeptPage(page + 1);
  }, [deptLoading, deptHasMore]);

  useEffect(() => {
    setDeptPage(1);
    setDeptHasMore(true);
    setDeptOptions([]);
    loadDepartments(1, deptSearch, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptSearch]);

  useEffect(() => {
    const deptId = designation?.department?._id || designation?.department;
    if (deptId && deptOptions.length > 0 && !selectedDept) {
      const selectedOption = deptOptions.find((opt) => opt.value === deptId);
      if (selectedOption) setSelectedDept(selectedOption);
    }
  }, [designation, deptOptions, selectedDept]);

  const handlePermissionChange = (permission, isChecked) => {
    setDesignation((prev) => {
      let newPermissions = [...(prev.permissions || [])];
      if (isChecked) {
        if (!newPermissions.includes(permission)) newPermissions.push(permission);
      } else {
        newPermissions = newPermissions.filter((p) => p !== permission);
      }
      return { ...prev, permissions: newPermissions };
    });
  };

  const hasPerm = (key) => designation.permissions?.includes(key) || false;

  const handleInputChange = (event) => {
    event.preventDefault();
    const { name, value } = event.target;
    setDesignation((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepartmentChange = (selectedOption) => {
    setSelectedDept(selectedOption);
    setDesignation((prev) => ({
      ...prev,
      department: selectedOption ? selectedOption.value : null,
    }));
  };

  const handleUpdateDesignation = async (e) => {
    e.preventDefault();
    if (!designation.name || !designation.department) {
      return toast.error("Please fill all fields");
    }
    if (!designation.permissions || designation.permissions.length === 0) {
      return toast.error("Please select at least one permission");
    }
    try {
      toast.loading("Updating Designation...");
      const data = await updateDesignation(designation);
      toast.dismiss();
      if (data.success) {
        toast.success(data.message);
        handleUpdate();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.error || "Failed to update designation");
    }
  };

  const renderRow = (row) => {
    // Single toggle sub-row (e.g. Send Campaign)
    if (row.single) {
      return (
        <tr key={row.single}>
          <td className="ps-4 text-muted small">{row.label}</td>
          <td colSpan="4" className="text-start ps-4">
            <Toggle permKey={row.single} checked={hasPerm(row.single)} onChange={handlePermissionChange} />
          </td>
        </tr>
      );
    }

    return (
      <tr key={row.label} className={row.rowClass || ""}>
        <td className={row.bold ? "fw-bold" : ""}>
          {row.icon && <i className={`${row.icon} me-2`} style={row.iconStyle}></i>}
          {row.label}
        </td>
        {ACTION_COLUMNS.map((col) => {
          const key = row[col];
          return (
            <td key={col}>
              {key ? (
                <>
                  <Toggle permKey={key} checked={hasPerm(key)} onChange={handlePermissionChange} />
                  {row.notes?.[col] && <span className="ms-2 small text-muted">{row.notes[col]}</span>}
                </>
              ) : (
                <span className="text-muted">—</span>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
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
                        value={designation.name || ""}
                        onChange={handleInputChange}
                        className="form-control rounded-0"
                        id="name"
                        name="name"
                        required
                      />
                    </div>
                  </div>

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
                          if (deptHasMore && !deptLoading) loadDepartments(deptPage, deptSearch);
                        }}
                        placeholder="Select Department..."
                        isClearable
                        menuPlacement="auto"
                        className="react-select-container"
                        classNamePrefix="react-select"
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            borderRadius: "0px",
                            border: "1px solid #ced4da",
                            "&:hover": { border: "1px solid #ced4da" },
                          }),
                          menu: (provided) => ({ ...provided, zIndex: 9999 }),
                        }}
                      />
                    </div>
                  </div>

                  <div className="col-12">
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
                          {PERMISSION_GROUPS.map((group) => (
                            <React.Fragment key={group.title}>
                              <tr>
                                <td
                                  colSpan="5"
                                  className="fw-bold text-start ps-3"
                                  style={{ backgroundColor: "#f1f3f5", fontSize: "13px", letterSpacing: "0.5px" }}
                                >
                                  {group.title.toUpperCase()}
                                </td>
                              </tr>
                              {group.rows.map(renderRow)}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="col-12 pt-3 mt-2">
                    <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">
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