import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import * as XLSX from "xlsx";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import UpdateServicePopup from "./PopUp/UpdateServicePopUp";
import useServices from "../../../../hooks/service/useService";
import useUpdateService from "../../../../hooks/service/useUpdateService";
import useDeleteService from "../../../../hooks/service/useDeleteService";
import ViewServicePopUp from "../../CommonPopUp/ViewServicePopUp";
import { UserContext } from "../../../../context/UserContext";
import ServiceDashboardCards from './ServiceDashboardCards';
import { getAllService } from "../../../../hooks/useService";
import axios from "axios";

const productOptions = [
  "CCTV System", "TA System", "Hajeri", "SmartFace", "ZKBioSecurity",
  "Access Control System", "Turnkey Project", "Alleviz", "CafeLive",
  "WorksJoy", "WorksJoy Blu", "Fire Alarm System", "Fire Hydrant System",
  "IDS", "AI Face Machines", "Entrance Automation", "Guard Tour System",
  "Home Automation", "IP PA and Communication System", "CRM", "KMS",
  "VMS", "PMS", "Boom Barrier System", "Tripod System", "Flap Barrier System",
  "EPBX System", "CMS", "Lift Elevator System", "AV6", "Walky Talky System",
  "Device Management System"
];

// ── Review Criteria (12 fields) ──────────────────────────────────────────────
const REVIEW_CRITERIA = [
  { key: "firstTimeFix",       label: "First-time fix capability" },
  { key: "diagnosis",          label: "Ability to diagnose and resolve issues" },
  { key: "productKnowledge",   label: "Knowledge of products/equipment" },
  { key: "urgentAvailability", label: "Availability for urgent/breakdown calls" },
  { key: "resolutionSpeed",    label: "Speed and effectiveness of problem resolution" },
  { key: "complaintHandling",  label: "Complaint handling behavior" },
  { key: "toolsAndPPE",        label: "Use of proper tools and PPE" },
  { key: "amcEnquiries",       label: "Enquiries of AMC given" },
  { key: "salesEnquiries",     label: "Enquiries of Sales given" },
  { key: "policyAdherence",    label: "Adherence to company policies" },
  { key: "maxCalls",           label: "Max. no. of calls handled" },
  { key: "resolution",         label: "Resolution quality & effectiveness" },
];

// ── Star Rating Component ────────────────────────────────────────────────────
const StarRating = ({ value, onChange, readOnly }) => (
  <div className="d-flex gap-1">
    {[1, 2, 3, 4, 5].map(star => (
      <span
        key={star}
        onClick={() => !readOnly && onChange(star)}
        style={{
          fontSize: "1.3rem",
          cursor: readOnly ? "default" : "pointer",
          color: star <= value ? "#f59e0b" : "#d1d5db",
          transition: "color 0.15s",
        }}
      >★</span>
    ))}
    <span style={{ fontSize: "0.78rem", color: "#64748b", alignSelf: "center", marginLeft: 4 }}>
      {value}/5
    </span>
  </div>
);

// ── Auto-compute ratings analytically from completed services ────────────────
const computeAutoRatings = (completedServices) => {
  const count = completedServices.length;

  if (count === 0) {
    const defaults = Object.fromEntries(REVIEW_CRITERIA.map(c => [c.key, 1]));
    defaults.maxCalls   = 5;
    defaults.resolution = 5;
    return defaults;
  }

  const avgDays = completedServices.reduce((sum, s) => {
    if (s.completionDate && s.allotmentDate) {
      const diff = (new Date(s.completionDate) - new Date(s.allotmentDate)) / (1000 * 60 * 60 * 24);
      return sum + Math.max(0, diff);
    }
    return sum + 7;
  }, 0) / count;

  const speedRating  = avgDays <= 1 ? 5 : avgDays <= 3 ? 4 : avgDays <= 5 ? 3 : avgDays <= 7 ? 2 : 1;
  const volumeRating = count >= 10 ? 5 : count >= 7 ? 4 : count >= 5 ? 3 : count >= 3 ? 2 : 1;

  return {
    firstTimeFix:       volumeRating,
    diagnosis:          speedRating,
    productKnowledge:   volumeRating,
    urgentAvailability: Math.min(5, volumeRating + 1),
    resolutionSpeed:    speedRating,
    complaintHandling:  volumeRating,
    toolsAndPPE:        5,
    amcEnquiries:       volumeRating,
    salesEnquiries:     volumeRating,
    policyAdherence:    5,
    maxCalls:           5,
    resolution:         5,
  };
};

