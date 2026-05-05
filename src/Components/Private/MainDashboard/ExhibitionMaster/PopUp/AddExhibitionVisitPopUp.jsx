// Components/Private/MainDashboard/ExhibitionMaster/PopUp/AddExhibitionVisitPopUp.jsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import validator from "validator";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { createExhibitionVisit, getExhibitionsDropdown } from "../../../../../hooks/useExhibition";

// ─── Full product list ────────────────────────────────────────────────────────
const PRODUCT_OPTIONS = [
  "CCTV System",
  "TA System",
  "Hajeri",
  "SmartFace",
  "ZKBioSecurity",
  "Surveillance System",
  "Access Control System",
  "Turnkey Project",
  "Alleviz",
  "CafeLive",
  "WorksJoy",
  "WorksJoy Blu",
  "Fire Alarm System",
  "Fire Hydrant System",
  "IDS",
  "AI Face Machines",
  "Entrance Automation",
  "Guard Tour System",
  "Home Automation",
  "IP PA and Communication System",
  "CRM",
  "KMS",
  "VMS",
  "PMS",
  "Boom Barrier System",
  "Tripod System",
  "Flap Barrier System",
  "EPBX System",
  "CMS",
  "Lift Eliviter System",
  "AV6",
  "Walky Talky System",
  "Device Management System",
  "VisionIQ",
  "CineMind",
  "Extracto",
  "Virtual Agent",
];

