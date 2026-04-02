import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";

// ── HR Review Criteria (8 fields) ────────────────────────────────────────────
const HR_REVIEW_CRITERIA = [
  { key: "respect",          label: "Respect towards team members",                icon: "🤝" },
  { key: "attitude",         label: "Positive and cooperative attitude",            icon: "😊" },
  { key: "professionalism",  label: "Maintains professional behavior at workplace", icon: "👔" },
  { key: "teamContribution", label: "Contribution to team goals & productivity",    icon: "🎯" },
  { key: "hrCompliance",     label: "Follows HR rules and company policies",        icon: "📜" },
  { key: "responsibility",   label: "Responsibility in handling tasks and duties",  icon: "✅" },
  { key: "communication",    label: "Proactive communication (absence/delays)",     icon: "💬" },
  { key: "relationships",    label: "Maintains healthy working relationships",      icon: "🌱" },
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const ratingColor = (r) => {
  const n = parseFloat(r);
  if (n >= 4.5) return { bg: "#dcfce7", color: "#16a34a" };
  if (n >= 3.5) return { bg: "#fef9c3", color: "#ca8a04" };
  if (n >= 2.5) return { bg: "#ffedd5", color: "#c2410c" };
  return { bg: "#fee2e2", color: "#dc2626" };
};

const defaultRatings = () =>
  Object.fromEntries(HR_REVIEW_CRITERIA.map((c) => [c.key, 3]));

// ── Auto-compute ratings from completed services ─────────────────────────────
const computeAutoRatings = (completedServices) => {
  const count = completedServices.length;

  if (count === 0) {
    return Object.fromEntries(HR_REVIEW_CRITERIA.map((c) => [c.key, 1]));
  }

  const avgDays =
    completedServices.reduce((sum, s) => {
      if (s.completionDate && s.allotmentDate) {
        const diff =
          (new Date(s.completionDate) - new Date(s.allotmentDate)) /
          (1000 * 60 * 60 * 24);
        return sum + Math.max(0, diff);
      }
      return sum + 7;
    }, 0) / count;

  const speedRating =
    avgDays <= 1 ? 5 : avgDays <= 3 ? 4 : avgDays <= 5 ? 3 : avgDays <= 7 ? 2 : 1;
  const volumeRating =
    count >= 10 ? 5 : count >= 7 ? 4 : count >= 5 ? 3 : count >= 3 ? 2 : 1;

  return {
    respect:          volumeRating,
    attitude:         speedRating,
    professionalism:  volumeRating,
    teamContribution: Math.min(5, volumeRating + 1),
    hrCompliance:     speedRating,
    responsibility:   volumeRating,
    communication:    volumeRating,
    relationships:    speedRating,
  };
};

// ── Star Rating ───────────────────────────────────────────────────────────────
const StarRating = ({ value, onChange, readOnly }) => (
  <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        onClick={() => !readOnly && onChange && onChange(star)}
        style={{
          fontSize: "1.25rem",
          cursor: readOnly ? "default" : "pointer",
          color: star <= value ? "#f59e0b" : "#d1d5db",
          transition: "color 0.15s, transform 0.1s",
          display: "inline-block",
        }}
        onMouseEnter={(e) => { if (!readOnly) e.target.style.transform = "scale(1.25)"; }}
        onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
      >★</span>
    ))}
    <span style={{ fontSize: "0.76rem", color: "#64748b", marginLeft: 4 }}>
      {Number(value || 0).toFixed(1)}/5
    </span>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
