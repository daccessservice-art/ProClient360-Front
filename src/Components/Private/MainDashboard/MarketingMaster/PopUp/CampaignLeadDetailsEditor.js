// ✅ NEW — lets the marketing user fill the missing details of a
//    WhatsApp-campaign lead (only name + mobile came from the campaign)
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5443";

const FIELDS = [
  ["SENDER_NAME", "Contact Name", 50],
  ["SENDER_MOBILE", "Mobile", 10],
  ["SENDER_COMPANY", "Company Name", 100],
  ["SENDER_EMAIL", "Email", 100],
  ["QUERY_PRODUCT_NAME", "Product", 100],
  ["SUBJECT", "Subject", 200],
  ["SENDER_CITY", "City", 50],
  ["SENDER_STATE", "State", 50],
  ["SENDER_PINCODE", "Pincode", 6],
  ["SENDER_COUNTRY_ISO", "Country", 50],
];

const CampaignLeadDetailsEditor = ({ lead, onSaved }) => {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const f = {};
    [...FIELDS.map(([k]) => k), "SENDER_ADDRESS", "QUERY_MESSAGE"].forEach((k) => (f[k] = lead?.[k] || ""));
    setForm(f);
  }, [lead]);

  const setField = (key, value) => {
    if (key === "SENDER_MOBILE") value = value.replace(/\D/g, "").slice(0, 10);
    if (key === "SENDER_PINCODE") value = value.replace(/\D/g, "").slice(0, 6);
    setForm((p) => ({ ...p, [key]: value }));
  };

  // stop "Enter" from submitting the outer Assign form
  const blockEnter = (e) => { if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") e.preventDefault(); };

  const handleSave = async () => {
    if (!String(form.SENDER_NAME || "").trim()) return toast.error("Contact name is required.");
    if (!/^\d{10}$/.test(form.SENDER_MOBILE || "")) return toast.error("Mobile number must be 10 digits.");
    if (form.SENDER_PINCODE && !/^\d{6}$/.test(form.SENDER_PINCODE)) return toast.error("Pincode must be 6 digits.");

    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/api/leads/campaign-lead-details/${lead._id}`, form, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Details saved");
        onSaved && onSaved(res.data.data);
      } else {
        toast.error(res.data?.error || "Failed to save details");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded p-3 mt-2" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
      <div className="d-flex justify-content-between align-items-center" style={{ cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <h6 className="fw-bold mb-0" style={{ color: "#166534" }}>
          <i className="fa-brands fa-whatsapp me-2"></i>Customer Details (WhatsApp Campaign lead)
        </h6>
        <i className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"} text-muted`}></i>
      </div>

      {open && (
        <>
          <small className="text-muted d-block mt-1 mb-2">
            Only name &amp; mobile came from the campaign — call the customer and fill the rest, then click <strong>Save Details</strong>.
          </small>
          <div className="row g-2">
            {FIELDS.map(([key, label, max]) => (
              <div className="col-12 col-md-6" key={key}>
                <label className="form-label mb-0" style={{ fontSize: "0.8rem", fontWeight: 600 }}>{label}</label>
                <input
                  type={key === "SENDER_EMAIL" ? "email" : "text"}
                  className="form-control form-control-sm"
                  maxLength={max}
                  inputMode={key === "SENDER_MOBILE" || key === "SENDER_PINCODE" ? "numeric" : undefined}
                  value={form[key] || ""}
                  onChange={(e) => setField(key, e.target.value)}
                  onKeyDown={blockEnter}
                />
              </div>
            ))}
            <div className="col-12">
              <label className="form-label mb-0" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Address</label>
              <textarea className="form-control form-control-sm" rows={2} maxLength={500}
                value={form.SENDER_ADDRESS || ""} onChange={(e) => setField("SENDER_ADDRESS", e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label mb-0" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Requirement / Message</label>
              <textarea className="form-control form-control-sm" rows={2} maxLength={500}
                value={form.QUERY_MESSAGE || ""} onChange={(e) => setField("QUERY_MESSAGE", e.target.value)} />
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-success mt-2" onClick={handleSave} disabled={saving}>
            <i className="fa-solid fa-floppy-disk me-1"></i>{saving ? "Saving..." : "Save Details"}
          </button>
        </>
      )}
    </div>
  );
};

export default CampaignLeadDetailsEditor;