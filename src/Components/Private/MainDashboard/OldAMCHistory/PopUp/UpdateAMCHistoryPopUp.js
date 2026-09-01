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

const REMARK_MAX_LENGTH = 2000; // ── NEW ──

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
    remark: selectedRecord?.remark || "", // ── NEW ──
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
  // ── NEW: Remark change handler with 2000 char cap ──
  const handleRemarkChange = (e) => {
    if (e.target.value.length <= REMARK_MAX_LENGTH) {
      setRecord((prev) => ({ ...prev, remark: e.target.value }));
    }
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
    // ── NEW: Remark length guard ──
    if (record.remark && record.remark.length > REMARK_MAX_LENGTH) {
      return toast.error(`Remark cannot exceed ${REMARK_MAX_LENGTH} characters`);
    }

    const payload = {
      ...record,
      custName: record.custName.trim(),
      email: (record.email || "").trim(),
      remark: (record.remark || "").trim(), // ── NEW ──
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

                {/* ── NEW: Remark field ── */}
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Remark <small className="text-muted">({(record.remark || "").length}/{REMARK_MAX_LENGTH})</small>
                    </label>
                    <textarea className="form-control rounded-0" rows={3} maxLength={REMARK_MAX_LENGTH}
                      name="remark" value={record.remark || ""} onChange={handleRemarkChange}
                      placeholder="Enter any remark/note..." />
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