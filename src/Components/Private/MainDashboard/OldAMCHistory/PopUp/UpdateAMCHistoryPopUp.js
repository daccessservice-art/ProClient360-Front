import { useState } from "react";
import validator from "validator";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { updateOldAMCHistory } from "../../../../../hooks/useOldAMCHistory";

const industryOptions = [
  "IT & Software", "Manufacturing", "Construction & Infrastructure",
  "Healthcare", "Education", "Retail", "Banking & Finance",
  "Logistics & Supply Chain", "Hospitality", "Real Estate",
  "Government & Public Sector", "Energy & Utilities", "Telecom",
  "Pharmaceuticals", "Automotive", "Dealer", "Hotel", "Gym & Club",
  "Facility Services", "Labour Contractor", "Security Systems Dealer", "Other"
];

const REMARK_MAX_LENGTH = 2000;
const SYSTEM_MAX_LENGTH = 500; // ── NEW ──

const toDateInputValue = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  return d.toISOString().split("T")[0];
};

const UpdateAMCHistoryPopUp = ({ handleUpdate, selectedRecord }) => {
  const [record, setRecord] = useState({
    ...selectedRecord,
    billingAddress: {
      city: selectedRecord?.billingAddress?.city || "",
      state: selectedRecord?.billingAddress?.state || "",
      pincode: selectedRecord?.billingAddress?.pincode || "",
    },
    system: selectedRecord?.system || "", // ── NEW ──
    remark: selectedRecord?.remark || "",
    inProcess: !!selectedRecord?.inProcess,
    nextFollowUpDate: toDateInputValue(selectedRecord?.nextFollowUpDate),
    lost: !!selectedRecord?.lost,
    sentToSales: !!selectedRecord?.sentToSales, // ── NEW ──
    startDate: toDateInputValue(selectedRecord?.startDate),
    endDate: toDateInputValue(selectedRecord?.endDate),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRecord((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setRecord((prev) => ({ ...prev, billingAddress: { ...prev.billingAddress, [name]: value } }));
  };

  const handleCustNameChange = (e) => {
    if (/^[a-zA-Z0-9\s()&\-.]*$/.test(e.target.value)) {
      setRecord((prev) => ({ ...prev, custName: e.target.value }));
    }
  };
  const handlePhoneChange = (e) => {
    if (e.target.value.length <= 25) setRecord((prev) => ({ ...prev, phoneNumber1: e.target.value }));
  };
  const handlePincodeChange = (e) => {
    if (/^\d{0,6}$/.test(e.target.value)) {
      setRecord((prev) => ({ ...prev, billingAddress: { ...prev.billingAddress, pincode: e.target.value } }));
    }
  };
  const handleGSTChange = (e) => {
    setRecord((prev) => ({ ...prev, GSTNo: e.target.value.toUpperCase() }));
  };
  // ── NEW: System change handler with 500 char cap ──
  const handleSystemChange = (e) => {
    if (e.target.value.length <= SYSTEM_MAX_LENGTH) {
      setRecord((prev) => ({ ...prev, system: e.target.value }));
    }
  };
  const handleRemarkChange = (e) => {
    if (e.target.value.length <= REMARK_MAX_LENGTH) {
      setRecord((prev) => ({ ...prev, remark: e.target.value }));
    }
  };
  // In Process toggle — turning it OFF also clears the follow-up date
  const handleInProcessToggle = (e) => {
    const checked = e.target.checked;
    setRecord((prev) => ({
      ...prev,
      inProcess: checked,
      nextFollowUpDate: checked ? prev.nextFollowUpDate : "",
      lost: checked ? false : prev.lost, // ── NEW: In Process removes Lost ──
    }));
  };
  // ── NEW: selecting a follow-up date automatically turns In Process ON ──
  const handleFollowUpDateChange = (e) => {
    const value = e.target.value;
    setRecord((prev) => ({
      ...prev,
      nextFollowUpDate: value,
      inProcess: value ? true : prev.inProcess,
      lost: value ? false : prev.lost, // ── NEW ──
    }));
  };
  // ── NEW: Sales Lead toggle ──
  const handleSalesToggle = (e) => {
    const checked = e.target.checked;
    setRecord((prev) => ({ ...prev, sentToSales: checked }));
  };
  // Lost toggle — turns In Process OFF, clears follow-up, Remark becomes required ──
  const handleLostToggle = (e) => {
    const checked = e.target.checked;
    setRecord((prev) => ({
      ...prev,
      lost: checked,
      inProcess: checked ? false : prev.inProcess,
      nextFollowUpDate: checked ? "" : prev.nextFollowUpDate,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!record.custName || record.custName.trim() === "") {
      return toast.error("Customer Name is required");
    }
    if (record.email && !validator.isEmail(record.email)) {
      return toast.error("Enter a valid Email");
    }
    if (record.customerContactPersonEmail1 && !validator.isEmail(record.customerContactPersonEmail1)) {
      return toast.error("Enter a valid Contact Person Email 1");
    }
    if (record.startDate && record.endDate && new Date(record.endDate) < new Date(record.startDate)) {
      return toast.error("End Date cannot be before Start Date");
    }
    // ── NEW: System length guard ──
    if (record.system && record.system.length > SYSTEM_MAX_LENGTH) {
      return toast.error(`System cannot exceed ${SYSTEM_MAX_LENGTH} characters`);
    }
    // ── NEW: Remark required when Lost ──
    if (record.lost && !(record.remark || "").trim()) {
      return toast.error("Remark is required when marking the record as Lost");
    }
    if (record.remark && record.remark.length > REMARK_MAX_LENGTH) {
      return toast.error(`Remark cannot exceed ${REMARK_MAX_LENGTH} characters`);
    }

    const payload = {
      ...record,
      custName: record.custName.trim(),
      email: (record.email || "").trim(),
      system: (record.system || "").trim(), // ── NEW ──
      remark: (record.remark || "").trim(),
      lost: !!record.lost,
      sentToSales: !!record.sentToSales, // ── NEW ──
      inProcess: record.lost ? false : (!!record.inProcess || !!record.nextFollowUpDate),
      nextFollowUpDate: record.lost ? null : (record.nextFollowUpDate || null),
      startDate: record.startDate || null,
      endDate: record.endDate || null,
    };

    toast.loading("Updating AMC History Record...");
    const data = await updateOldAMCHistory(payload);
    toast.dismiss();

    if (data?.success) {
      toast.success(data.message || "Record updated successfully");
      handleUpdate();
    } else {
      toast.error(data?.error || "Failed to update record");
    }
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Update Old AMC History Record</h5>
              <button onClick={() => handleUpdate()} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Customer Name <RequiredStar /></label>
                    <input type="text" className="form-control rounded-0" maxLength={300}
                      name="custName" value={record.custName || ""} onChange={handleCustNameChange} required />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Customer Type</label>
                    <select className="form-select rounded-0" name="customerType" value={record.customerType || "main"} onChange={handleChange}>
                      <option value="main">Main</option>
                      <option value="branch">Branch</option>
                    </select>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Email</label>
                    <input type="email" className="form-control rounded-0" maxLength={100}
                      name="email" value={record.email || ""} onChange={handleChange} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Owned By</label>
                    <input type="text" className="form-control rounded-0" maxLength={100}
                      name="ownedBy" value={record.ownedBy || ""} onChange={handleChange} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Industry Type</label>
                    <select className="form-select rounded-0" name="industryType" value={record.industryType || ""} onChange={handleChange}>
                      <option value="">Select Industry Type</option>
                      {industryOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Customer Priority</label>
                    <select className="form-select rounded-0" name="customerPriority" value={record.customerPriority || ""} onChange={handleChange}>
                      <option value="">Select Priority</option>
                      <option value="P1">🔴 P1 — High Priority</option>
                      <option value="P2">🟡 P2 — Medium Priority</option>
                      <option value="P3">🟢 P3 — Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Contact Person Name 1</label>
                    <input type="text" className="form-control rounded-0" maxLength={100}
                      name="customerContactPersonName1" value={record.customerContactPersonName1 || ""} onChange={handleChange} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Contact Person No 1</label>
                    <input type="text" className="form-control rounded-0" maxLength={25}
                      name="phoneNumber1" value={record.phoneNumber1 || ""} onChange={handlePhoneChange} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Contact Person Email 1</label>
                    <input type="email" className="form-control rounded-0" maxLength={100}
                      name="customerContactPersonEmail1" value={record.customerContactPersonEmail1 || ""} onChange={handleChange} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Designation 1</label>
                    <input type="text" className="form-control rounded-0" maxLength={100}
                      name="customerContactPersonDesignation1" value={record.customerContactPersonDesignation1 || ""} onChange={handleChange} />
                  </div>
                </div>

                <div className="col-12 col-lg-4">
                  <div className="mb-3">
                    <label className="form-label label_text">City</label>
                    <input type="text" className="form-control rounded-0" maxLength={50}
                      name="city" value={record.billingAddress?.city || ""} onChange={handleAddressChange} />
                  </div>
                </div>

                <div className="col-12 col-lg-4">
                  <div className="mb-3">
                    <label className="form-label label_text">State</label>
                    <input type="text" className="form-control rounded-0" maxLength={50}
                      name="state" value={record.billingAddress?.state || ""} onChange={handleAddressChange} />
                  </div>
                </div>

                <div className="col-12 col-lg-4">
                  <div className="mb-3">
                    <label className="form-label label_text">Pincode</label>
                    <input type="text" className="form-control rounded-0" maxLength={6}
                      value={record.billingAddress?.pincode || ""} onChange={handlePincodeChange} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      GST Number <small className="text-muted">[If not available, put NA]</small>
                    </label>
                    <input type="text" className="form-control rounded-0 text-uppercase" maxLength={15}
                      name="GSTNo" value={record.GSTNo || ""} onChange={handleGSTChange} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Zone</label>
                    <select className="form-select rounded-0" name="zone" value={record.zone || ""} onChange={handleChange}>
                      <option value="">Select Zone</option>
                      <option value="South">South</option>
                      <option value="North">North</option>
                      <option value="East">East</option>
                      <option value="West">West</option>
                      <option value="Central">Central</option>
                    </select>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Start Date</label>
                    <input type="date" className="form-control rounded-0"
                      name="startDate" value={record.startDate || ""} onChange={handleChange} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">End Date</label>
                    <input type="date" className="form-control rounded-0"
                      name="endDate" value={record.endDate || ""} onChange={handleChange} />
                  </div>
                </div>

                {/* ── In Process toggle ── */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text d-block">Status</label>
                    <div className="form-check form-switch" style={{ paddingTop: "6px" }}>
                      <input className="form-check-input" type="checkbox" role="switch" id="inProcessSwitch"
                        style={{ cursor: "pointer" }}
                        checked={!!record.inProcess} onChange={handleInProcessToggle} />
                      <label className="form-check-label label_text" htmlFor="inProcessSwitch" style={{ cursor: "pointer" }}>
                        {record.inProcess
                          ? <span className="badge" style={{ background: "#1d4ed8" }}><i className="fa-solid fa-hourglass-half me-1"></i>In Process</span>
                          : <span className="text-muted">Not In Process</span>}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Next Follow-up Date (selecting it turns In Process ON automatically) */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Next Follow-up Date <small className="text-muted">(auto sets In Process)</small>
                    </label>
                    <input type="date" className="form-control rounded-0"
                      name="nextFollowUpDate" value={record.nextFollowUpDate || ""} onChange={handleFollowUpDateChange} />
                  </div>
                </div>

                {/* ── NEW: Lost toggle ── */}
                <div className="col-12">
                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" role="switch" id="lostSwitch"
                        style={{ cursor: "pointer", ...(record.lost ? { backgroundColor: "#475569", borderColor: "#475569" } : {}) }}
                        checked={!!record.lost} onChange={handleLostToggle} />
                      <label className="form-check-label label_text" htmlFor="lostSwitch" style={{ cursor: "pointer" }}>
                        {record.lost
                          ? <span className="badge" style={{ background: "#475569" }}><i className="fa-solid fa-ban me-1"></i>Lost</span>
                          : <span className="text-muted">Mark as Lost</span>}
                        <small className="text-muted ms-2">(Remark is required)</small>
                      </label>
                    </div>
                  </div>
                </div>

                {/* ── NEW: Sales Lead toggle ── */}
                <div className="col-12">
                  <div className="mb-3 p-2" style={{
                    border: record.sentToSales ? "1px solid #16a34a" : "1px dashed #cbd5e1",
                    background: record.sentToSales ? "rgba(22,163,74,0.06)" : "transparent",
                  }}>
                    <div className="form-check form-switch mb-0">
                      <input className="form-check-input" type="checkbox" role="switch" id="salesSwitch"
                        style={{ cursor: "pointer", ...(record.sentToSales ? { backgroundColor: "#16a34a", borderColor: "#16a34a" } : {}) }}
                        checked={!!record.sentToSales} onChange={handleSalesToggle} />
                      <label className="form-check-label label_text" htmlFor="salesSwitch" style={{ cursor: "pointer" }}>
                        {record.sentToSales
                          ? <span className="badge" style={{ background: "#16a34a" }}><i className="fa-solid fa-handshake me-1"></i>Assigned to Sales</span>
                          : <span className="text-muted">Send to Sales Leads</span>}
                      </label>
                    </div>
                    <small className="d-block text-muted mt-1">
                      {record.sentToSales
                        ? (selectedRecord?.sentToSales && selectedRecord?.sentToSalesAt
                            ? `Sent to Sales on ${new Date(selectedRecord.sentToSalesAt).toLocaleDateString()}${selectedRecord.sentToSalesByName ? ` by ${selectedRecord.sentToSalesByName}` : ""}`
                            : "This AMC will be marked as a Sales lead when you click Update.")
                        : "Turn on to show everyone that this AMC is assigned to the Sales team."}
                    </small>
                  </div>
                </div>

                {/* System field */}
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      System <small className="text-muted">({(record.system || "").length}/{SYSTEM_MAX_LENGTH})</small>
                    </label>
                    <input type="text" className="form-control rounded-0" maxLength={SYSTEM_MAX_LENGTH}
                      name="system" value={record.system || ""} onChange={handleSystemChange}
                      placeholder="Enter System (e.g. CCTV, Fire Alarm, Access Control)..." />
                  </div>
                </div>

                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Remark {record.lost && <RequiredStar />}{" "}
                      <small className="text-muted">({(record.remark || "").length}/{REMARK_MAX_LENGTH})</small>
                    </label>
                    <textarea
                      className={`form-control rounded-0 ${record.lost && !(record.remark || "").trim() ? "is-invalid" : ""}`}
                      rows={3} maxLength={REMARK_MAX_LENGTH}
                      name="remark" value={record.remark || ""} onChange={handleRemarkChange}
                      placeholder={record.lost ? "Why was this AMC lost? (required)" : "Enter any remark/note..."} />
                    {record.lost && !(record.remark || "").trim() && (
                      <div className="invalid-feedback">Remark is required when marking as Lost</div>
                    )}
                  </div>
                </div>

                <div className="row">
                  <div className="col-12 pt-3 mt-2">
                    <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">Update</button>
                    <button type="button" onClick={handleUpdate} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">Cancel</button>
                  </div>
                </div>

              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateAMCHistoryPopUp;