import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import "./CustomerTicketModal.css";

// ✅ FIX 1: Use env variable, not hardcoded localhost
const API_BASE = process.env.REACT_APP_API_URL || "";

const CustomerTicketModal = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [customer, setCustomer] = useState(null);
  const [product, setProduct] = useState("");
  const [complaint, setComplaint] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState("");

  // ✅ FIX 2: Products must exactly match ticketSchema enum values
  const products = [
    "Surveillance System",
    "CCTV System",
    "TA System",
    "Hajeri",
    "SmartFace",
    "ZKBioSecurity",
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
    "LAN Cabling Activity",
  ];

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/customer-ticket/send-otp`,
        { mobile }
      );
      if (res.data.success) {
        toast.success("OTP sent to your registered Email");
        setStep(2);
      } else {
        toast.error(res.data.message || "Mobile number not found");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/customer-ticket/verify-otp`,
        { mobile, otp }
      );
      if (res.data.success) {
        setCustomer(res.data.customer);
        setStep(3);
        toast.success("OTP verified");
      } else {
        toast.error(res.data.message || "Incorrect OTP");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Connection Error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!product) {
      toast.error("Please select a product");
      return;
    }
    if (!complaint.trim()) {
      toast.error("Please enter your complaint");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/customer-ticket/raise-ticket`,
        { mobile, product, complaint }
      );
      if (res.data.success) {
        setTicketId(res.data.ticketId);
        setStep(4);
        toast.success("Ticket raised successfully!");
      } else {
        toast.error(res.data.message || "Failed to raise ticket");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to raise ticket. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setMobile("");
    setOtp("");
    setCustomer(null);
    setProduct("");
    setComplaint("");
    setTicketId("");
    onClose();
  };

  return (
    <div className="ctm-overlay" onClick={handleClose}>
      <div className="ctm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ctm-close-btn" onClick={handleClose}>×</button>

        <div className="ctm-progress">
          <div className={`ctm-dot ${step >= 1 ? "active" : ""}`}>1</div>
          <div className={`ctm-line ${step >= 2 ? "active" : ""}`}></div>
          <div className={`ctm-dot ${step >= 2 ? "active" : ""}`}>2</div>
          <div className={`ctm-line ${step >= 3 ? "active" : ""}`}></div>
          <div className={`ctm-dot ${step >= 3 ? "active" : ""}`}>3</div>
          <div className={`ctm-line ${step >= 4 ? "active" : ""}`}></div>
          <div className={`ctm-dot ${step >= 4 ? "active" : ""}`}>4</div>
        </div>

        {step === 1 && (
          <div className="ctm-step">
            <h2>Customer Support</h2>
            <p className="ctm-subtitle">
              Enter your registered mobile number to raise a complaint
            </p>
            <input
              type="text"
              maxLength="10"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              placeholder="10-digit mobile number"
              className="ctm-input"
            />
            <button className="ctm-btn" onClick={handleSendOtp} disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="ctm-step">
            <h2>Verify OTP</h2>
            <p className="ctm-subtitle">
              We sent a 6-digit OTP to your registered <b>Email</b>
            </p>
            <input
              type="text"
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit OTP"
              className="ctm-input ctm-otp-input"
            />
            <p className="ctm-hint">
              Not received? Contact{" "}
              <a href="mailto:info@proclient360.com">info@proclient360.com</a>
            </p>
            <button className="ctm-btn" onClick={handleVerifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <button
              className="ctm-back-btn"
              onClick={() => { setStep(1); setOtp(""); }}
            >
              ← Back
            </button>
          </div>
        )}

        {step === 3 && customer && (
          <div className="ctm-step">
            <h2>Raise Complaint</h2>
            <div className="ctm-customer-info">
              <p><b>Name:</b> {customer.custName}</p>
              <p><b>Email:</b> {customer.email}</p>
              {customer.address && <p><b>Address:</b> {customer.address}</p>}
            </div>

            <label>Product *</label>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="ctm-input"
            >
              <option value="">-- Select Product --</option>
              {products.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <label>Complaint *</label>
            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Describe your complaint..."
              rows={4}
              className="ctm-input ctm-textarea"
            />
            <button className="ctm-btn" onClick={handleSubmitTicket} disabled={loading}>
              {loading ? "Submitting..." : "Submit Complaint"}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="ctm-step ctm-success">
            <div className="ctm-success-icon">✓</div>
            <h2>Ticket Raised Successfully!</h2>
            <p>Your complaint has been registered.</p>
            <div className="ctm-ticket-id">
              Ticket ID: <b>{ticketId}</b>
            </div>
            <p className="ctm-hint">
              Our team will contact you shortly. Please note your Ticket ID.
            </p>
            <button className="ctm-btn" onClick={handleClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerTicketModal;