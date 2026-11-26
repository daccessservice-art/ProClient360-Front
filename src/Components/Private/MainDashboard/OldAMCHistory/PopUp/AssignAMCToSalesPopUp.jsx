import { useState, useEffect, useCallback, useContext } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getDepartment } from "../../../../../hooks/useDepartment";
import { getEmployee } from "../../../../../hooks/useEmployees";
import { assignAMCToSales } from "../../../../../hooks/useOldAMCHistory";
import { UserContext } from "../../../../../context/UserContext";

const PAGE_SIZE = 15;

const productsList = [
  "Surveillance System", "Access Control System", "TurnKey Project", "Alleviz",
  "CafeLive", "WorksJoy", "WorksJoy Blu", "Fire Alarm System", "Fire Hydrant System",
  "IDS", "AI Face Machines", "Entrance Automation", "Guard Tour System",
  "Home Automation", "IP PA and Communication System", "CRM", "Security Systems",
  "KMS", "VMS", "PMS", "Boom Barrier System", "Tripod System", "Flap Barrier System",
  "EPBX System", "CMS", "Lift Eliviter System", "AV6", "Walky Talky System",
  "Device Management System", "VisionIQ", "CineMind", "Extracto", "Virtual Agent",
  "LAN Cabling Activity", "AMC Renewal",
];
const productOptions = productsList.map((p) => ({ value: p, label: p }));
const callLeadOptions = ["Hot Leads", "Warm Leads", "Cold Leads", "Invalid Leads"];

const selectStyles = {
  control: (p) => ({ ...p, borderRadius: 0, borderColor: "#ced4da", fontSize: "14px", minHeight: "38px" }),
  option: (p, s) => ({
    ...p,
    backgroundColor: s.isSelected ? "#007bff" : s.isFocused ? "#f8f9fa" : "white",
    color: s.isSelected ? "white" : "#212529",
  }),
  multiValue: (p) => ({ ...p, backgroundColor: "#007bff", borderRadius: "3px" }),
  multiValueLabel: (p) => ({ ...p, color: "white", fontSize: "13px" }),
  multiValueRemove: (p) => ({ ...p, color: "white", ":hover": { backgroundColor: "#0056b3", color: "white" } }),
  menuPortal: (p) => ({ ...p, zIndex: 9999 }),
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "N/A");