// ── Monthly Review Modal ─────────────────────────────────────────────────────
const MonthlyReviewModal = ({ onClose }) => {
  const now = new Date();
  const [selectedMonth,  setSelectedMonth]  = useState(now.getMonth());
  const [selectedYear,   setSelectedYear]   = useState(now.getFullYear());
  const [engineers,      setEngineers]      = useState([]);
  const [selectedEng,    setSelectedEng]    = useState(null);
  const [engServices,    setEngServices]    = useState([]);
  const [loadingEng,     setLoadingEng]     = useState(false);
  const [ratings,        setRatings]        = useState({});
  const [remark,         setRemark]         = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [activeTab,      setActiveTab]      = useState('review');
  const [historyList,    setHistoryList]    = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  const years = [now.getFullYear() - 1, now.getFullYear()];

  // ── Load engineers from existing services ──
  useEffect(() => {
    const fetchEngineers = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/service`,
          {
            params: { page: 1, limit: 99999 },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        if (res.data.success) {
          const engMap = new Map();
          (res.data.services || []).forEach(s =>
            (s.allotTo || []).forEach(e => { if (e?._id) engMap.set(e._id, e); })
          );
          setEngineers([...engMap.values()]);
        }
      } catch (e) { console.error(e); }
    };
    fetchEngineers();
  }, []);

  // ── Load completed services for selected engineer + month ──
  useEffect(() => {
    if (!selectedEng) { setEngServices([]); setRatings({}); return; }
    const fetchEngServices = async () => {
      setLoadingEng(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/service`,
          {
            params: { page: 1, limit: 99999, allotTo: selectedEng._id, status: 'Completed' },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        if (res.data.success) {
          const filtered = (res.data.services || []).filter(s => {
            if (!s.completionDate) return false;
            const d = new Date(s.completionDate);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
          });
          setEngServices(filtered);
          setRatings(computeAutoRatings(filtered));
        }
      } catch (e) { console.error(e); }
      finally { setLoadingEng(false); }
    };
    fetchEngServices();
  }, [selectedEng, selectedMonth, selectedYear]);

  // ── Load review history from DB when engineer changes ──
  useEffect(() => {
    if (!selectedEng) { setHistoryList([]); return; }
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/serviceReview`,
          {
            params: { engineerId: selectedEng._id },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        if (res.data.success) {
          setHistoryList(res.data.reviews || []);
        }
      } catch (e) {
        console.error(e);
        setHistoryList([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [selectedEng]);

  const avgRating = REVIEW_CRITERIA.length
    ? (Object.values(ratings).reduce((s, v) => s + v, 0) / REVIEW_CRITERIA.length).toFixed(1)
    : 0;

  // ── Submit review to DB ──
  const handleSubmit = async () => {
    if (!selectedEng) { toast.error('Please select an engineer'); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/serviceReview`,
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
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (res.data.success) {
        toast.success(`Review saved for ${selectedEng.name}!`);
        setSubmitted(true);
        // Refresh history after submit
        const histRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/serviceReview`,
          {
            params: { engineerId: selectedEng._id },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        if (histRes.data.success) setHistoryList(histRes.data.reviews || []);
      } else {
        toast.error(res.data.error || 'Failed to save review');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Rating badge color ──
  const ratingColor = (r) => {
    const n = parseFloat(r);
    if (n >= 4.5) return { bg: '#dcfce7', color: '#16a34a' };
    if (n >= 3.5) return { bg: '#fef9c3', color: '#ca8a04' };
    if (n >= 2.5) return { bg: '#ffedd5', color: '#c2410c' };
    return { bg: '#fee2e2', color: '#dc2626' };
  };

  // ── Convert MongoDB Map or plain object → plain object ──
  const getRatings = (review) => {
    if (!review.ratings) return {};
    if (review.ratings instanceof Map) return Object.fromEntries(review.ratings);
    if (typeof review.ratings === 'object') return review.ratings;
    return {};
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '760px',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
      }}>

        {/* ── Modal Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          padding: '18px 24px', borderRadius: '16px 16px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h5 className="mb-0 text-white fw-bold" style={{ fontSize: '1rem' }}>
              📋 Monthly Service Engineer Review
            </h5>
            <small style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem' }}>
              Service Manager — Performance Evaluation
            </small>
          </div>
          <button onClick={onClose} className="btn btn-sm"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px' }}>
            ✕
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', borderBottom: '2px solid #e5e7eb',
          padding: '0 24px', background: '#f8fafc',
        }}>
          {['review', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px', border: 'none', background: 'none',
                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                borderBottom: activeTab === tab ? '3px solid #1d4ed8' : '3px solid transparent',
                color: activeTab === tab ? '#1d4ed8' : '#6b7280',
              }}
            >
              {tab === 'review'
                ? '📝 New Review'
                : `📅 Review History${historyList.length > 0 ? ` (${historyList.length})` : ''}`}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 24px' }}>

          {/* ══════════ HISTORY TAB ══════════ */}
          {activeTab === 'history' && (
            <>
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-6">
                  <label className="form-label fw-bold" style={{ fontSize: '0.8rem' }}>
                    Select Engineer
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedEng?._id || ''}
                    onChange={e => {
                      const eng = engineers.find(en => en._id === e.target.value);
                      setSelectedEng(eng || null);
                      setSubmitted(false);
                      setRemark('');
                    }}
                  >
                    <option value="">-- Select Engineer --</option>
                    {engineers.map(eng => (
                      <option key={eng._id} value={eng._id}>{eng.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedEng && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: '0.88rem' }}>
                  👆 Select an engineer to view their review history
                </div>
              )}

              {selectedEng && historyLoading && (
                <div className="text-center py-4">
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Loading history...
                </div>
              )}

              {selectedEng && !historyLoading && historyList.length === 0 && (
                <div style={{
                  background: '#fff7ed', border: '1px solid #fed7aa',
                  borderRadius: '8px', padding: '14px 18px',
                  fontSize: '0.82rem', color: '#92400e', textAlign: 'center',
                }}>
                  ⚠️ No review history found for <strong>{selectedEng.name}</strong>.
                  Submit a review from the "New Review" tab.
                </div>
              )}

              {selectedEng && !historyLoading && historyList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {historyList.map((review, idx) => {
                    const rc = ratingColor(review.avgRating);
                    const reviewRatings = getRatings(review);
                    return (
                      <div key={idx} style={{
                        border: '1px solid #e5e7eb', borderRadius: '12px',
                        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      }}>
                        {/* Review card header */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 18px',
                          background: 'linear-gradient(90deg, #eff6ff 0%, #f8fafc 100%)',
                          borderBottom: '1px solid #e5e7eb',
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.9rem' }}>
                              📅 {monthNames[review.month]} {review.year}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#6b7280', marginTop: 2 }}>
                              {review.completedCount} services completed
                              {review.createdAt && (
                                <> · Submitted {new Date(review.createdAt).toLocaleDateString('en-GB')}</>
                              )}
                            </div>
                          </div>
                          <div style={{
                            background: rc.bg, color: rc.color,
                            borderRadius: '10px', padding: '6px 14px',
                            fontWeight: 800, fontSize: '1rem',
                          }}>
                            ⭐ {review.avgRating} / 5
                          </div>
                        </div>

                        {/* Ratings breakdown */}
                        <div style={{ padding: '12px 18px' }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: '8px',
                          }}>
                            {REVIEW_CRITERIA.map(c => (
                              <div key={c.key} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#f9fafb', borderRadius: '6px',
                                padding: '6px 10px', fontSize: '0.75rem',
                              }}>
                                <span style={{ color: '#374151', flex: 1 }}>{c.label}</span>
                                <StarRating value={reviewRatings[c.key] || 1} readOnly />
                              </div>
                            ))}
                          </div>

                          {review.remark && (
                            <div style={{
                              marginTop: '10px', background: '#fefce8',
                              border: '1px solid #fde68a', borderRadius: '7px',
                              padding: '8px 12px', fontSize: '0.8rem', color: '#713f12',
                            }}>
                              💬 <strong>Manager Remark:</strong> {review.remark}
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

          {/* ══════════ NEW REVIEW TAB ══════════ */}
          {activeTab === 'review' && (
            <>
              {submitted ? (
                <div className="text-center py-5">
                  <div style={{ fontSize: '3rem' }}>✅</div>
                  <h5 className="mt-3 fw-bold text-success">Review Submitted!</h5>
                  <p className="text-muted">
                    Monthly review for <strong>{selectedEng?.name}</strong> has been saved to database.
                  </p>
                  <div style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: '10px', padding: '16px', marginTop: '12px',
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>
                      ⭐ {avgRating} / 5
                    </div>
                    <div style={{ color: '#15803d', fontSize: '0.85rem' }}>Overall Average Rating</div>
                    <div style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '4px' }}>
                      Based on {engServices.length} completed services in {monthNames[selectedMonth]} {selectedYear}
                    </div>
                  </div>
                  <div className="d-flex gap-2 justify-content-center mt-3">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => { setActiveTab('history'); setSubmitted(false); }}
                    >
                      📅 View History
                    </button>
                    <button className="btn btn-primary" onClick={onClose}>Close</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Month / Year / Engineer selectors */}
                  <div className="row g-3 mb-4">
                    <div className="col-6 col-md-4">
                      <label className="form-label fw-bold" style={{ fontSize: '0.8rem' }}>Month</label>
                      <select
                        className="form-select form-select-sm"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                      >
                        {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
                      </select>
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label fw-bold" style={{ fontSize: '0.8rem' }}>Year</label>
                      <select
                        className="form-select form-select-sm"
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                      >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="col-12 col-md-5">
                      <label className="form-label fw-bold" style={{ fontSize: '0.8rem' }}>Select Engineer</label>
                      <select
                        className="form-select form-select-sm"
                        value={selectedEng?._id || ''}
                        onChange={e => {
                          const eng = engineers.find(en => en._id === e.target.value);
                          setSelectedEng(eng || null);
                          setSubmitted(false);
                          setRemark('');
                        }}
                      >
                        <option value="">-- Select Engineer --</option>
                        {engineers.map(eng => (
                          <option key={eng._id} value={eng._id}>{eng.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Overwrite warning */}
                  {selectedEng && historyList.some(r => r.month === selectedMonth && r.year === selectedYear) && (
                    <div style={{
                      background: '#fef9c3', border: '1px solid #fde047',
                      borderRadius: '8px', padding: '10px 14px',
                      fontSize: '0.8rem', color: '#713f12', marginBottom: '16px',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                      ⚠️ A review already exists for <strong>{selectedEng.name}</strong> in{' '}
                      {monthNames[selectedMonth]} {selectedYear}.
                      Submitting again will <strong>overwrite</strong> the previous review.
                    </div>
                  )}

                  {/* Stats summary */}
                  {selectedEng && (
                    <div style={{
                      background: loadingEng ? '#f8fafc' : '#eff6ff',
                      border: '1px solid #bfdbfe', borderRadius: '10px',
                      padding: '14px 18px', marginBottom: '20px',
                      display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap',
                    }}>
                      {loadingEng ? (
                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Loading services for {selectedEng.name}...
                        </div>
                      ) : (
                        <>
                          <div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1d4ed8' }}>
                              {engServices.length}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                              Completed in {monthNames[selectedMonth]} {selectedYear}
                            </div>
                          </div>
                          <div style={{ width: 1, height: 40, background: '#bfdbfe' }} />
                          <div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f59e0b' }}>
                              ⭐ {avgRating}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#64748b' }}>Auto Overall Rating</div>
                          </div>
                          <div style={{ width: 1, height: 40, background: '#bfdbfe' }} />
                          <div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#7c3aed' }}>
                              {historyList.length}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#64748b' }}>Past Reviews</div>
                          </div>
                          <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>
                            🤖 Ratings auto-calculated — adjust if needed
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Completed services list */}
                  {selectedEng && !loadingEng && engServices.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h6 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
                        Completed Services This Month
                      </h6>
                      <div className="table-responsive" style={{
                        maxHeight: '160px', overflowY: 'auto',
                        borderRadius: '8px', border: '1px solid #e5e7eb',
                      }}>
                        <table className="table table-sm mb-0" style={{ fontSize: '0.78rem' }}>
                          <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                            <tr>
                              <th style={{ border: 'none', padding: '7px 10px', color: '#6b7280' }}>#</th>
                              <th style={{ border: 'none', padding: '7px 10px', color: '#6b7280' }}>Customer</th>
                              <th style={{ border: 'none', padding: '7px 10px', color: '#6b7280' }}>Product</th>
                              <th style={{ border: 'none', padding: '7px 10px', color: '#6b7280' }}>Allotted</th>
                              <th style={{ border: 'none', padding: '7px 10px', color: '#6b7280' }}>Completed</th>
                              <th style={{ border: 'none', padding: '7px 10px', color: '#6b7280', textAlign: 'center' }}>Days</th>
                            </tr>
                          </thead>
                          <tbody>
                            {engServices.map((s, i) => {
                              const days = s.completionDate && s.allotmentDate
                                ? Math.max(0, Math.round(
                                    (new Date(s.completionDate) - new Date(s.allotmentDate)) / (1000 * 60 * 60 * 24)
                                  ))
                                : '-';
                              return (
                                <tr key={s._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                  <td style={{ border: 'none', padding: '6px 10px', color: '#9ca3af' }}>{i + 1}</td>
                                  <td style={{ border: 'none', padding: '6px 10px', fontWeight: 600, color: '#1e1e1e' }}>
                                    {s.ticket?.client?.custName || 'N/A'}
                                  </td>
                                  <td style={{ border: 'none', padding: '6px 10px', color: '#555' }}>
                                    {s.ticket?.product || 'N/A'}
                                  </td>
                                  <td style={{ border: 'none', padding: '6px 10px', color: '#555' }}>
                                    {s.allotmentDate ? new Date(s.allotmentDate).toLocaleDateString('en-GB') : '-'}
                                  </td>
                                  <td style={{ border: 'none', padding: '6px 10px', color: '#16a34a', fontWeight: 600 }}>
                                    {s.completionDate ? new Date(s.completionDate).toLocaleDateString('en-GB') : '-'}
                                  </td>
                                  <td style={{ border: 'none', padding: '6px 10px', textAlign: 'center' }}>
                                    <span style={{
                                      background: days <= 3 ? '#dcfce7' : days <= 7 ? '#fef9c3' : '#fee2e2',
                                      color:      days <= 3 ? '#16a34a' : days <= 7 ? '#ca8a04' : '#dc2626',
                                      borderRadius: '5px', padding: '2px 8px',
                                      fontWeight: 600, fontSize: '0.74rem',
                                    }}>
                                      {days}d
                                    </span>
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
                      background: '#fff7ed', border: '1px solid #fed7aa',
                      borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
                      fontSize: '0.82rem', color: '#92400e',
                    }}>
                      ⚠️ No completed services found for <strong>{selectedEng.name}</strong> in{' '}
                      {monthNames[selectedMonth]} {selectedYear}. Ratings will default to 1 star.
                    </div>
                  )}

                  {/* Performance Ratings */}
                  {selectedEng && !loadingEng && (
                    <>
                      <h6 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>
                        Performance Ratings — adjust if needed
                      </h6>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                        {REVIEW_CRITERIA.map((c, idx) => (
                          <div key={c.key} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            borderRadius: '8px', padding: '10px 14px',
                            border: ['maxCalls', 'resolution'].includes(c.key)
                              ? '1px solid #c4b5fd'
                              : '1px solid #e5e7eb',
                            background: ['maxCalls', 'resolution'].includes(c.key)
                              ? '#f5f3ff'
                              : idx % 2 === 0 ? '#f9fafb' : '#fff',
                          }}>
                            <div style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500, flex: 1 }}>
                              <span style={{ color: '#6366f1', fontWeight: 700, marginRight: 6 }}>
                                {idx + 1}.
                              </span>
                              {c.label}
                              {['maxCalls', 'resolution'].includes(c.key) && (
                                <span style={{
                                  marginLeft: 8, fontSize: '0.68rem',
                                  background: '#ede9fe', color: '#7c3aed',
                                  borderRadius: '4px', padding: '1px 6px', fontWeight: 700,
                                }}>
                                  auto
                                </span>
                              )}
                            </div>
                            <StarRating
                              value={ratings[c.key] || 1}
                              onChange={val => setRatings(prev => ({ ...prev, [c.key]: val }))}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Overall average */}
                      <div style={{
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        border: '1px solid #f59e0b', borderRadius: '10px',
                        padding: '14px 18px', marginBottom: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.9rem' }}>
                          Overall Average Rating
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} style={{
                              fontSize: '1.4rem',
                              color: s <= Math.round(avgRating) ? '#f59e0b' : '#d1d5db',
                            }}>★</span>
                          ))}
                          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#b45309' }}>
                            {avgRating} / 5
                          </span>
                        </div>
                      </div>

                      {/* Manager Remark */}
                      <div className="mb-3">
                        <label className="form-label fw-bold" style={{ fontSize: '0.8rem' }}>
                          Manager Remark (Optional)
                        </label>
                        <textarea
                          className="form-control"
                          rows={3}
                          placeholder="Add any specific observations, feedback, or improvement suggestions..."
                          value={remark}
                          onChange={e => setRemark(e.target.value)}
                          style={{ fontSize: '0.82rem', resize: 'none' }}
                        />
                      </div>

                      {/* Submit / Cancel */}
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-primary px-4"
                          onClick={handleSubmit}
                          disabled={submitting}
                          style={{ borderRadius: '8px', fontWeight: 600 }}
                        >
                          {submitting
                            ? <><span className="spinner-border spinner-border-sm me-2"></span>Submitting...</>
                            : 'Submit Review'}
                        </button>
                        <button
                          className="btn btn-outline-secondary px-4"
                          onClick={onClose}
                          style={{ borderRadius: '8px' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date)) return "-";
  const day     = date.getDate();
  const month   = date.toLocaleString("en-IN", { month: "short" });
  const year    = date.getFullYear();
  const hours   = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

export const ServiceMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const { user } = useContext(UserContext);

  const [deletePopUpShow,     setdeletePopUpShow]     = useState(false);
  const [UpdatePopUpShow,     setUpdatePopUpShow]     = useState(false);
  const [detailsServicePopUp, setDetailsServicePopUp] = useState(false);
  const [showReviewModal,     setShowReviewModal]     = useState(false);

  const [filters, setFilters] = useState({
    priority: null, status: null, serviceType: null, allotTo: null,
  });
  const [productFilter, setProductFilter] = useState("");
  const [searchText,    setSearchText]    = useState("");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [selectedId,      setSelecteId]      = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [excelLoading,    setExcelLoading]    = useState(false);
  const [allEngineers,    setAllEngineers]    = useState([]);

  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 0, totalRecords: 0,
    limit: 20, hasNextPage: false, hasPrevPage: false,
  });
  const itemsPerPage = 20;

  const { data, loading, error } = useServices(
    pagination.currentPage, itemsPerPage, filters, searchQuery
  );
  const { updateService, loading: updateLoading } = useUpdateService();
  const { deleteService, loading: deleteLoading } = useDeleteService();

  useEffect(() => {
    if (data) {
      setPagination(data.pagination || {
        currentPage: 1, totalPages: 0, totalRecords: 0,
        limit: itemsPerPage, hasNextPage: false, hasPrevPage: false,
      });
      const newEngineers = (data.services || [])
        .flatMap(s => s.allotTo || [])
        .filter(e => e?.name);
      setAllEngineers(prev => {
        const map = new Map(prev.map(e => [e._id, e]));
        newEngineers.forEach(e => map.set(e._id, e));
        return [...map.values()];
      });
    }
    if (error) toast.error(error);
  }, [data, error]);

  const filteredServices = (data?.services || []).filter((service) => {
    const product = service?.ticket?.product?.toLowerCase() || "";
    return !productFilter || product === productFilter.toLowerCase();
  });

  const handlePageChange = (page) => setPagination(prev => ({ ...prev, currentPage: page }));

  const handleChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value || null }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleCardClick = (statusValue) => {
    setFilters(prev => ({ ...prev, status: statusValue || null }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleUpdate = (service = null) => {
    setSelectedService(service);
    setUpdatePopUpShow(!UpdatePopUpShow);
  };

  const handleUpdateSubmit = async (id, updatedData) => {
    const result = await updateService(id, updatedData);
    if (result.success) {
      setUpdatePopUpShow(false);
      handlePageChange(1);
      toast.success(result.message);
    } else {
      toast.error(result.error || "Failed to update service");
    }
  };

  const handelDeleteClosePopUpClick = (id) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handelDeleteClick = async () => {
    const result = await deleteService(selectedId);
    if (result?.success) {
      setdeletePopUpShow(false);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      toast.success(result?.message);
    } else { toast.error(result?.error); }
  };

  const handelDetailsPopUpClick = (service) => {
    setSelectedService(service);
    setDetailsServicePopUp(!detailsServicePopUp);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchText.trim());
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleSearchClear = () => {
    setSearchText(""); setSearchQuery("");
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleExcelDownload = async () => {
    try {
      setExcelLoading(true);
      toast.loading("Preparing Excel report...");
      const allData     = await getAllService(1, 99999, filters, searchQuery);
      const allServices = allData?.services || [];
      if (!allServices.length) { toast.dismiss(); toast.error("No data to export"); return; }
      const rows = allServices.map((service, index) => ({
        "Sr. No":          index + 1,
        "Customer Name":   service?.ticket?.client?.custName || "-",
        "Complaint":       service?.ticket?.details || "-",
        "Product":         service?.ticket?.product || "-",
        "Service Type":    service?.serviceType || "-",
        "Priority":        service?.priority || "-",
        "Allocated Date":  formatDateTime(service?.allotmentDate),
        "Assigned To":     service?.allotTo?.map(e => e.name).join(", ") || "-",
        "Status":          service?.status || "-",
        "Work Mode":       service?.workMode || "-",
        "Completion Date": formatDateTime(service?.completionDate),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 7 }, { wch: 22 }, { wch: 30 }, { wch: 22 }, { wch: 14 },
        { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Services");
      const today   = new Date();
      const dateStr = `${today.getDate()}-${today.toLocaleString("en-IN", { month: "short" })}-${today.getFullYear()}`;
      XLSX.writeFile(wb, `Service_Report_${dateStr}.xlsx`);
      toast.dismiss();
      toast.success(`Excel downloaded! (${rows.length} records)`);
    } catch (err) {
      toast.dismiss(); toast.error("Failed to download Excel"); console.error(err);
    } finally { setExcelLoading(false); }
  };

  const canReview = user?.user === 'company' || user?.permissions?.includes('updateService');

  return (
    <>
      {(loading || updateLoading || deleteLoading || excelLoading) && (
        <div className="overlay"><span className="loader"></span></div>
      )}

      {showReviewModal && <MonthlyReviewModal onClose={() => setShowReviewModal(false)} />}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="ServiceMasterGrid" />
            <div
              className="main-panel"
              style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* Title + buttons */}
                <div className="row px-2 py-1 align-items-center">
                  <div className="col-12 col-lg-6">
                    <h5 className="text-white py-2 mb-0">Service Dashboard</h5>
                  </div>
                  <div className="col-12 col-lg-6 text-end d-flex align-items-center justify-content-end gap-2">
                    {canReview && (
                      <button
                        className="btn btn-warning btn-sm px-3 fw-bold"
                        onClick={() => setShowReviewModal(true)}
                        title="Monthly Engineer Performance Review"
                      >
                        <i className="fa-solid fa-star me-2"></i>
                        Monthly Review
                      </button>
                    )}
                    <button
                      className="btn btn-success btn-sm px-3"
                      onClick={handleExcelDownload}
                      disabled={excelLoading}
                      title="Download All Records as Excel"
                    >
                      <i className="fa-solid fa-file-excel me-2"></i>
                      Download Excel
                    </button>
                  </div>
                </div>

                {/* Active filter indicator */}
                {filters.status && (
                  <div className="px-2 pb-1">
                    <small style={{
                      background: "#eff6ff", color: "#1d4ed8",
                      borderRadius: "6px", padding: "4px 10px",
                      fontWeight: 600, fontSize: "0.78rem",
                    }}>
                      🔵 Filtering by status: <strong>{filters.status}</strong>
                      <button
                        style={{
                          marginLeft: 8, border: "none", background: "none",
                          color: "#dc2626", fontWeight: 700, cursor: "pointer",
                          fontSize: "0.78rem",
                        }}
                        onClick={() => handleCardClick("")}
                      >
                        ✕ Clear
                      </button>
                    </small>
                  </div>
                )}

                {/* Dashboard Cards */}
                <ServiceDashboardCards
                  totalServiceCount={
                    (data?.statusCounts?.Inprogress || 0) +
                    (data?.statusCounts?.Pending    || 0) +
                    (data?.statusCounts?.Stuck      || 0) +
                    (data?.statusCounts?.Completed  || 0)
                  }
                  inprogressServiceCount={data?.statusCounts?.Inprogress || 0}
                  pendingServiceCount={data?.statusCounts?.Pending       || 0}
                  stuckServiceCount={data?.statusCounts?.Stuck           || 0}
                  completeServiceCount={data?.statusCounts?.Completed    || 0}
                  onCardClick={handleCardClick}
                  activeStatusFilter={filters.status || ""}
                />

                {/* Filters Row */}
                <div className="row py-2 px-2 align-items-end g-2">
                  <div className="col-12 col-md-3">
                    <form onSubmit={handleSearchSubmit} className="d-flex">
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control bg_edit"
                          placeholder="Search customer name..."
                          value={searchText}
                          onChange={(e) => {
                            setSearchText(e.target.value);
                            if (e.target.value === "") handleSearchClear();
                          }}
                        />
                        {searchQuery && (
                          <button type="button" className="btn btn-outline-secondary" onClick={handleSearchClear}>
                            <i className="fa fa-times"></i>
                          </button>
                        )}
                      </div>
                      <button className="btn btn-primary ms-1" type="submit">
                        <i className="fa fa-search"></i>
                      </button>
                    </form>
                  </div>
                  <div className="col-6 col-md-2">
                    <select className="form-select bg_edit" value={filters.serviceType || ""}
                      onChange={(e) => handleChange("serviceType", e.target.value)}>
                      <option value="">Select Service</option>
                      <option value="AMC">AMC</option>
                      <option value="Warranty">Warranty</option>
                      <option value="One Time">One Time</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-2">
                    <select className="form-select bg_edit" value={filters.status || ""}
                      onChange={(e) => handleChange("status", e.target.value)}>
                      <option value="">Select Status</option>
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                      <option value="Inprogress">Inprogress</option>
                      <option value="Stuck">Stuck</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-2">
                    <select className="form-select bg_edit" value={filters.priority || ""}
                      onChange={(e) => handleChange("priority", e.target.value)}>
                      <option value="">Select Priority</option>
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-2">
                    <select className="form-select bg_edit" value={productFilter}
                      onChange={(e) => {
                        setProductFilter(e.target.value);
                        setPagination(prev => ({ ...prev, currentPage: 1 }));
                      }}>
                      <option value="">Select Product</option>
                      {productOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-6 col-md-1">
                    <select className="form-select bg_edit" value={filters.allotTo || ""}
                      onChange={(e) => handleChange("allotTo", e.target.value || null)}>
                      <option value="">Assigned To</option>
                      {allEngineers.map((eng) => (
                        <option key={eng._id} value={eng._id}>{eng.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {searchQuery && (
                  <div className="px-3 pb-1">
                    <small className="text-white-50">
                      Showing results for <strong className="text-white">"{searchQuery}"</strong>
                      {" "}— {pagination.totalRecords ?? 0} record(s) found
                    </small>
                  </div>
                )}

                {/* Table */}
                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            <th>Sr. No</th>
                            <th className="align_left_td width_tdd">Customer Name</th>
                            <th className="align_left_td width_tdd" style={{ width: "4rem" }}>Complaint</th>
                            <th className="align_left_td width_tdd">Product</th>
                            <th className="align_left_td width_tdd">Priority</th>
                            <th>Allocated Date</th>
                            <th>Assigned to</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {filteredServices.length > 0 ? (
                            filteredServices.map((service, index) => (
                              <tr className="border my-4" key={service._id}>
                                <td>{index + 1 + (pagination.currentPage - 1) * itemsPerPage}</td>
                                <td className="align_left_td width_tdd">{service?.ticket?.client?.custName}</td>
                                <td className="align_left_td width_tdd wrap-text-of-col">{service?.ticket?.details}</td>
                                <td className="align_left_td width_tdd">{service?.ticket?.product}</td>
                                <td className="align_left_td width_tdd">{service.priority}</td>
                                <td>{formatDateTime(service.allotmentDate)}</td>
                                <td className="width_tdd">
                                  {service.allotTo?.map((item) => item.name).join(', ')}
                                </td>
                                <td className="font-weight-bold" style={{
                                  color: service.status === 'Completed' ? '#28a745' :
                                         service.status === 'Inprogress' ? '#0000FF' :
                                         service.status === 'Pending'    ? '#FFA726' :
                                         service.status === 'Stuck'      ? '#E53935' : '#000'
                                }}>
                                  {service.status}
                                </td>
                                <td>
                                  {(user?.permissions?.includes('updateService') || user?.user === 'company') && (
                                    <span onClick={() => handleUpdate(service)} className="update">
                                      <i className="mx-1 fa-solid fa-pen text-success cursor-pointer"></i>
                                    </span>
                                  )}
                                  {(user?.permissions?.includes('deleteService') || user?.user === 'company') && (
                                    <span onClick={() => handelDeleteClosePopUpClick(service._id)} className="delete">
                                      <i className="mx-1 fa-solid fa-trash text-danger cursor-pointer"></i>
                                    </span>
                                  )}
                                  {(user?.permissions?.includes('viewService') || user?.user === 'company') && (
                                    <span onClick={() => handelDetailsPopUpClick(service)}>
                                      <i className="fa-solid fa-eye cursor-pointer text-primary mx-1"></i>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="9" className="text-center">
                                {searchQuery
                                  ? `No customers found matching "${searchQuery}"`
                                  : "No data found"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Pagination */}
                {!loading && pagination.totalPages > 1 && (
                  <div className="pagination-container text-center my-3">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={!pagination.hasPrevPage}
                      className="btn btn-dark btn-sm me-1"
                      style={{ borderRadius: "4px" }}
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="btn btn-dark btn-sm me-1"
                      style={{ borderRadius: "4px" }}
                    >
                      Previous
                    </button>
                    {(() => {
                      const pageNumbers = [];
                      const maxPagesToShow = 5;
                      let startPage, endPage;
                      if (pagination.totalPages <= maxPagesToShow) {
                        startPage = 1; endPage = pagination.totalPages;
                      } else if (pagination.currentPage <= 3) {
                        startPage = 1; endPage = maxPagesToShow;
                      } else if (pagination.currentPage >= pagination.totalPages - 2) {
                        startPage = pagination.totalPages - maxPagesToShow + 1;
                        endPage   = pagination.totalPages;
                      } else {
                        startPage = pagination.currentPage - 2;
                        endPage   = pagination.currentPage + 2;
                      }
                      startPage = Math.max(1, startPage);
                      endPage   = Math.min(pagination.totalPages, endPage);
                      for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
                      return pageNumbers.map((number) => (
                        <button
                          key={number}
                          onClick={() => handlePageChange(number)}
                          className={`btn btn-sm me-1 ${pagination.currentPage === number ? "btn-primary" : "btn-dark"}`}
                          style={{ minWidth: "35px", borderRadius: "4px" }}
                        >
                          {number}
                        </button>
                      ));
                    })()}
                    <button
                      disabled={!pagination.hasNextPage}
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      className="btn btn-dark btn-sm me-1"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={!pagination.hasNextPage}
                      className="btn btn-dark btn-sm"
                      style={{ borderRadius: "4px" }}
                    >
                      Last
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {deletePopUpShow && (
        <DeletePopUP
          message={"Are you sure! Do you want to Delete ?"}
          cancelBtnCallBack={handelDeleteClosePopUpClick}
          confirmBtnCallBack={handelDeleteClick}
          heading="Delete"
        />
      )}
      {UpdatePopUpShow && (
        <UpdateServicePopup
          handleUpdate={handleUpdateSubmit}
          selectedService={selectedService}
          closePopUp={() => setUpdatePopUpShow(false)}
        />
      )}
      {detailsServicePopUp && (
        <ViewServicePopUp
          closePopUp={handelDetailsPopUpClick}
          selectedService={selectedService}
        />
      )}
    </>
  );
};