import { useState } from "react";
import validator from "validator";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { createOldAMCHistory } from "../../../../../hooks/useOldAMCHistory";

const industryOptions = [
  "IT & Software", "Manufacturing", "Construction & Infrastructure",
  "Healthcare", "Education", "Retail", "Banking & Finance",
  "Logistics & Supply Chain", "Hospitality", "Real Estate",
  "Government & Public Sector", "Energy & Utilities", "Telecom",
  "Pharmaceuticals", "Automotive", "Dealer", "Hotel", "Gym & Club",
  "Facility Services", "Labour Contractor", "Security Systems Dealer", "Other"
];

const REMARK_MAX_LENGTH = 2000; // ── NEW ──

const AddAMCHistoryPopUp = ({ handleAdd }) => {
  const [custName, setCustName] = useState("");
  const [customerType, setCustomerType] = useState("main");
  const [email, setEmail] = useState("");
  const [ownedBy, setOwnedBy] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [customerPriority, setCustomerPriority] = useState("");
  const [customerContactPersonName1, setCustomerContactPersonName1] = useState("");
  const [phoneNumber1, setPhoneNumber1] = useState("");
  const [customerContactPersonEmail1, setCustomerContactPersonEmail1] = useState("");
  const [customerContactPersonDesignation1, setCustomerContactPersonDesignation1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [GSTNo, setGSTNo] = useState("");
  const [zone, setZone] = useState("");
  const [remark, setRemark] = useState(""); // ── NEW ──
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleCustNameChange = (e) => {
    if (/^[a-zA-Z0-9\s()&\-.]*$/.test(e.target.value)) setCustName(e.target.value);
  };
  const handlePhoneChange = (e) => {
    if (e.target.value.length <= 25) setPhoneNumber1(e.target.value);
  };
  const handlePincodeChange = (e) => {
    if (/^\d{0,6}$/.test(e.target.value)) setPincode(e.target.value);
  };
  // ── NEW: Remark change handler with 2000 char cap ──
  const handleRemarkChange = (e) => {
    if (e.target.value.length <= REMARK_MAX_LENGTH) setRemark(e.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!custName.trim()) {
      return toast.error("Customer Name is required");
    }
    if (email && !validator.isEmail(email)) {
      return toast.error("Enter a valid Email");
    }
    if (customerContactPersonEmail1 && !validator.isEmail(customerContactPersonEmail1)) {
      return toast.error("Enter a valid Contact Person Email 1");
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return toast.error("End Date cannot be before Start Date");
    }
    // ── NEW: Remark length guard ──
    if (remark && remark.length > REMARK_MAX_LENGTH) {
      return toast.error(`Remark cannot exceed ${REMARK_MAX_LENGTH} characters`);
    }

    const payload = {
      custName: custName.trim(),
      customerType,
      email: email.trim(),
      ownedBy: ownedBy.trim(),
      industryType,
      customerPriority,
      customerContactPersonName1: customerContactPersonName1.trim(),
      phoneNumber1: phoneNumber1.trim(),
      customerContactPersonEmail1: customerContactPersonEmail1.trim(),
      customerContactPersonDesignation1: customerContactPersonDesignation1.trim(),
      billingAddress: { city: city.trim(), state: state.trim(), pincode: pincode.trim() },
      GSTNo: GSTNo.trim(),
      zone,
      remark: remark.trim(), // ── NEW ──
      startDate: startDate || null,
      endDate: endDate || null,
    };

    toast.loading("Adding AMC History Record...");
    const data = await createOldAMCHistory(payload);
    toast.dismiss();

    if (data?.success) {
      toast.success(data.message || "Record added successfully");
      handleAdd();
    } else {
      toast.error(data?.error || "Failed to add record");
    }
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Add Old AMC History Record</h5>
              <button onClick={() => handleAdd()} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Customer Name <RequiredStar /></label>
                    <input type="text" className="form-control rounded-0" maxLength={300}
                      value={custName} onChange={handleCustNameChange}
                      placeholder="Enter Customer Name..." required />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Customer Type</label>
                    <select className="form-select rounded-0" value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
                      <option value="main">Main</option>
                      <option value="branch">Branch</option>
                    </select>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Email</label>
                    <input type="email" className="form-control rounded-0" maxLength={100}
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter Email..." />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Owned By</label>
                    <input type="text" className="form-control rounded-0" maxLength={100}
                      value={ownedBy} onChange={(e) => setOwnedBy(e.target.value)}
                      placeholder="Enter Owner Name..." />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Industry Type</label>
                    <select className="form-select rounded-0" value={industryType} onChange={(e) => setIndustryType(e.target.value)}>
                      <option value="">Select Industry Type</option>
                      {industryOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Customer Priority</label>
                    <select className="form-select rounded-0" value={customerPriority} onChange={(e) => setCustomerPriority(e.target.value)}>
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
                      value={customerContactPersonName1} onChange={(e) => setCustomerContactPersonName1(e.target.value)}
                      placeholder="Enter Contact Person Name..." />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Contact Person No 1</label>
                    <input type="text" className="form-control rounded-0" maxLength={25}
                      value={phoneNumber1} onChange={handlePhoneChange}
                      placeholder="Enter Contact Number..." />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Contact Person Email 1</label>
                    <input type="email" className="form-control rounded-0" maxLength={100}
                      value={customerContactPersonEmail1} onChange={(e) => setCustomerContactPersonEmail1(e.target.value)}
                      placeholder="Enter contact email..." />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Designation 1</label>
                    <input type="text" className="form-control rounded-0" maxLength={100}
                      value={customerContactPersonDesignation1} onChange={(e) => setCustomerContactPersonDesignation1(e.target.value)}
                      placeholder="e.g. Manager, Director..." />
                  </div>
                </div>

                <div className="col-12 col-lg-4">
                  <div className="mb-3">
                    <label className="form-label label_text">City</label>
                    <input type="text" className="form-control rounded-0" maxLength={50}
                      value={city} onChange={(e) => setCity(e.target.value)}
                      placeholder="Enter City..." />
                  </div>
                </div>

                <div className="col-12 col-lg-4">
                  <div className="mb-3">
                    <label className="form-label label_text">State</label>
                    <input type="text" className="form-control rounded-0" maxLength={50}
                      value={state} onChange={(e) => setState(e.target.value)}
                      placeholder="Enter State..." />
                  </div>
                </div>

                <div className="col-12 col-lg-4">
                  <div className="mb-3">
                    <label className="form-label label_text">Pincode</label>
                    <input type="text" className="form-control rounded-0" maxLength={6}
                      value={pincode} onChange={handlePincodeChange}
                      placeholder="Enter 6-digit Pincode..." />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      GST Number <small className="text-muted">[If not available, put NA]</small>
                    </label>
                    <input type="text" className="form-control rounded-0 text-uppercase" maxLength={15}
                      value={GSTNo} onChange={(e) => setGSTNo(e.target.value.toUpperCase())}
                      placeholder="Enter GST Number..." />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Zone</label>
                    <select className="form-select rounded-0" value={zone} onChange={(e) => setZone(e.target.value)}>
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
                      value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">End Date</label>
                    <input type="date" className="form-control rounded-0"
                      value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                {/* ── NEW: Remark field ── */}
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Remark <small className="text-muted">({remark.length}/{REMARK_MAX_LENGTH})</small>
                    </label>
                    <textarea className="form-control rounded-0" rows={3} maxLength={REMARK_MAX_LENGTH}
                      value={remark} onChange={handleRemarkChange}
                      placeholder="Enter any remark/note..." />
                  </div>
                </div>

                <div className="row">
                  <div className="col-12 pt-3 mt-2">
                    <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">Add</button>
                    <button type="button" onClick={handleAdd} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">Cancel</button>
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

export default AddAMCHistoryPopUp;