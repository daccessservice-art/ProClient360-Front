import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import validator from "validator";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { createExhibitionVisit, getExhibitionsDropdown } from "../../../../../hooks/useExhibition";

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

  // ✅ NEW FIELDS
  const [visitorDesignation, setVisitorDesignation] = useState("");
  const [leadsType, setLeadsType] = useState("");
  const [product, setProduct] = useState("");

  // Fetch exhibitions for dropdown
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedExhibition || !customerName || !companyName || !mobile) {
      return toast.error("Please fill all required fields");
    }

    if (email && !validator.isEmail(email)) {
      return toast.error("Please enter a valid email address");
    }

    if (!/^\d{10,15}$/.test(mobile)) {
      return toast.error("Please enter a valid mobile number (10–15 digits)");
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
      product,
    };

    toast.loading("Recording visit...");
    const data = await createExhibitionVisit(payload);
    toast.dismiss();

    if (data.success) {
      toast.success(data.message);
      handleAdd();
    } else {
      toast.error(data.error || "Failed to record visit");
    }
  };

  const formatExhibitionLabel = (ex) => {
    const from = ex.dateFrom ? new Date(ex.dateFrom).toLocaleDateString('en-IN') : '';
    const to = ex.dateTo ? new Date(ex.dateTo).toLocaleDateString('en-IN') : '';
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

                {/* Select Exhibition */}
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Select Exhibition <RequiredStar />
                    </label>
                    <select
                      className="form-select rounded-0"
                      value={selectedExhibition}
                      onChange={(e) => setSelectedExhibition(e.target.value)}
                      required
                      disabled={exhibitionsLoading || !!preSelectedExhibition}
                    >
                      <option value="">
                        {exhibitionsLoading ? "⏳ Loading exhibitions..." : "-- Select Exhibition --"}
                      </option>
                      {exhibitions.map((ex) => (
                        <option key={ex._id} value={ex._id}>
                          {formatExhibitionLabel(ex)}
                        </option>
                      ))}
                    </select>

                    {/* Search */}
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
                        No exhibitions found. Please create an exhibition first.
                      </small>
                    )}
                  </div>
                </div>

                {/* Customer Name */}
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
                        if (/^[a-zA-Z\s]*$/.test(e.target.value)) setCustomerName(e.target.value);
                      }}
                      placeholder="Enter customer name..."
                      required
                    />
                  </div>
                </div>

                {/* Company Name */}
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

                {/* ✅ Visitor Designation */}
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

                {/* ✅ Leads Type */}
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

                {/* ✅ Product */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Product</label>
                    <select
                      className="form-select rounded-0"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                    >
                      <option value="">-- Select Product --</option>
                      <option value="CCTV System">CCTV System</option>
                      <option value="TA System">TA System</option>
                      <option value="Hajeri">Hajeri</option>
                      <option value="SmartFace">SmartFace</option>
                      <option value="ZKBioSecurity">ZKBioSecurity</option>
                      <option value="Surveillance System">Surveillance System</option>
                      <option value="Access Control System">Access Control System</option>
                      <option value="Turnkey Project">Turnkey Project</option>
                      <option value="Alleviz">Alleviz</option>
                      <option value="CafeLive">CafeLive</option>
                      <option value="WorksJoy">WorksJoy</option>
                      <option value="WorksJoy Blu">WorksJoy Blu</option>
                      <option value="Fire Alarm System">Fire Alarm System</option>
                      <option value="Fire Hydrant System">Fire Hydrant System</option>
                      <option value="IDS">IDS</option>
                      <option value="AI Face Machines">AI Face Machines</option>
                      <option value="Entrance Automation">Entrance Automation</option>
                      <option value="Guard Tour System">Guard Tour System</option>
                      <option value="Home Automation">Home Automation</option>
                      <option value="IP PA and Communication System">IP PA and Communication System</option>
                      <option value="CRM">CRM</option>
                      <option value="KMS">KMS</option>
                      <option value="VMS">VMS</option>
                      <option value="PMS">PMS</option>
                      <option value="Boom Barrier System">Boom Barrier System</option>
                      <option value="Tripod System">Tripod System</option>
                      <option value="Flap Barrier System">Flap Barrier System</option>
                      <option value="EPBX System">EPBX System</option>
                      <option value="CMS">CMS</option>
                      <option value="Lift Eliviter System">Lift Eliviter System</option>
                      <option value="AV6">AV6</option>
                      <option value="Walky Talky System">Walky Talky System</option>
                      <option value="Device Management System">Device Management System</option>
                    </select>
                  </div>
                </div>

                {/* Mobile */}
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
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 15) setMobile(val);
                      }}
                      placeholder="Enter mobile number..."
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Email</label>
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

                {/* Location */}
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

                {/* Follow-Up Date */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Follow-Up Call Date</label>
                    <input
                      type="date"
                      className="form-control rounded-0"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Remark */}
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

                {/* Buttons */}
                <div className="row">
                  <div className="col-12 pt-2 mt-2">
                    <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">
                      Add Visit
                    </button>
                    <button type="button" onClick={handleAdd} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
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