import { useMemo, useState, useEffect } from "react";
import axios from "axios";

export const EmployeeLeadFollowUpSection = ({ leads = [] }) => {

  // ── Fetch ALL leads for accurate counts ──
  const [allLeads, setAllLeads] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/leads/my-leads`,
          {
            params: { page: 1, limit: 99999 },
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
        if (response.data.success) {
          setAllLeads(response.data.leads || []);
        }
      } catch (err) {
        console.error("EmployeeLeadFollowUpSection fetch error:", err);
      }
    };
    fetchAll();
  }, []);

  // Use allLeads if fetched, fallback to prop
  const sourceLeads = allLeads.length > 0 ? allLeads : leads;

  const { todayLeads, overdueLeads, pendingLeads } = useMemo(() => {
    const today = [];
    const overdue = [];
    const pending = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    sourceLeads.forEach((lead) => {
      // ── Pending Enquiries: STATUS === "Pending", not Won/Lost ──
      if (lead.STATUS === "Pending") {
        pending.push(lead);
      }

      // ── Today / Overdue: based on nextFollowUpDate, skip Won/Lost ──
      if (!lead.nextFollowUpDate) return;
      if (lead.STATUS === "Won" || lead.STATUS === "Lost") return;

      const followUp = new Date(lead.nextFollowUpDate);
      if (isNaN(followUp.getTime())) return;

      if (followUp >= startOfToday && followUp <= endOfToday) {
        today.push(lead);
      } else if (followUp < startOfToday) {
        overdue.push(lead);
      }
    });

    return { todayLeads: today, overdueLeads: overdue, pendingLeads: pending };
  }, [sourceLeads]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const statusBadge = (status) => {
    switch (status) {
      case "Won":     return { cls: "badge text-white", bg: "#198754" };
      case "Ongoing": return { cls: "badge text-white", bg: "#0d6efd" };
      case "Pending": return { cls: "badge text-dark",  bg: "#ffc107" };
      case "Lost":    return { cls: "badge text-white", bg: "#dc3545" };
      default:        return { cls: "badge text-white", bg: "#6c757d" };
    }
  };

  const hasAnyData = todayLeads.length > 0 || overdueLeads.length > 0 || pendingLeads.length > 0;
  if (!hasAnyData && sourceLeads.length === 0) return null;

  const todayDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const renderTableBody = (data, type) => {
    if (data.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="text-center text-muted py-4" style={{ fontSize: "0.8rem" }}>
            No {type} follow-ups found
          </td>
        </tr>
      );
    }

    return data.map((lead, idx) => {
      const sb = statusBadge(lead.STATUS);
      const rowAnimation = type === "Overdue" ? "blinkDarkRed 1.4s infinite" : type === "Today" ? "blinkRed 1.4s infinite" : "none";
      const dotColor = type === "Overdue" ? "#8b0000" : type === "Today" ? "#dc3545" : "#6366f1";

      return (
        <tr key={lead._id} style={{
          animation: rowAnimation,
          borderBottom: "1px solid rgba(0,0,0,0.05)",
        }}>
          <td className="text-center align-middle" style={{ border: "none", padding: "9px 10px", color: "#ccc", fontWeight: 700 }}>{idx + 1}</td>
          <td className="align-middle" style={{ border: "none", padding: "9px 10px" }}>
            <div className="d-flex align-items-center gap-2">
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: dotColor, flexShrink: 0, display: "inline-block",
              }} />
              <span style={{ fontWeight: 600, color: "#1e1e1e" }}>
                {lead.SENDER_COMPANY || "N/A"}
              </span>
            </div>
          </td>
          <td className="align-middle" style={{ border: "none", padding: "9px 10px", color: "#555" }}>{lead.SENDER_NAME || "N/A"}</td>
          <td className="align-middle" style={{ border: "none", padding: "9px 10px", color: "#555" }}>{lead.QUERY_PRODUCT_NAME || "N/A"}</td>
          <td className="text-center align-middle" style={{ border: "none", padding: "9px 10px" }}>
            <span style={{
              fontWeight: 700, color: dotColor, fontSize: "0.76rem",
              background: `${dotColor}15`, borderRadius: "6px",
              padding: "3px 9px", border: `1px solid ${dotColor}30`,
              display: "inline-block",
            }}>
              {formatDate(lead.nextFollowUpDate)}
            </span>
          </td>
          <td className="text-center align-middle" style={{ border: "none", padding: "9px 10px" }}>
            <span className={sb.cls} style={{
              background: sb.bg, fontSize: "0.7rem",
              borderRadius: "6px", padding: "3px 10px",
              boxShadow: `0 2px 6px ${sb.bg}44`,
            }}>
              {lead.STATUS}
            </span>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="row p-lg-2 m-1 mt-2 g-3">

      {/* ========= Today Followup ========== */}
      <div className="col-12 col-md-6 col-xl-4">
        <div style={{
          background: "#fff",
          borderRadius: "14px",
          border: "1.5px solid rgba(220,53,69,0.20)",
          boxShadow: "0 4px 20px rgba(220,53,69,0.10), 0 1px 4px rgba(0,0,0,0.06)",
          overflow: "hidden",
          height: "100%"
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #fff8f8 0%, #ffe8e8 100%)",
            borderBottom: "1.5px solid rgba(220,53,69,0.13)",
            padding: "13px 18px",
            display: "flex",
            alignItems: "center",
            gap: "9px",
          }}>
            <span style={{
              display: "inline-block", width: 10, height: 10,
              borderRadius: "50%", background: "#dc3545", flexShrink: 0,
              animation: "pulseRed 1.2s infinite",
            }} />
            <h6 className="mb-0 fw-bold" style={{ color: "#b91c1c", fontSize: "0.9rem" }}>
              Today Follow-up
            </h6>
            <span style={{
              background: "#dc3545", color: "#fff", borderRadius: "20px",
              padding: "2px 10px", fontSize: "0.7rem", fontWeight: 700,
              boxShadow: "0 2px 8px rgba(220,53,69,0.28)",
            }}>
              {todayLeads.length}
            </span>
            <span style={{
              marginLeft: "auto", fontSize: "0.7rem", color: "#b91c1c",
              background: "rgba(220,53,69,0.07)", border: "1px solid rgba(220,53,69,0.18)",
              borderRadius: "8px", padding: "2px 10px", fontWeight: 600,
            }}>
              📅 {todayDate}
            </span>
          </div>
          {/* Table */}
          <div className="table-responsive" style={{ maxHeight: "300px", overflowY: "auto" }}>
            <table className="table mb-0" style={{ fontSize: "0.81rem" }}>
              <thead style={{
                position: "sticky", top: 0, zIndex: 1,
                background: "#fdf4f4",
                borderBottom: "2px solid rgba(220,53,69,0.12)",
              }}>
                <tr>
                  {["#", "COMPANY", "CONTACT", "PRODUCT", "FOLLOW-UP", "STATUS"].map((h, i) => (
                    <th key={h} className={i === 0 || i >= 4 ? "text-center" : ""} style={{
                      color: "#777", fontWeight: 600, fontSize: "0.72rem",
                      border: "none", padding: "9px 10px", letterSpacing: "0.4px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderTableBody(todayLeads, "Today")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========= Overdue Followup ========== */}
      <div className="col-12 col-md-6 col-xl-4">
        <div style={{
          background: "#fff",
          borderRadius: "14px",
          border: "1.5px solid rgba(139,0,0,0.20)",
          boxShadow: "0 4px 20px rgba(139,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
          overflow: "hidden",
          height: "100%"
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #fff8f8 0%, #fce8e8 100%)",
            borderBottom: "1.5px solid rgba(139,0,0,0.13)",
            padding: "13px 18px",
            display: "flex",
            alignItems: "center",
            gap: "9px",
          }}>
            <span style={{
              display: "inline-block", width: 10, height: 10,
              borderRadius: "50%", background: "#8b0000", flexShrink: 0,
              animation: "pulseDarkRed 1.2s infinite",
            }} />
            <h6 className="mb-0 fw-bold" style={{ color: "#8b0000", fontSize: "0.9rem" }}>
              Overdue Follow-up
            </h6>
            <span style={{
              background: "#8b0000", color: "#fff", borderRadius: "20px",
              padding: "2px 10px", fontSize: "0.7rem", fontWeight: 700,
              boxShadow: "0 2px 8px rgba(139,0,0,0.28)",
            }}>
              {overdueLeads.length}
            </span>
            <span style={{
              marginLeft: "auto", fontSize: "0.7rem", color: "#8b0000",
              background: "rgba(139,0,0,0.07)", border: "1px solid rgba(139,0,0,0.18)",
              borderRadius: "8px", padding: "2px 10px", fontWeight: 600,
            }}>
              ⚠️ Action Required
            </span>
          </div>
          {/* Table */}
          <div className="table-responsive" style={{ maxHeight: "300px", overflowY: "auto" }}>
            <table className="table mb-0" style={{ fontSize: "0.81rem" }}>
              <thead style={{
                position: "sticky", top: 0, zIndex: 1,
                background: "#fdf4f4",
                borderBottom: "2px solid rgba(139,0,0,0.12)",
              }}>
                <tr>
                  {["#", "COMPANY", "CONTACT", "PRODUCT", "OVERDUE SINCE", "STATUS"].map((h, i) => (
                    <th key={h} className={i === 0 || i >= 4 ? "text-center" : ""} style={{
                      color: "#777", fontWeight: 600, fontSize: "0.72rem",
                      border: "none", padding: "9px 10px", letterSpacing: "0.4px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderTableBody(overdueLeads, "Overdue")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========= Pending Enquiries ========== */}
      <div className="col-12 col-md-6 col-xl-4">
        <div style={{
          background: "#fff",
          borderRadius: "14px",
          border: "1.5px solid rgba(99,102,241,0.20)",
          boxShadow: "0 4px 20px rgba(99,102,241,0.10), 0 1px 4px rgba(0,0,0,0.06)",
          overflow: "hidden",
          height: "100%"
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)",
            borderBottom: "1.5px solid rgba(99,102,241,0.13)",
            padding: "13px 18px",
            display: "flex",
            alignItems: "center",
            gap: "9px",
          }}>
            <span style={{
              display: "inline-block", width: 10, height: 10,
              borderRadius: "50%", background: "#6366f1", flexShrink: 0,
              animation: "pulseIndigo 1.2s infinite",
            }} />
            <h6 className="mb-0 fw-bold" style={{ color: "#4338ca", fontSize: "0.9rem" }}>
              Pending Enquiries
            </h6>
            <span style={{
              background: "#6366f1", color: "#fff", borderRadius: "20px",
              padding: "2px 10px", fontSize: "0.7rem", fontWeight: 700,
              boxShadow: "0 2px 8px rgba(99,102,241,0.28)",
            }}>
              {pendingLeads.length}
            </span>
            <span style={{
              marginLeft: "auto", fontSize: "0.7rem", color: "#4338ca",
              background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)",
              borderRadius: "8px", padding: "2px 10px", fontWeight: 600,
            }}>
              🕐 Pending
            </span>
          </div>
          {/* Table */}
          <div className="table-responsive" style={{ maxHeight: "300px", overflowY: "auto" }}>
            <table className="table mb-0" style={{ fontSize: "0.81rem" }}>
              <thead style={{
                position: "sticky", top: 0, zIndex: 1,
                background: "#f5f7ff",
                borderBottom: "2px solid rgba(99,102,241,0.12)",
              }}>
                <tr>
                  {["#", "COMPANY", "CONTACT", "PRODUCT", "FOLLOW-UP", "STATUS"].map((h, i) => (
                    <th key={h} className={i === 0 || i >= 4 ? "text-center" : ""} style={{
                      color: "#777", fontWeight: 600, fontSize: "0.72rem",
                      border: "none", padding: "9px 10px", letterSpacing: "0.4px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderTableBody(pendingLeads, "Pending")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blinkRed {
          0%, 100% { background-color: rgba(255, 50, 50, 0.03); }
          50%       { background-color: rgba(255, 130, 130, 0.12); }
        }
        @keyframes blinkDarkRed {
          0%, 100% { background-color: rgba(139, 0, 0, 0.03); }
          50%       { background-color: rgba(139, 0, 0, 0.10); }
        }
        @keyframes pulseRed {
          0%   { box-shadow: 0 0 0 0   rgba(220,53,69,0.7); }
          70%  { box-shadow: 0 0 0 7px rgba(220,53,69,0);   }
          100% { box-shadow: 0 0 0 0   rgba(220,53,69,0);   }
        }
        @keyframes pulseDarkRed {
          0%   { box-shadow: 0 0 0 0   rgba(139,0,0,0.7); }
          70%  { box-shadow: 0 0 0 7px rgba(139,0,0,0);   }
          100% { box-shadow: 0 0 0 0   rgba(139,0,0,0);   }
        }
        @keyframes pulseIndigo {
          0%   { box-shadow: 0 0 0 0   rgba(99,102,241,0.7); }
          70%  { box-shadow: 0 0 0 7px rgba(99,102,241,0);   }
          100% { box-shadow: 0 0 0 0   rgba(99,102,241,0);   }
        }
      `}</style>
    </div>
  );
};