// ─── Component ────────────────────────────────────────────────────────────────
const AddExhibitionVisitPopUp = ({ handleAdd, preSelectedExhibition }) => {
  const [exhibitions, setExhibitions] = useState([]);
  const [exhibitionsLoading, setExhibitionsLoading] = useState(false);
  const [searchExhibition, setSearchExhibition] = useState("");

  const [selectedExhibition, setSelectedExhibition] = useState(preSelectedExhibition?._id || "");
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [remark, setRemark] = useState("");

  const [visitorDesignation, setVisitorDesignation] = useState("");
  const [leadsType, setLeadsType] = useState("");

  // ✅ Product: supports "Other" with custom text
  const [product, setProduct] = useState("");
  const [isOtherProduct, setIsOtherProduct] = useState(false);
  const [otherProductText, setOtherProductText] = useState("");

  // ✅ Min date for follow-up = today
  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch exhibitions dropdown — only current/future (handled by backend now)
  useEffect(() => {
    const fetchExhibitions = async () => {
      setExhibitionsLoading(true);
      const data = await getExhibitionsDropdown(searchExhibition);
      if (data.success) {
        setExhibitions(data.exhibitions || []);
      }
      setExhibitionsLoading(false);
    };

    const timeout = setTimeout(fetchExhibitions, 300);
    return () => clearTimeout(timeout);
  }, [searchExhibition]);

  // ✅ Handle product dropdown change
  const handleProductChange = (e) => {
    const val = e.target.value;
    if (val === "__other__") {
      setIsOtherProduct(true);
      setProduct("");
    } else {
      setIsOtherProduct(false);
      setOtherProductText("");
      setProduct(val);
    }
  };

  // ✅ Validate selected exhibition is not past
  const validateExhibitionDate = () => {
    if (!selectedExhibition) return true; // handled by required check
    const ex = exhibitions.find((e) => e._id === selectedExhibition);
    if (!ex) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (ex.dateTo && new Date(ex.dateTo) < today) {
      toast.error("Selected exhibition has already ended. Please choose a current or upcoming exhibition.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedExhibition || !customerName || !companyName || !mobile) {
      return toast.error("Please fill all required fields");
    }

    if (!validateExhibitionDate()) return;

    if (email && !validator.isEmail(email)) {
      return toast.error("Please enter a valid email address");
    }

    if (!/^\d{10,15}$/.test(mobile)) {
      return toast.error("Please enter a valid mobile number (10–15 digits)");
    }

    // ✅ Resolve final product value
    const finalProduct = isOtherProduct
      ? otherProductText.trim()
      : product;

    if (isOtherProduct && !otherProductText.trim()) {
      return toast.error("Please enter the product name");
    }

    const payload = {
      exhibition: selectedExhibition,
      customerName,
      companyName,
      mobile,
      email,
      location,
      followUpDate: followUpDate || undefined,
      remark,
      visitorDesignation,
      leadsType,
      product: finalProduct,
    };

    toast.loading("Recording visit...");
    const data = await createExhibitionVisit(payload);
    toast.dismiss();

    if (data.success) {
      toast.success(data.message);
      if (email) {
        toast.success("Thank-you email sent to customer 📧", { duration: 3000 });
      }
      handleAdd();
    } else {
      toast.error(data.error || "Failed to record visit");
    }
  };

  const formatExhibitionLabel = (ex) => {
    const from = ex.dateFrom ? new Date(ex.dateFrom).toLocaleDateString("en-IN") : "";
    const to   = ex.dateTo   ? new Date(ex.dateTo).toLocaleDateString("en-IN")   : "";
    return `${ex.exhibitionName} — ${ex.city} (${from} to ${to})`;
  };

  return (
    <div
      className="modal fade show"
      style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Add Exhibition Visit</h5>
              <button
                onClick={handleAdd}
                type="button"
                className="close px-3"
                style={{ marginLeft: "auto" }}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">

                {/* ── Select Exhibition ── */}
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Select Exhibition <RequiredStar />
                      <small className="text-muted ms-2">(Current & upcoming only)</small>
                    </label>
                    <select
                      className="form-select rounded-0"
                      value={selectedExhibition}
                      onChange={(e) => setSelectedExhibition(e.target.value)}
                      required
                      disabled={exhibitionsLoading || !!preSelectedExhibition}
                    >
                      <option value="">
                        {exhibitionsLoading
                          ? "⏳ Loading exhibitions..."
                          : "-- Select Exhibition --"}
                      </option>
                      {exhibitions.map((ex) => (
                        <option key={ex._id} value={ex._id}>
                          {formatExhibitionLabel(ex)}
                        </option>
                      ))}
                    </select>

                    {!preSelectedExhibition && (
                      <div className="mt-1">
                        <input
                          type="text"
                          className="form-control rounded-0 form-control-sm"
                          placeholder="🔍 Search exhibition by name..."
                          value={searchExhibition}
                          onChange={(e) => setSearchExhibition(e.target.value)}
                        />
                      </div>
                    )}

                    {!exhibitionsLoading && exhibitions.length === 0 && (
                      <small className="text-warning">
                        No current or upcoming exhibitions found. Please create an exhibition first.
                      </small>
                    )}
                  </div>
                </div>

                {/* ── Customer Name ── */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Customer Name <RequiredStar />
                    </label>
                    <input
                      type="text"
                      className="form-control rounded-0"
                      maxLength={200}
                      value={customerName}
                      onChange={(e) => {
                        if (/^[a-zA-Z\s]*$/.test(e.target.value))
                          setCustomerName(e.target.value);
                      }}
                      placeholder="Enter customer name..."
                      required
                    />
                  </div>
                </div>

                {/* ── Company Name ── */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Company Name <RequiredStar />
                    </label>
                    <input
                      type="text"
                      className="form-control rounded-0"
                      maxLength={200}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter company name..."
                      required
                    />
                  </div>
                </div>

                {/* ── Visitor Designation ── */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Visitor Designation</label>
                    <input
                      type="text"
                      className="form-control rounded-0"
                      maxLength={150}
                      value={visitorDesignation}
                      onChange={(e) => setVisitorDesignation(e.target.value)}
                      placeholder="e.g. Manager, Director, CEO..."
                    />
                  </div>
                </div>

                {/* ── Leads Type ── */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Leads Type</label>
                    <select
                      className="form-select rounded-0"
                      value={leadsType}
                      onChange={(e) => setLeadsType(e.target.value)}
                    >
                      <option value="">-- Select Leads Type --</option>
                      <option value="Hot Leads">🔴 Hot Leads</option>
                      <option value="Warm Leads">🟡 Warm Leads</option>
                      <option value="Cold Leads">🔵 Cold Leads</option>
                    </select>
                  </div>
                </div>

                {/* ── Product ── */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Product</label>
                    <select
                      className="form-select rounded-0"
                      value={isOtherProduct ? "__other__" : product}
                      onChange={handleProductChange}
                    >
                      <option value="">-- Select Product --</option>
                      {PRODUCT_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                      {/* ✅ Other option */}
                      <option value="__other__">✏️ Other (Type manually)</option>
                    </select>

                    {/* ✅ Show text input when "Other" is selected */}
                    {isOtherProduct && (
                      <input
                        type="text"
                        className="form-control rounded-0 mt-2"
                        maxLength={200}
                        value={otherProductText}
                        onChange={(e) => setOtherProductText(e.target.value)}
                        placeholder="Type product name..."
                        autoFocus
                      />
                    )}
                  </div>
                </div>

                {/* ── Mobile ── */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Mobile <RequiredStar />
                    </label>
                    <input
                      type="tel"
                      className="form-control rounded-0"
                      maxLength={15}
                      value={mobile}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        if (val.length <= 15) setMobile(val);
                      }}
                      placeholder="Enter mobile number..."
                      required
                    />
                  </div>
                </div>

                {/* ── Email ── */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Email
                      <small className="text-success ms-2">
                        📧 Thank-you email will be sent
                      </small>
                    </label>
                    <input
                      type="email"
                      className="form-control rounded-0"
                      maxLength={100}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address..."
                    />
                  </div>
                </div>

                {/* ── Location ── */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Location</label>
                    <input
                      type="text"
                      className="form-control rounded-0"
                      maxLength={300}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter location / city..."
                    />
                  </div>
                </div>

                {/* ── Follow-Up Date ── */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Follow-Up Call Date</label>
                    <input
                      type="date"
                      className="form-control rounded-0"
                      value={followUpDate}
                      min={todayStr}  // ✅ Cannot select past dates
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                    <small className="text-muted">Follow-up date must be today or later</small>
                  </div>
                </div>

                {/* ── Remark ── */}
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label label_text">Remark</label>
                    <textarea
                      className="textarea_edit col-12"
                      maxLength={1000}
                      rows={3}
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="Enter any remarks or notes..."
                    />
                  </div>
                </div>

                {/* ── Buttons ── */}
                <div className="row">
                  <div className="col-12 pt-2 mt-2">
                    <button
                      type="submit"
                      className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                    >
                      Add Visit
                    </button>
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4"
                    >
                      Cancel
                    </button>
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

export default AddExhibitionVisitPopUp;