const AssignAMCToSalesPopUp = ({ record, handleClose }) => {
  const { user } = useContext(UserContext);

  // existing open lead on this AMC? (salesLead comes populated from the list API)
  const existingLead = record?.salesLead && typeof record.salesLead === "object" ? record.salesLead : null;
  const hasOpenLead = !!existingLead && !["Won", "Lost"].includes(existingLead.STATUS);

  const [assignmentType, setAssignmentType] = useState(
    record?.salesAssignType === "employee" ? "employee" : "self"
  );
  const [submitting, setSubmitting] = useState(false);

  // pre-select system text as product when it matches a known product
  const initialProducts = (record?.system || "")
    .split(/[,/]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => productOptions.find((o) => o.value.toLowerCase() === s.toLowerCase()))
    .filter(Boolean);

  const [products, setProducts] = useState(
    initialProducts.length > 0 ? initialProducts : [{ value: "AMC Renewal", label: "AMC Renewal" }]
  );
  const [callLeads, setCallLeads] = useState("Warm Leads");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [remark, setRemark] = useState("");

  // department / employee pickers (same pattern as AddSalesLeadPopUp)
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [hasMoreDepartments, setHasMoreDepartments] = useState(true);
  const [deptPage, setDeptPage] = useState(1);
  const [deptSearchTerm, setDeptSearchTerm] = useState("");

  const [assignedEmployee, setAssignedEmployee] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [hasMoreEmployees, setHasMoreEmployees] = useState(true);
  const [empPage, setEmpPage] = useState(1);
  const [empSearchTerm, setEmpSearchTerm] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const loadDepartments = useCallback(async (page = 1, search = "") => {
    try {
      const data = await getDepartment(page, PAGE_SIZE, search);
      if (data?.departments) {
        setDepartments((prev) => (page === 1 ? data.departments : [...prev, ...data.departments]));
        setHasMoreDepartments(data.departments.length === PAGE_SIZE);
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  const loadEmployees = useCallback(async (page = 1, search = "") => {
    if (!selectedDepartment) return;
    setLoadingEmployees(true);
    try {
      const data = await getEmployee(selectedDepartment.value, page, PAGE_SIZE, search);
      const arr = Array.isArray(data) ? data : data?.employee ?? data?.employees ?? data?.data ?? [];
      if (arr.length > 0) {
        const formatted = arr.map((e) => ({ value: e._id, label: e.name }));
        setEmployeeOptions((prev) => (page === 1 ? formatted : [...prev, ...formatted]));
        setHasMoreEmployees(arr.length === PAGE_SIZE);
      } else {
        if (page === 1) setEmployeeOptions([]);
        setHasMoreEmployees(false);
      }
    } catch (error) {
      console.log("Error fetching employees:", error);
      if (page === 1) toast.error("Failed to fetch employees");
    } finally {
      setLoadingEmployees(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (assignmentType === "employee") loadDepartments(1, deptSearchTerm);
  }, [assignmentType, loadDepartments, deptSearchTerm]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (record?.lost) return toast.error('This AMC is marked as Lost. Remove "Lost" first.');
    if (assignmentType === "employee" && !assignedEmployee) {
      return toast.error("Please select a Sales Employee");
    }
    if (!products || products.length === 0) {
      return toast.error("Please select at least one product");
    }

    const payload = {
      assignmentType,
      assignedTo: assignmentType === "employee" ? assignedEmployee.value : user?._id,
      products: products.map((p) => p.value).join(", "),
      callLeads,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : null,
      remark: remark.trim(),
    };

    setSubmitting(true);
    toast.loading(hasOpenLead ? "Re-assigning sales lead..." : "Creating sales lead...");
    const res = await assignAMCToSales(record._id, payload);
    toast.dismiss();
    setSubmitting(false);

    if (res?.success) {
      toast.success(res.message || "Assigned to Sales");
      handleClose(true);
    } else {
      toast.error(res?.error || "Failed to assign to Sales");
    }
  };

  const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1070 }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold mb-0">
                <i className="fa-solid fa-handshake me-2" style={{ color: "#16a34a" }}></i>
                {hasOpenLead ? "Re-assign AMC Sales Lead" : "Assign AMC to Sales"}
              </h5>
              <button onClick={() => handleClose(false)} type="button" className="btn-close" aria-label="Close"></button>
            </div>

            <div className="modal-body" style={{ maxHeight: "65vh", overflowY: "auto" }}>
              {/* AMC summary */}
              <div className="p-3 mb-3 rounded" style={{ background: "#f0f7ff", border: "1px solid #b8d0fd" }}>
                <div className="fw-bold" style={{ color: "#1e40af" }}>{record?.custName}</div>
                <div className="row mt-2" style={{ fontSize: "0.82rem" }}>
                  <div className="col-6 col-lg-4"><span className="text-muted">Contact:</span> {record?.customerContactPersonName1 || "N/A"}</div>
                  <div className="col-6 col-lg-4"><span className="text-muted">Phone:</span> {record?.phoneNumber1 || "N/A"}</div>
                  <div className="col-6 col-lg-4"><span className="text-muted">City:</span> {record?.billingAddress?.city || "N/A"}</div>
                  <div className="col-6 col-lg-4"><span className="text-muted">System:</span> {record?.system || "N/A"}</div>
                  <div className="col-6 col-lg-4"><span className="text-muted">AMC Start:</span> {fmtDate(record?.startDate)}</div>
                  <div className="col-6 col-lg-4"><span className="text-muted">AMC End:</span> {fmtDate(record?.endDate)}</div>
                </div>
              </div>

              {hasOpenLead && (
                <div className="alert alert-warning py-2" style={{ fontSize: "0.82rem" }}>
                  <i className="fa-solid fa-circle-info me-1"></i>
                  This AMC already has an open Sales lead
                  {existingLead?.assignedTo?.name || record?.salesAssignedToName
                    ? <> with <strong>{existingLead?.assignedTo?.name || record?.salesAssignedToName}</strong></>
                    : null}
                  {" "}(<strong>{existingLead.STATUS}</strong>). Submitting will <strong>re-assign</strong> the same lead, no duplicate is created.
                </div>
              )}

              {record?.lost && (
                <div className="alert alert-secondary py-2" style={{ fontSize: "0.82rem" }}>
                  <i className="fa-solid fa-ban me-1"></i>This AMC is marked as Lost. Edit the record and turn off "Lost" to assign it to Sales.
                </div>
              )}

              <div className="row g-3">
                {/* Assignment type */}
                <div className="col-12">
                  <label className="form-label fw-bold">Assign Lead To <RequiredStar /></label>
                  <div className="d-flex gap-4">
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="amcAssignType" id="amcAssignSelf"
                        value="self" checked={assignmentType === "self"} onChange={() => setAssignmentType("self")} />
                      <label className="form-check-label" htmlFor="amcAssignSelf">Self (Assign to me)</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="amcAssignType" id="amcAssignEmp"
                        value="employee" checked={assignmentType === "employee"} onChange={() => setAssignmentType("employee")} />
                      <label className="form-check-label" htmlFor="amcAssignEmp">Another Sales Employee</label>
                    </div>
                  </div>
                </div>

                {assignmentType === "employee" && (
                  <>
                    <div className="col-12 col-lg-6">
                      <label className="form-label">Department <RequiredStar /></label>
                      <Select
                        options={departments.map((d) => ({ value: d._id, label: d.name }))}
                        value={selectedDepartment}
                        onChange={(opt) => { setSelectedDepartment(opt); setAssignedEmployee(null); setEmployeeOptions([]); }}
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
                        menuPortalTarget={document.body}
                      />
                    </div>
                    <div className="col-12 col-lg-6">
                      <label className="form-label">Sales Employee <RequiredStar /></label>
                      <Select
                        options={employeeOptions}
                        value={assignedEmployee}
                        onChange={setAssignedEmployee}
                        isClearable
                        isLoading={loadingEmployees}
                        onInputChange={(val) => { setEmpSearchTerm(val); setEmpPage(1); }}
                        onMenuScrollToBottom={() => {
                          if (hasMoreEmployees && !loadingEmployees) {
                            const np = empPage + 1;
                            setEmpPage(np);
                            loadEmployees(np, empSearchTerm);
                          }
                        }}
                        placeholder="Select Employee..."
                        isDisabled={!selectedDepartment}
                        noOptionsMessage={() => (!selectedDepartment ? "Select a department first" : loadingEmployees ? "Loading..." : "No employees found")}
                        styles={selectStyles}
                        menuPortalTarget={document.body}
                      />
                    </div>
                  </>
                )}

                {/* Products */}
                <div className="col-12 col-lg-6">
                  <label className="form-label">Products <RequiredStar /></label>
                  <Select
                    isMulti
                    options={productOptions}
                    value={products}
                    onChange={(opts) => setProducts(opts || [])}
                    closeMenuOnSelect={false}
                    placeholder="Select Products..."
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                  />
                  <small className="text-muted">Shown as "Product" in Sales Master</small>
                </div>

                {/* Lead temperature */}
                <div className="col-12 col-lg-6">
                  <label className="form-label">Leads</label>
                  <select className="form-select rounded-0" value={callLeads} onChange={(e) => setCallLeads(e.target.value)}>
                    {callLeadOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* First follow-up */}
                <div className="col-12 col-lg-6">
                  <label className="form-label">First Follow-up Date <small className="text-muted">(optional)</small></label>
                  <input type="datetime-local" className="form-control rounded-0" min={minDateTime}
                    value={nextFollowUpDate} onChange={(e) => setNextFollowUpDate(e.target.value)} />
                </div>

                {/* Remark */}
                <div className="col-12">
                  <label className="form-label">Remark for Sales <small className="text-muted">(optional)</small></label>
                  <textarea className="form-control rounded-0" rows={2} maxLength={500}
                    value={remark} onChange={(e) => setRemark(e.target.value)}
                    placeholder="e.g. Customer wants renewal quote before month end..." />
                </div>
              </div>
            </div>

            <div className="modal-footer border-0 justify-content-start">
              <button type="submit" className="btn addbtn rounded-0 add_button px-4" disabled={submitting || record?.lost}>
                {submitting ? "Submitting..." : hasOpenLead ? "Re-assign" : "Assign to Sales"}
              </button>
              <button type="button" onClick={() => handleClose(false)} className="btn addbtn rounded-0 Cancel_button px-4">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignAMCToSalesPopUp;