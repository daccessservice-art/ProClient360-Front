import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Header } from "../../MainDashboard/Header/Header";
import { Sidebar } from "../../MainDashboard/Sidebar/Sidebar";
import toast from 'react-hot-toast';
import EmployeeUpdateFeedbackPopUp from "./PopUp/EmployeeUpdateFeedbackPopUp";
import { getRemaningFeedback } from "../../../../hooks/useFeedback";
import { formatDateTimeForDisplay } from "../../../../utils/formatDate";

const ITEMS_PER_PAGE = 20;
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Weighted Score Formula (Industry Standard / Bayesian Average) ─────────
// WR = (v / (v + m)) × R + (m / (v + m)) × C
// v = job count, m = min threshold, R = avg rating, C = global avg
const computeWeightedScore = (avgRating, jobCount, globalAvgRating, minThreshold = 3) => {
  const v = jobCount, m = minThreshold, R = avgRating, C = globalAvgRating;
  return (v / (v + m)) * R + (m / (v + m)) * C;
};

// ─── Combined score: equal weight from all available sources ─────────────────
// customerScore → from feedback ratings (filtered by month/year)
// serviceScore  → from serviceReview avgRating
// hrScore       → from hrReview avgRating
// Only counts sources that actually have data (> 0) so one missing source
// doesn't drag down an otherwise strong engineer.
const computeCombinedScore = (customerAvg, serviceAvg, hrAvg) => {
  const sources = [customerAvg, serviceAvg, hrAvg].filter((s) => s > 0);
  if (!sources.length) return 0;
  return sources.reduce((a, b) => a + b, 0) / sources.length;
};