// Props:
//   onClose  — if provided, renders as MODAL; if absent, renders as FULL PAGE
export const HRReviewMasterGrid = ({ onClose }) => {
  const now = new Date();

  // Full page only states
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [activeTab,      setActiveTab]      = useState("review");
  const [selectedMonth,  setSelectedMonth]  = useState(now.getMonth());
  const [selectedYear,   setSelectedYear]   = useState(now.getFullYear());
  const [engineers,      setEngineers]      = useState([]);
  const [selectedEng,    setSelectedEng]    = useState(null);
  const [engServices,    setEngServices]    = useState([]);
  const [loadingEng,     setLoadingEng]     = useState(false);
  const [ratings,        setRatings]        = useState(defaultRatings());
  const [remark,         setRemark]         = useState("");
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [historyList,    setHistoryList]    = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [searchEng,      setSearchEng]      = useState("");

  const isModal = typeof onClose === "function";
  const years = [now.getFullYear() - 1, now.getFullYear()];

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // ── Load all engineers from services ─────────────────────────────────────
  useEffect(() => {
    const fetchEngineers = async () => {
      if (!isModal) setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/service`,
          { params: { page: 1, limit: 99999 }, headers: authHeader() }
        );
        if (res.data.success) {
          const engMap = new Map();
          (res.data.services || []).forEach((s) =>
            (s.allotTo || []).forEach((e) => { if (e?._id) engMap.set(e._id, e); })
          );
          setEngineers([...engMap.values()]);
        }
      } catch (e) {
        console.error("fetchEngineers:", e);
      } finally {
        if (!isModal) setLoading(false);
      }
    };
    fetchEngineers();
  }, []);

  // ── Load completed services for selected engineer + month ─────────────────
  useEffect(() => {
    if (!selectedEng) { setEngServices([]); return; }
    const fetchEngServices = async () => {
      setLoadingEng(true);
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/service`, {
          params: { page: 1, limit: 99999, allotTo: selectedEng._id, status: "Completed" },
          headers: authHeader(),
        });
        if (res.data.success) {
          const filtered = (res.data.services || []).filter((s) => {
            if (!s.completionDate) return false;
            const d = new Date(s.completionDate);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
          });
          setEngServices(filtered);

          // Auto-compute or load existing
          const existing = historyList.find(
            (r) => r.month === selectedMonth && r.year === selectedYear
          );
          if (existing) {
            const raw = existing.ratings;
            const obj = raw instanceof Map ? Object.fromEntries(raw) : (raw || {});
            setRatings({ ...defaultRatings(), ...obj });
            setRemark(existing.remark || "");
          } else {
            setRatings(computeAutoRatings(filtered));
            setRemark("");
          }
        }
      } catch (e) {
        console.error("fetchEngServices:", e);
      } finally {
        setLoadingEng(false);
      }
    };
    fetchEngServices();
  }, [selectedEng, selectedMonth, selectedYear, historyList.length]);

  // ── Load HR review history when engineer changes ──────────────────────────
  useEffect(() => {
    if (!selectedEng) { setHistoryList([]); return; }
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/hrReview`,
          { params: { engineerId: selectedEng._id }, headers: authHeader() }
        );
        if (res.data.success) setHistoryList(res.data.reviews || []);
      } catch (e) {
        console.error("fetchHistory:", e);
        setHistoryList([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [selectedEng]);

  const avgRating =
    HR_REVIEW_CRITERIA.length && Object.keys(ratings).length
      ? (
          HR_REVIEW_CRITERIA.reduce((s, c) => s + (ratings[c.key] || 0), 0) /
          HR_REVIEW_CRITERIA.length
        ).toFixed(1)
      : "0.0";

  // ── Submit HR Review ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedEng) { toast.error("Please select an engineer"); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/hrReview`,
        {
          engineerId:     selectedEng._id,
          engineerName:   selectedEng.name,
          month:          selectedMonth,
          year:           selectedYear,
          ratings,
          remark,
          avgRating,
          completedCount: engServices.length,
        },
        { headers: authHeader() }
      );
      if (res.data.success) {
        toast.success(`HR Review saved for ${selectedEng.name}!`);
        setSubmitted(true);
        const histRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/hrReview`,
          { params: { engineerId: selectedEng._id }, headers: authHeader() }
        );
        if (histRes.data.success) setHistoryList(histRes.data.reviews || []);
      } else {
        toast.error(res.data.error || "Failed to save HR review");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to submit HR review");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEngineers = engineers.filter((e) =>
    e.name?.toLowerCase().includes(searchEng.toLowerCase())
  );

  const alreadyReviewed =
    selectedEng &&
    historyList.some((r) => r.month === selectedMonth && r.year === selectedYear);

  const resetForm = () => {
    setSelectedEng(null);
    setSubmitted(false);
    setRatings(defaultRatings());
    setRemark("");
    setEngServices([]);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // INNER CONTENT — shared by both modal and full page
  // ═══════════════════════════════════════════════════════════════════════
  const renderContent = () => (
    <div style={{ padding: isModal ? "20px 24px" : "24px" }}>

      {/* ════════ NEW REVIEW TAB ════════ */}
      {activeTab === "review" && (
        <>
          {submitted ? (
            <div className="text-center py-5">
              <div style={{ fontSize: "3.5rem" }}>✅</div>
              <h5 className="mt-3 fw-bold text-success">HR Review Submitted!</h5>
              <p className="text-muted">
                Monthly HR review for <strong>{selectedEng?.name}</strong> has been saved.
              </p>
              <div style={{
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 10, padding: "16px", marginTop: 12, display: "inline-block",
              }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#16a34a" }}>
                  ⭐ {avgRating} / 5
                </div>
                <div style={{ color: "#15803d", fontSize: "0.85rem" }}>Overall HR Rating</div>
                <div style={{ color: "#6b7280", fontSize: "0.78rem", marginTop: 4 }}>
                  Based on {engServices.length} completed services in {MONTHS[selectedMonth]} {selectedYear}
                </div>
              </div>
              <div className="d-flex gap-2 justify-content-center mt-4">
                <button className="btn btn-outline-primary" onClick={() => { setActiveTab("history"); setSubmitted(false); }}>
                  📅 View History
                </button>
                <button className="btn btn-primary" onClick={isModal ? onClose : resetForm}>
                  {isModal ? "Close" : "➕ New Review"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Selectors ── */}
              <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                  <label className="form-label fw-bold" style={{ fontSize: "0.8rem" }}>Month</label>
                  <select className="form-select form-select-sm" value={selectedMonth}
                    onChange={(e) => { setSelectedMonth(Number(e.target.value)); setSubmitted(false); }}>
                    {MONTHS.map((m, i) => (<option key={m} value={i}>{m}</option>))}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label fw-bold" style={{ fontSize: "0.8rem" }}>Year</label>
                  <select className="form-select form-select-sm" value={selectedYear}
                    onChange={(e) => { setSelectedYear(Number(e.target.value)); setSubmitted(false); }}>
                    {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </div>
                <div className="col-12 col-md-5">
                  <label className="form-label fw-bold" style={{ fontSize: "0.8rem" }}>Select Engineer</label>
                  <input type="text" className="form-control form-control-sm mb-1"
                    placeholder="Search engineer name..." value={searchEng}
                    onChange={(e) => setSearchEng(e.target.value)} />
                  <select className="form-select form-select-sm" value={selectedEng?._id || ""}
                    onChange={(e) => {
                      const eng = engineers.find((en) => en._id === e.target.value);
                      setSelectedEng(eng || null);
                      setSubmitted(false); setRemark(""); setEngServices([]);
                    }}>
                    <option value="">-- Select Engineer --</option>
                    {filteredEngineers.map((eng) => (
                      <option key={eng._id} value={eng._id}>{eng.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Overwrite warning */}
              {alreadyReviewed && (
                <div style={{
                  background: "#fef9c3", border: "1px solid #fde047",
                  borderRadius: 8, padding: "10px 14px",
                  fontSize: "0.8rem", color: "#713f12", marginBottom: 16,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  ⚠️ A review already exists for <strong>{selectedEng.name}</strong> in{" "}
                  {MONTHS[selectedMonth]} {selectedYear}. Submitting will <strong>overwrite</strong>.
                </div>
              )}

              {/* Stats strip with service count */}
              {selectedEng && (
                <div style={{
                  background: loadingEng ? "#f8fafc" : "#eff6ff",
                  border: "1px solid #bfdbfe", borderRadius: 10,
                  padding: "14px 18px", marginBottom: 20,
                  display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
                }}>
                  {loadingEng ? (
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Loading services for {selectedEng.name}...
                    </div>
                  ) : (
                    <>
                      <div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1d4ed8" }}>
                          {engServices.length}
                        </div>
                        <div style={{ fontSize: "0.73rem", color: "#64748b" }}>
                          Completed in {MONTHS[selectedMonth]} {selectedYear}
                        </div>
                      </div>
                      <div style={{ width: 1, height: 40, background: "#bfdbfe" }} />
                      <div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f59e0b" }}>
                          ⭐ {avgRating}
                        </div>
                        <div style={{ fontSize: "0.73rem", color: "#64748b" }}>Auto Overall Rating</div>
                      </div>
                      <div style={{ width: 1, height: 40, background: "#bfdbfe" }} />
                      <div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#7c3aed" }}>
                          {historyList.length}
                        </div>
                        <div style={{ fontSize: "0.73rem", color: "#64748b" }}>Past Reviews</div>
                      </div>
                      <div style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#3b82f6", fontWeight: 600 }}>
                        🤖 Ratings auto-calculated — adjust if needed
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Completed Services Table ── */}
              {selectedEng && !loadingEng && engServices.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h6 style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                    Completed Services This Month
                  </h6>
                  <div className="table-responsive"
                    style={{ maxHeight: "160px", overflowY: "auto", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <table className="table table-sm mb-0" style={{ fontSize: "0.78rem" }}>
                      <thead style={{ background: "#f9fafb", position: "sticky", top: 0 }}>
                        <tr>
                          {["#", "Customer", "Product", "Allotted", "Completed", "Days"].map((h) => (
                            <th key={h} style={{ border: "none", padding: "7px 10px", color: "#6b7280" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {engServices.map((s, i) => {
                          const days =
                            s.completionDate && s.allotmentDate
                              ? Math.max(0, Math.round(
                                  (new Date(s.completionDate) - new Date(s.allotmentDate)) / (1000 * 60 * 60 * 24)
                                ))
                              : "-";
                          return (
                            <tr key={s._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ border: "none", padding: "6px 10px", color: "#9ca3af" }}>{i + 1}</td>
                              <td style={{ border: "none", padding: "6px 10px", fontWeight: 600, color: "#1e1e1e" }}>
                                {s.ticket?.client?.custName || "N/A"}
                              </td>
                              <td style={{ border: "none", padding: "6px 10px", color: "#555" }}>
                                {s.ticket?.product || "N/A"}
                              </td>
                              <td style={{ border: "none", padding: "6px 10px", color: "#555" }}>
                                {s.allotmentDate ? new Date(s.allotmentDate).toLocaleDateString("en-GB") : "-"}
                              </td>
                              <td style={{ border: "none", padding: "6px 10px", color: "#16a34a", fontWeight: 600 }}>
                                {s.completionDate ? new Date(s.completionDate).toLocaleDateString("en-GB") : "-"}
                              </td>
                              <td style={{ border: "none", padding: "6px 10px" }}>
                                <span style={{
                                  background: days <= 3 ? "#dcfce7" : days <= 7 ? "#fef9c3" : "#fee2e2",
                                  color:      days <= 3 ? "#16a34a" : days <= 7 ? "#ca8a04" : "#dc2626",
                                  borderRadius: "5px", padding: "2px 8px",
                                  fontWeight: 600, fontSize: "0.74rem",
                                }}>{days}d</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedEng && !loadingEng && engServices.length === 0 && (
                <div style={{
                  background: "#fff7ed", border: "1px solid #fed7aa",
                  borderRadius: "8px", padding: "12px 16px", marginBottom: "20px",
                  fontSize: "0.82rem", color: "#92400e",
                }}>
                  ⚠️ No completed services found for <strong>{selectedEng.name}</strong> in{" "}
                  {MONTHS[selectedMonth]} {selectedYear}. Ratings will default to 1 star.
                </div>
              )}

              {/* ── Rating Criteria ── */}
              {selectedEng && !loadingEng && (
                <>
                  <h6 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 12 }}>
                    HR Performance Ratings — <span style={{ color: "#1d4ed8" }}>{selectedEng.name}</span>
                  </h6>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {HR_REVIEW_CRITERIA.map((c, idx) => (
                      <div key={c.key} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        borderRadius: 8, padding: "10px 14px",
                        border: "1px solid #e5e7eb",
                        background: idx % 2 === 0 ? "#f9fafb" : "#fff",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                          <span style={{ fontSize: "1rem" }}>{c.icon}</span>
                          <span style={{ fontSize: "0.8rem", color: "#374151", fontWeight: 500 }}>
                            <span style={{ color: "#6366f1", fontWeight: 700, marginRight: 4 }}>{idx + 1}.</span>
                            {c.label}
                          </span>
                        </div>
                        <StarRating
                          value={ratings[c.key] || 1}
                          onChange={(val) => setRatings((prev) => ({ ...prev, [c.key]: val }))}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Overall average */}
                  <div style={{
                    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                    border: "1px solid #f59e0b", borderRadius: 10,
                    padding: "14px 18px", marginBottom: 16,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span style={{ fontWeight: 700, color: "#92400e", fontSize: "0.9rem" }}>Overall HR Rating</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} style={{
                          fontSize: "1.4rem",
                          color: s <= Math.round(parseFloat(avgRating)) ? "#f59e0b" : "#d1d5db",
                        }}>★</span>
                      ))}
                      <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#b45309" }}>{avgRating} / 5</span>
                    </div>
                  </div>

                  {/* HR Remark */}
                  <div className="mb-3">
                    <label className="form-label fw-bold" style={{ fontSize: "0.8rem" }}>
                      HR Manager Remark (Optional)
                    </label>
                    <textarea className="form-control" rows={3}
                      placeholder="Add HR observations, disciplinary notes, or improvement suggestions..."
                      value={remark} onChange={(e) => setRemark(e.target.value)}
                      style={{ fontSize: "0.82rem", resize: "none" }} />
                  </div>

                  {/* Submit */}
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary px-4" onClick={handleSubmit} disabled={submitting}
                      style={{ borderRadius: 8, fontWeight: 600 }}>
                      {submitting ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                      ) : alreadyReviewed ? "🔄 Update HR Review" : "✅ Submit HR Review"}
                    </button>
                    {isModal && (
                      <button className="btn btn-outline-secondary px-4" onClick={onClose} style={{ borderRadius: 8 }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              )}

              {!selectedEng && (
                <div style={{ textAlign: "center", padding: "50px 20px", color: "#9ca3af" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 12 }}>👷</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Select an engineer to begin HR Review</div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ════════ HISTORY TAB ════════ */}
      {activeTab === "history" && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-5">
              <label className="form-label fw-bold" style={{ fontSize: "0.8rem" }}>Select Engineer</label>
              <select className="form-select form-select-sm" value={selectedEng?._id || ""}
                onChange={(e) => {
                  const eng = engineers.find((en) => en._id === e.target.value);
                  setSelectedEng(eng || null);
                  setSubmitted(false); setRemark(""); setEngServices([]);
                }}>
                <option value="">-- Select Engineer --</option>
                {engineers.map((eng) => (<option key={eng._id} value={eng._id}>{eng.name}</option>))}
              </select>
            </div>
          </div>

          {!selectedEng && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af", fontSize: "0.88rem" }}>
              👆 Select an engineer to view their HR review history
            </div>
          )}

          {selectedEng && historyLoading && (
            <div className="text-center py-4">
              <span className="spinner-border spinner-border-sm me-2"></span>Loading history...
            </div>
          )}

          {selectedEng && !historyLoading && historyList.length === 0 && (
            <div style={{
              background: "#fff7ed", border: "1px solid #fed7aa",
              borderRadius: 8, padding: "14px 18px",
              fontSize: "0.82rem", color: "#92400e", textAlign: "center",
            }}>
              ⚠️ No HR review history found for <strong>{selectedEng.name}</strong>.
            </div>
          )}

          {selectedEng && !historyLoading && historyList.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {historyList.map((review, idx) => {
                const rc = ratingColor(review.avgRating);
                const raw = review.ratings;
                const ratingsObj = raw instanceof Map ? Object.fromEntries(raw) : raw || {};
                return (
                  <div key={idx} style={{
                    border: "1px solid #e5e7eb", borderRadius: 12,
                    overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 18px",
                      background: "linear-gradient(90deg, #eff6ff 0%, #f8fafc 100%)",
                      borderBottom: "1px solid #e5e7eb",
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.9rem" }}>
                          📅 {MONTHS[review.month]} {review.year}
                        </div>
                        <div style={{ fontSize: "0.73rem", color: "#6b7280", marginTop: 2 }}>
                          {review.completedCount ? `${review.completedCount} services completed · ` : ""}
                          {review.createdAt && <>Submitted {new Date(review.createdAt).toLocaleDateString("en-GB")}</>}
                        </div>
                      </div>
                      <div style={{
                        background: rc.bg, color: rc.color,
                        borderRadius: 10, padding: "6px 14px",
                        fontWeight: 800, fontSize: "1rem",
                      }}>
                        ⭐ {review.avgRating} / 5
                      </div>
                    </div>
                    <div style={{ padding: "12px 18px" }}>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                        gap: 8,
                      }}>
                        {HR_REVIEW_CRITERIA.map((c) => (
                          <div key={c.key} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            background: "#f9fafb", borderRadius: 6,
                            padding: "6px 10px", fontSize: "0.75rem",
                          }}>
                            <span style={{ color: "#374151", flex: 1 }}>{c.icon} {c.label}</span>
                            <StarRating value={ratingsObj[c.key] || 1} readOnly />
                          </div>
                        ))}
                      </div>
                      {review.remark && (
                        <div style={{
                          marginTop: 10, background: "#fefce8",
                          border: "1px solid #fde68a", borderRadius: 7,
                          padding: "8px 12px", fontSize: "0.8rem", color: "#713f12",
                        }}>
                          💬 <strong>HR Remark:</strong> {review.remark}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Tabs component shared by both modes ──────────────────────────────────
  const renderTabs = () => (
    <div style={{
      display: "flex", borderBottom: "2px solid #e5e7eb",
      padding: "0 24px", background: "#f8fafc",
      borderRadius: isModal ? "0" : "14px 14px 0 0",
    }}>
      {[
        { key: "review",  label: "📝 New Review" },
        {
          key: "history",
          label: `📅 Review History${historyList.length > 0 ? ` (${historyList.length})` : ""}`,
        },
      ].map((tab) => (
        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
          style={{
            padding: "10px 20px", border: "none", background: "none",
            fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
            borderBottom: activeTab === tab.key ? "3px solid #1d4ed8" : "3px solid transparent",
            color: activeTab === tab.key ? "#1d4ed8" : "#6b7280",
            transition: "color 0.2s",
          }}>
          {tab.label}
        </button>
      ))}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // MODAL MODE — when onClose prop is provided
  // ═══════════════════════════════════════════════════════════════════════
  if (isModal) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}>
        <div style={{
          background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "760px",
          maxHeight: "92vh", overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        }}>
          {/* Modal Header */}
          <div style={{
            background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
            padding: "18px 24px", borderRadius: "16px 16px 0 0",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <h5 className="mb-0 text-white fw-bold" style={{ fontSize: "1rem" }}>
                📋 Monthly HR Review
              </h5>
              <small style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem" }}>
                Auto-calculated from completed services
              </small>
            </div>
            <button onClick={onClose} className="btn btn-sm"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: "8px" }}>
              ✕
            </button>
          </div>

          {renderTabs()}
          {renderContent()}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FULL PAGE MODE — when no onClose prop (accessed via route)
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <>
      {loading && <div className="overlay"><span className="loader"></span></div>}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="HRReviewMasterGrid" />
            <div className="main-panel" style={{
              width: isopen ? "" : "calc(100% - 120px)",
              marginLeft: isopen ? "" : "125px",
            }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* Page Header */}
                <div className="row px-2 py-1 align-items-center mb-2">
                  <div className="col-12">
                    <h5 className="text-white fw-bold py-1 mb-0">👥 HR Monthly Review</h5>
                    <small className="text-white-50">
                      Auto-calculated from completed services — adjust if needed
                    </small>
                  </div>
                </div>

                {/* Main Card */}
                <div className="row px-2 pb-3">
                  <div className="col-12">
                    <div className="card shadow" style={{ borderRadius: 14 }}>
                      {renderTabs()}
                      {renderContent()}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HRReviewMasterGrid;