export const EmployeeFeedbackMasterGrid = () => {
  const now = new Date();
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const [UpdatePopUpShow,  setUpdatePopUpShow]  = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [loading,          setLoading]          = useState(true);

  const [searchText, setSearchText] = useState("");
  const [search,     setSearch]     = useState("");

  const [showFeedbackGiven,  setShowFeedbackGiven]  = useState(false);
  const [showHighRatingOnly, setShowHighRatingOnly] = useState(false);
  const [selectedRating,     setSelectedRating]     = useState(0);

  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [currentPage,  setCurrentPage]  = useState(1);

  // ── Service Reviews + HR Reviews for combined leaderboard ─────────────────
  const [serviceReviews, setServiceReviews] = useState([]);
  const [hrReviews,      setHrReviews]      = useState([]);
  const [leaderMonth,    setLeaderMonth]    = useState(now.getMonth());
  const [leaderYear,     setLeaderYear]     = useState(now.getFullYear());

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // ─── Fetch all feedback ────────────────────────────────────────────────────
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const data = await getRemaningFeedback(1, 9999, '');
      if (data && data.success) {
        setAllFeedbacks(data.services || []);
      } else {
        toast.error(data?.error || "Failed to fetch feedback.");
        setAllFeedbacks([]);
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast.error("Failed to fetch feedback.");
      setAllFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch ALL service reviews (for leaderboard) ──────────────────────────
  const fetchServiceReviews = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/serviceReview/all`,
        {
          params: { month: leaderMonth, year: leaderYear },
          headers: authHeader(),
        }
      );
      if (res.data.success) setServiceReviews(res.data.reviews || []);
    } catch (e) {
      console.error("fetchServiceReviews:", e);
      setServiceReviews([]);
    }
  };

  // ─── Fetch ALL HR reviews (for leaderboard) ───────────────────────────────
  const fetchHRReviews = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/hrReview/all`,
        {
          params: { month: leaderMonth, year: leaderYear },
          headers: authHeader(),
        }
      );
      if (res.data.success) setHrReviews(res.data.reviews || []);
    } catch (e) {
      console.error("fetchHRReviews:", e);
      setHrReviews([]);
    }
  };

  useEffect(() => { fetchAllData(); }, [UpdatePopUpShow]);

  useEffect(() => {
    fetchServiceReviews();
    fetchHRReviews();
  }, [leaderMonth, leaderYear]);

  // ─── Overall stats (ALL feedback, for summary cards) ──────────────────────
  const stats = useMemo(() => {
    const result = {
      total: allFeedbacks.length,
      pending: 0,
      completed: 0,
      highRating: 0,
      avgRating: 0,
    };
    let totalRating = 0, ratingCount = 0;
    allFeedbacks.forEach((fb) => {
      const hasFeedback = fb.feedback && fb.feedback.rating;
      if (hasFeedback) {
        result.completed++;
        const r = fb.feedback.rating;
        totalRating += r;
        ratingCount++;
        if (r >= 4) result.highRating++;
      } else {
        result.pending++;
      }
    });
    result.avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0;
    return result;
  }, [allFeedbacks]);

  // ─── Customer feedback map filtered by leaderboard month/year ─────────────
  // This gives each engineer their customer rating ONLY for the selected period.
  const customerLeaderMap = useMemo(() => {
    const map = {};
    allFeedbacks.forEach((fb) => {
      const hasFeedback = fb.feedback && fb.feedback.rating;
      if (!hasFeedback) return;

      // Filter by completionDate matching leaderMonth / leaderYear
      if (fb.completionDate) {
        const d = new Date(fb.completionDate);
        if (d.getMonth() !== leaderMonth || d.getFullYear() !== leaderYear) return;
      }

      const r = fb.feedback.rating;
      (fb.allotTo || []).forEach((engineer) => {
        if (!engineer?._id) return;
        if (!map[engineer._id]) {
          map[engineer._id] = {
            name: engineer.name,
            totalRating: 0,
            jobCount: 0,
            highRatingCount: 0,
          };
        }
        map[engineer._id].totalRating += r;
        map[engineer._id].jobCount++;
        if (r >= 4) map[engineer._id].highRatingCount++;
      });
    });
    return map;
  }, [allFeedbacks, leaderMonth, leaderYear]);

  // ─── Service review map: engineerId → avgRating (selected month/year) ─────
  const serviceReviewMap = useMemo(() => {
    const map = {};
    serviceReviews
      .filter((r) => r.month === leaderMonth && r.year === leaderYear)
      .forEach((r) => {
        map[r.engineerId?.toString()] = parseFloat(r.avgRating) || 0;
      });
    return map;
  }, [serviceReviews, leaderMonth, leaderYear]);

  // ─── HR review map: engineerId → avgRating (selected month/year) ──────────
  const hrReviewMap = useMemo(() => {
    const map = {};
    hrReviews
      .filter((r) => r.month === leaderMonth && r.year === leaderYear)
      .forEach((r) => {
        map[r.engineerId?.toString()] = parseFloat(r.avgRating) || 0;
      });
    return map;
  }, [hrReviews, leaderMonth, leaderYear]);

  // ─── Top 3 Combined Engineers (all 3 sources, selected month/year) ─────────
  const combinedTopEngineers = useMemo(() => {
    const globalAvg = parseFloat(stats.avgRating) || 3.0;

    // Union of all engineer IDs that appear in ANY source for this period
    const allEngIds = new Set([
      ...Object.keys(customerLeaderMap),
      ...Object.keys(serviceReviewMap),
      ...Object.keys(hrReviewMap),
    ]);

    return [...allEngIds]
      .map((engId) => {
        const custData = customerLeaderMap[engId];
        const custAvg  = custData && custData.jobCount > 0
          ? parseFloat((custData.totalRating / custData.jobCount).toFixed(2))
          : 0;
        const serviceAvg = serviceReviewMap[engId] || 0;
        const hrAvg      = hrReviewMap[engId]      || 0;

        const combinedScore = computeCombinedScore(custAvg, serviceAvg, hrAvg);
        const weightedScore = computeWeightedScore(
          combinedScore,
          custData?.jobCount || 1,
          globalAvg,
          3
        );

        return {
          id:           engId,
          name:         custData?.name || "Unknown",
          jobCount:     custData?.jobCount     || 0,
          highRating:   custData?.highRatingCount || 0,
          customerAvg:  custAvg,
          serviceAvg,
          hrAvg,
          combinedScore: parseFloat(combinedScore.toFixed(2)),
          weightedScore: parseFloat(weightedScore.toFixed(2)),
        };
      })
      // Exclude engineers with no name (appeared only in review maps, not customer feedback)
      // We still include them if they have a service or HR review — fetch name from review data
      .map((eng) => {
        if (eng.name === "Unknown") {
          // Try to get name from serviceReviews or hrReviews
          const sr = serviceReviews.find((r) => r.engineerId?.toString() === eng.id);
          const hr = hrReviews.find((r) => r.engineerId?.toString() === eng.id);
          const name = sr?.engineerName || hr?.engineerName || null;
          return { ...eng, name: name || "Unknown" };
        }
        return eng;
      })
      .filter((e) => e.name && e.name !== "Unknown")
      .sort(
        (a, b) =>
          b.weightedScore   - a.weightedScore   ||
          b.combinedScore   - a.combinedScore   ||
          b.jobCount        - a.jobCount
      )
      .slice(0, 3); // ← TOP 3
  }, [customerLeaderMap, serviceReviewMap, hrReviewMap, stats.avgRating, serviceReviews, hrReviews]);

  // ─── Search & filter logic ─────────────────────────────────────────────────
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return allFeedbacks;
    const q = search.trim().toLowerCase();
    return allFeedbacks.filter((fb) => {
      const client     = fb.ticket?.client?.custName?.toLowerCase() || '';
      const person     = fb.ticket?.contactPerson?.toLowerCase()    || '';
      const contact    = fb.ticket?.contactNumber != null ? String(fb.ticket.contactNumber).toLowerCase() : '';
      const assignedTo = (fb.allotTo || []).map((e) => e?.name ? e.name.toLowerCase() : '').join(' ');
      return client.includes(q) || person.includes(q) || contact.includes(q) || assignedTo.includes(q);
    });
  }, [allFeedbacks, search]);

  const filteredFeedbacks = useMemo(() => {
    return searchFiltered.filter((fb) => {
      const hasFeedback  = fb.feedback && fb.feedback.rating;
      const isHighRating = hasFeedback && fb.feedback.rating >= 4;
      if (selectedRating > 0) return hasFeedback && fb.feedback.rating === selectedRating;
      if (showHighRatingOnly) return isHighRating;
      if (showFeedbackGiven)  return hasFeedback;
      return !hasFeedback;
    });
  }, [searchFiltered, showFeedbackGiven, showHighRatingOnly, selectedRating]);

  const totalPages         = Math.ceil(filteredFeedbacks.length / ITEMS_PER_PAGE);
  const paginatedFeedbacks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredFeedbacks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredFeedbacks, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [showFeedbackGiven, showHighRatingOnly, search, selectedRating]);

  const pendingCount    = useMemo(() => searchFiltered.filter((f) => !(f.feedback && f.feedback.rating)).length,      [searchFiltered]);
  const givenCount      = useMemo(() => searchFiltered.filter((f) =>  f.feedback && f.feedback.rating).length,        [searchFiltered]);
  const highRatingCount = useMemo(() => searchFiltered.filter((f) =>  f.feedback && f.feedback.rating >= 4).length,   [searchFiltered]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const getCardType = (fb) => {
    if (!fb.feedback || !fb.feedback.rating)
      return { type: 'pending',   bgColor: '#fff8e1', borderColor: '#ffc107', textColor: '#f57c00' };
    const r = fb.feedback.rating;
    if (r === 5) return { type: 'excellent', bgColor: '#e8f5e9', borderColor: '#4caf50', textColor: '#2e7d32' };
    if (r === 4) return { type: 'good',      bgColor: '#e0f7fa', borderColor: '#00bcd4', textColor: '#00838f' };
    if (r === 3) return { type: 'average',   bgColor: '#fff3e0', borderColor: '#ff9800', textColor: '#ef6c00' };
    return { type: 'poor', bgColor: '#ffebee', borderColor: '#f44336', textColor: '#c62828' };
  };

  const renderStars = (rating) => (
    <div className="d-flex align-items-center">
      {[...Array(5)].map((_, i) => (
        <i key={i} className={`fa fa-star ${i < rating ? 'text-warning' : 'text-light'}`} style={{ fontSize: '16px' }}></i>
      ))}
      <span className="ms-1 fw-bold">{rating}</span>
    </div>
  );

  const renderEngineerName = (engineer, hasHighRating) =>
    hasHighRating ? (
      <span className="badge bg-success me-1 position-relative" key={engineer._id}>
        <i className="fa fa-trophy me-1"></i>{engineer.name}
        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning">
          <i className="fa fa-star" style={{ fontSize: '10px' }}></i>
        </span>
      </span>
    ) : (
      <span className="badge bg-secondary me-1" key={engineer._id}>{engineer.name}</span>
    );

  // Rank badges — only 3 positions needed
  const getRankBadge = (index) => {
    if (index === 0) return { icon: '🥇', label: 'Champion',   color: '#FFD700' };
    if (index === 1) return { icon: '🥈', label: 'Runner Up',  color: '#C0C0C0' };
    return              { icon: '🥉', label: '3rd Place',   color: '#CD7F32' };
  };

  const getExpBadge = (jobCount) => {
    if (jobCount >= 20) return { label: 'Expert',      color: 'bg-danger'    };
    if (jobCount >= 10) return { label: 'Senior',      color: 'bg-primary'   };
    if (jobCount >= 5)  return { label: 'Experienced', color: 'bg-info'      };
    return                     { label: 'Rising',      color: 'bg-secondary' };
  };

  const scoreBarColor = (val) => {
    if (val >= 4) return '#10b981';
    if (val >= 3) return '#f59e0b';
    return '#ef4444';
  };

  const handleUpdate = (feedback = null) => {
    if (feedback) setSelectedFeedback(feedback);
    setUpdatePopUpShow(!UpdatePopUpShow);
  };

  const handleSearchSubmit  = (e) => { e.preventDefault(); setSearch(searchText); };
  const handleSearchChange  = (e) => { const v = e.target.value; setSearchText(v); if (v === '') setSearch(''); };
  const handleToggleHighRating = () => { setShowHighRatingOnly(!showHighRatingOnly); setShowFeedbackGiven(true); setSelectedRating(0); };

  // Pagination buttons
  const maxPageButtons = 5;
  const halfMax  = Math.floor(maxPageButtons / 2);
  let startPage  = Math.max(1, currentPage - halfMax);
  let endPage    = Math.min(totalPages, startPage + maxPageButtons - 1);
  if (endPage - startPage + 1 < maxPageButtons) startPage = Math.max(1, endPage - maxPageButtons + 1);
  const pageButtons = [];
  for (let i = startPage; i <= endPage; i++) pageButtons.push(i);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      {loading && <div className="overlay"><span className="loader"></span></div>}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="EmployeeFeedbackMasterGrid" />
            <div
              className="main-panel"
              style={{
                width:      isopen ? "" : "calc(100% - 120px)",
                marginLeft: isopen ? "" : "125px",
              }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* ── Header + Search ── */}
                <div className="row px-2 py-1 align-items-center">
                  <div className="col-12 col-lg-6">
                    <h5 className="text-white py-2 mb-0">
                      <i className="fa fa-star me-2"></i>Feedback & Reviews
                    </h5>
                  </div>
                  <div className="col-12 col-lg-6">
                    <div className="row g-2 justify-content-end align-items-center">
                      <div className="col-sm-8 col-md-7 col-lg-6">
                        <form onSubmit={handleSearchSubmit} className="d-flex">
                          <input
                            type="text"
                            className="form-control me-2"
                            placeholder="Search Client, Contact, Assigned To..."
                            value={searchText}
                            onChange={handleSearchChange}
                          />
                          <button className="btn btn-primary" type="submit">
                            <i className="fa fa-search"></i>
                          </button>
                          {searchText && (
                            <button
                              className="btn btn-outline-secondary ms-2"
                              type="button"
                              onClick={() => { setSearchText(''); setSearch(''); }}
                            >
                              <i className="fa fa-times"></i>
                            </button>
                          )}
                        </form>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Statistics Cards ── */}
                <div className="row px-2 py-3">
                  {[
                    { label: "Total Services",        val: stats.total,      color: "#4e73df", icon: "fas fa-clipboard-list" },
                    { label: "Pending Feedback",       val: stats.pending,    color: "#f6c23e", icon: "fas fa-clock" },
                    { label: "High Ratings (4–5 ⭐)",  val: stats.highRating, color: "#1cc88a", icon: "fas fa-star" },
                    { label: "Average Rating",         val: stats.avgRating,  color: "#36b9cc", icon: "fas fa-chart-line", progress: true },
                  ].map((s) => (
                    <div key={s.label} className="col-12 col-md-3 mb-3">
                      <div className="card shadow h-100 py-2" style={{ borderLeft: `4px solid ${s.color}` }}>
                        <div className="card-body">
                          <div className="row no-gutters align-items-center">
                            <div className="col mr-2">
                              <div className="text-xs font-weight-bold text-uppercase mb-1"
                                style={{ color: s.color, fontSize: "0.75rem" }}>
                                {s.label}
                              </div>
                              {s.progress ? (
                                <div className="row no-gutters align-items-center">
                                  <div className="col-auto">
                                    <div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">{s.val}</div>
                                  </div>
                                  <div className="col">
                                    <div className="progress progress-sm mr-2">
                                      <div className="progress-bar bg-info" style={{ width: `${s.val * 20}%` }}></div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="h5 mb-0 font-weight-bold text-gray-800">{s.val}</div>
                              )}
                            </div>
                            <div className="col-auto">
                              <i className={`${s.icon} fa-2x text-gray-300`}></i>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ════════════════════════════════════════════════════════
                    🏆 TOP 3 PERFORMING ENGINEERS — All 3 Review Sources
                    Customer Feedback + Service Manager Review + HR Review
                ════════════════════════════════════════════════════════ */}
                <div className="row px-2 pb-3">
                  <div className="col-12">
                    <div className="card shadow">

                      {/* Card Header */}
                      <div className="card-header py-2 d-flex flex-row align-items-center justify-content-between flex-wrap gap-2">
                        <div>
                          <h6 className="m-0 font-weight-bold text-primary">
                            <i className="fa fa-trophy me-2 text-warning"></i>
                            🏆 Top 3 Performing Engineers
                            <small className="text-muted ms-2" style={{ fontSize: '11px', fontWeight: 'normal' }}>
                              Combined: 😊 Customer Feedback + 🔧 Service Manager Review + 👥 HR Review
                            </small>
                          </h6>
                        </div>

                        {/* Month / Year filter */}
                        <div className="d-flex align-items-center gap-2">
                          <small className="text-muted fw-bold">Period:</small>
                          <select
                            className="form-select form-select-sm"
                            style={{ width: "auto" }}
                            value={leaderMonth}
                            onChange={(e) => setLeaderMonth(Number(e.target.value))}
                          >
                            {MONTHS.map((m, i) => (
                              <option key={m} value={i}>{m}</option>
                            ))}
                          </select>
                          <select
                            className="form-select form-select-sm"
                            style={{ width: "auto" }}
                            value={leaderYear}
                            onChange={(e) => setLeaderYear(Number(e.target.value))}
                          >
                            {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="card-body pb-2">
                        {combinedTopEngineers.length === 0 ? (
                          <div className="text-center text-muted py-4" style={{ fontSize: "0.85rem" }}>
                            <div style={{ fontSize: "2rem", marginBottom: 8 }}>📭</div>
                            No data available for <strong>{MONTHS[leaderMonth]} {leaderYear}</strong>.<br />
                            <small>Submit Customer Feedback, Service Manager Reviews, or HR Reviews for this period to see the leaderboard.</small>
                          </div>
                        ) : (
                          <>
                            {/* ── Top 3 Cards ── */}
                            <div className="row justify-content-center">
                              {combinedTopEngineers.map((eng, index) => {
                                const rank     = getRankBadge(index);
                                const expBadge = getExpBadge(eng.jobCount);
                                return (
                                  <div key={eng.id} className="col-md-6 col-lg-4 mb-3">
                                    <div
                                      className="card shadow-sm h-100"
                                      style={{
                                        borderLeft:   `5px solid ${rank.color}`,
                                        borderRadius: '12px',
                                        transition:   'transform 0.2s',
                                      }}
                                    >
                                      <div className="card-body py-3">

                                        {/* Name + Rank */}
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                          <div className="d-flex align-items-center gap-2">
                                            <span style={{ fontSize: '2rem', lineHeight: 1 }}>
                                              {rank.icon}
                                            </span>
                                            <div>
                                              <div className="fw-bold text-dark" style={{ fontSize: '15px' }}>
                                                {eng.name}
                                              </div>
                                              <div className="d-flex align-items-center gap-1 mt-1">
                                                <span className={`badge ${expBadge.color}`} style={{ fontSize: '10px' }}>
                                                  {expBadge.label}
                                                </span>
                                                <small className="text-muted" style={{ fontSize: '11px' }}>
                                                  {rank.label}
                                                </small>
                                              </div>
                                            </div>
                                          </div>
                                          <i className="fas fa-award fa-lg" style={{ color: rank.color }}></i>
                                        </div>

                                        {/* 3-Source Score Grid */}
                                        <div className="row text-center g-0 mb-2">
                                          {[
                                            { label: "Customer", val: eng.customerAvg, icon: "😊" },
                                            { label: "Service",  val: eng.serviceAvg,  icon: "🔧" },
                                            { label: "HR",       val: eng.hrAvg,       icon: "👥" },
                                          ].map((src, si) => (
                                            <div key={src.label} className={`col-4 ${si < 2 ? 'border-end' : ''}`}>
                                              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                                                {src.icon} {src.label}
                                              </div>
                                              <div
                                                className="fw-bold"
                                                style={{ color: scoreBarColor(src.val), fontSize: "0.88rem" }}
                                              >
                                                {src.val > 0 ? `${src.val}/5` : <span style={{ color: '#d1d5db' }}>—</span>}
                                              </div>
                                              {/* Mini progress bar */}
                                              <div style={{ height: 3, background: '#e5e7eb', borderRadius: 2, margin: '3px 6px 0' }}>
                                                <div style={{
                                                  height: '100%', borderRadius: 2,
                                                  width: `${(src.val / 5) * 100}%`,
                                                  background: scoreBarColor(src.val),
                                                  transition: 'width 0.6s ease',
                                                }} />
                                              </div>
                                            </div>
                                          ))}
                                        </div>

                                        {/* Combined score */}
                                        <div className="d-flex align-items-center justify-content-between mt-2">
                                          <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>
                                            Combined Score
                                          </span>
                                          <span className="fw-bold" style={{ color: rank.color, fontSize: '1rem' }}>
                                            ⭐ {eng.combinedScore} / 5
                                          </span>
                                        </div>

                                        {/* Combined progress bar */}
                                        <div className="mt-1 mb-2">
                                          <div className="progress" style={{ height: '6px', borderRadius: 4 }}>
                                            <div
                                              className="progress-bar"
                                              style={{
                                                width:           `${Math.min((eng.combinedScore / 5) * 100, 100)}%`,
                                                backgroundColor: rank.color,
                                                transition:      'width 0.8s ease',
                                                borderRadius:    4,
                                              }}
                                            />
                                          </div>
                                        </div>

                                        {/* Footer stats */}
                                        <div className="d-flex justify-content-between" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                          <span>
                                            <i className="fas fa-check-circle text-success me-1"></i>
                                            {eng.jobCount} jobs
                                          </span>
                                          <span>
                                            <i className="fas fa-star text-warning me-1"></i>
                                            {eng.highRating} high ratings
                                          </span>
                                          <span>
                                            <i className="fas fa-calculator text-info me-1"></i>
                                            Score: {eng.weightedScore}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Score Legend */}
                            <div className="alert alert-light border mt-1 mb-0 py-2" style={{ fontSize: '11px' }}>
                              <i className="fas fa-info-circle text-info me-1"></i>
                              <strong>Combined Score</strong> = Average of available sources (😊 Customer Feedback +
                              🔧 Service Manager Review + 👥 HR Review) for <strong>{MONTHS[leaderMonth]} {leaderYear}</strong>.
                              &nbsp;— means no review submitted for that source yet.
                              The <strong>Weighted Score</strong> adjusts for job count (engineers with more jobs rank higher if scores are equal).
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Toggle Buttons ── */}
                <div className="row px-2 py-2">
                  <div className="col-12">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <button
                        onClick={() => { setShowFeedbackGiven(false); setShowHighRatingOnly(false); setSelectedRating(0); }}
                        className={`btn ${!showFeedbackGiven && !showHighRatingOnly ? 'btn-warning' : 'btn-outline-warning'}`}
                        style={{ fontWeight: 'bold', minWidth: '180px' }}
                      >
                        <i className="fa fa-clock me-2"></i>
                        Pending Feedback ({pendingCount})
                      </button>
                      <button
                        onClick={() => { setShowFeedbackGiven(true); setShowHighRatingOnly(false); setSelectedRating(0); }}
                        className={`btn ${showFeedbackGiven && !showHighRatingOnly ? 'btn-success' : 'btn-outline-success'}`}
                        style={{ fontWeight: 'bold', minWidth: '180px' }}
                      >
                        <i className="fa fa-check-circle me-2"></i>
                        All Feedback ({givenCount})
                      </button>
                      <button
                        onClick={handleToggleHighRating}
                        className={`btn ${showHighRatingOnly ? 'btn-primary' : 'btn-outline-primary'}`}
                        style={{ fontWeight: 'bold', minWidth: '180px' }}
                      >
                        <i className="fa fa-trophy me-2"></i>
                        High Ratings Only ({highRatingCount})
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Rating Filter Bar ── */}
                <div className="row px-2 pb-2">
                  <div className="col-12">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="text-white fw-bold me-1" style={{ fontSize: '14px' }}>Filter by Rating:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => {
                            if (selectedRating === star) {
                              setSelectedRating(0);
                            } else {
                              setSelectedRating(star);
                              setShowFeedbackGiven(true);
                              setShowHighRatingOnly(false);
                            }
                          }}
                          className={`btn btn-sm ${selectedRating === star ? 'btn-warning' : 'btn-outline-secondary'}`}
                          style={{ fontWeight: 'bold', minWidth: '70px' }}
                        >
                          {[...Array(star)].map((_, i) => (
                            <i key={i} className="fa fa-star text-warning" style={{ fontSize: '12px' }}></i>
                          ))}
                          {selectedRating !== star && <span className="ms-1" style={{ fontSize: '12px' }}>{star}</span>}
                        </button>
                      ))}
                      {selectedRating > 0 && (
                        <button onClick={() => setSelectedRating(0)} className="btn btn-sm btn-outline-danger">
                          <i className="fa fa-times me-1"></i> Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Table ── */}
                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            <th>Sr. No</th>
                            <th className="align_left_td">Client Name</th>
                            <th className="align_left_td">Contact Person</th>
                            <th className="align_left_td">Contact No</th>
                            <th className="align_left_td">Product</th>
                            <th>Allotment Date</th>
                            <th>Completion Date</th>
                            <th>Assigned to</th>
                            <th>Rating</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {paginatedFeedbacks.length > 0 ? (
                            paginatedFeedbacks.map((feedback, index) => {
                              const hasFeedback   = feedback.feedback && feedback.feedback.rating;
                              const hasHighRating = hasFeedback && feedback.feedback.rating >= 4;
                              const cardType      = getCardType(feedback);
                              const globalIndex   = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                              return (
                                <tr
                                  key={feedback._id}
                                  className="border my-4"
                                  style={{
                                    backgroundColor: cardType.bgColor,
                                    borderLeft:      `4px solid ${cardType.borderColor}`,
                                    color:           cardType.textColor,
                                  }}
                                >
                                  <td>{globalIndex}</td>
                                  <td className="align_left_td">{feedback.ticket?.client?.custName || 'N/A'}</td>
                                  <td className="align_left_td">{feedback.ticket?.contactPerson   || 'N/A'}</td>
                                  <td className="align_left_td">{feedback.ticket?.contactNumber   || 'N/A'}</td>
                                  <td className="align_left_td">{feedback.ticket?.product         || 'N/A'}</td>
                                  <td>{formatDateTimeForDisplay(feedback.allotmentDate)}</td>
                                  <td>{formatDateTimeForDisplay(feedback.completionDate)}</td>
                                  <td>
                                    {feedback.allotTo?.map((person) =>
                                      renderEngineerName(person, hasHighRating)
                                    ) || 'N/A'}
                                  </td>
                                  <td>{hasFeedback ? renderStars(feedback.feedback.rating) : '-'}</td>
                                  <td>
                                    <span className="badge" style={{ backgroundColor: cardType.borderColor, color: 'white' }}>
                                      {hasFeedback ? `Feedback Given (${cardType.type})` : 'Pending Feedback'}
                                    </span>
                                  </td>
                                  <td>
                                    <span
                                      onClick={() => handleUpdate(feedback)}
                                      style={{ cursor: 'pointer' }}
                                      title={hasFeedback ? "View/Update Feedback" : "Add Feedback"}
                                    >
                                      <i className={`fa-solid fa-eye ${hasFeedback ? 'text-primary' : 'text-warning'}`}></i>
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="11" className="text-center">
                                {loading ? 'Loading...' :
                                  selectedRating > 0
                                    ? `No feedback found with ${selectedRating} star${selectedRating > 1 ? 's' : ''}.`
                                    : showHighRatingOnly ? 'No high ratings found.'
                                    : showFeedbackGiven  ? 'No feedback given yet.'
                                    : search             ? `No results found for "${search}"`
                                    : 'No pending feedback found.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                  <div className="pagination-container text-center my-3">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="btn btn-dark btn-sm me-2">First</button>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="btn btn-dark btn-sm me-2">Previous</button>
                    {startPage > 1 && <span className="mx-2">...</span>}
                    {pageButtons.map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`btn btn-sm me-1 ${currentPage === page ? "btn-primary" : "btn-dark"}`}
                      >
                        {page}
                      </button>
                    ))}
                    {endPage < totalPages && <span className="mx-2">...</span>}
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="btn btn-dark btn-sm me-2">Next</button>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className="btn btn-dark btn-sm">Last</button>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {UpdatePopUpShow && selectedFeedback && (
        <EmployeeUpdateFeedbackPopUp
          selectedFeedback={selectedFeedback}
          handleUpdate={handleUpdate}
          onSuccess={() => fetchAllData()}
        />
      )}
    </>
  );
};