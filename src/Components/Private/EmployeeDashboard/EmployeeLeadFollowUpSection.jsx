import { useMemo } from "react";

export const EmployeeLeadFollowUpSection = ({ leads = [] }) => {

  const { todayLeads, overdueLeads } = useMemo(() => {
    const today = [];
    const overdue = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); // ✅ FIXED: was now.getFullYear() instead of now.getMonth()

    leads.forEach((lead) => {
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

    return { todayLeads: today, overdueLeads: overdue };
  }, [leads]);

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

  if (todayLeads.length === 0 && overdueLeads.length === 0) return null;

  const todayDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="row p-lg-2 m-1 mt-2 g-3">

      {/* ========= Today Followup ========== */}
      {todayLeads.length > 0 && (
        <div className={`col-12 ${overdueLeads.length > 0 ? "col-lg-6" : "col-lg-12"}`}>
          <div style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1.5px solid rgba(220,53,69,0.20)",
            boxShadow: "0 4px 20px rgba(220,53,69,0.10), 0 1px 4px rgba(0,0,0,0.06)",
            overflow: "hidden",
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
                  {todayLeads.map((lead, idx) => {
                    const sb = statusBadge(lead.STATUS);
                    return (
                      <tr key={lead._id} style={{
                        animation: "blinkRed 1.4s infinite",
                        borderBottom: "1px solid rgba(220,53,69,0.06)",
                      }}>
                        <td className="text-center align-middle" style={{ border: "none", padding: "9px 10px", color: "#ccc", fontWeight: 700 }}>{idx + 1}</td>
                        <td className="align-middle" style={{ border: "none", padding: "9px 10px" }}>
                          <div className="d-flex align-items-center gap-2">
                            <span style={{
                              width: 7, height: 7, borderRadius: "50%",
                              background: "#dc3545", flexShrink: 0, display: "inline-block",
                              animation: "pulseRed 1.2s infinite",
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
                            fontWeight: 700, color: "#dc3545", fontSize: "0.76rem",
                            background: "rgba(220,53,69,0.07)", borderRadius: "6px",
                            padding: "3px 9px", border: "1px solid rgba(220,53,69,0.18)",
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
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ========= Overdue Followup ========== */}
      {overdueLeads.length > 0 && (
        <div className={`col-12 ${todayLeads.length > 0 ? "col-lg-6" : "col-lg-12"}`}>
          <div style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1.5px solid rgba(139,0,0,0.20)",
            boxShadow: "0 4px 20px rgba(139,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
            overflow: "hidden",
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
                  {overdueLeads.map((lead, idx) => {
                    const sb = statusBadge(lead.STATUS);
                    return (
                      <tr key={lead._id} style={{
                        animation: "blinkDarkRed 1.4s infinite",
                        borderBottom: "1px solid rgba(139,0,0,0.06)",
                      }}>
                        <td className="text-center align-middle" style={{ border: "none", padding: "9px 10px", color: "#ccc", fontWeight: 700 }}>{idx + 1}</td>
                        <td className="align-middle" style={{ border: "none", padding: "9px 10px" }}>
                          <div className="d-flex align-items-center gap-2">
                            <span style={{
                              width: 7, height: 7, borderRadius: "50%",
                              background: "#8b0000", flexShrink: 0, display: "inline-block",
                              animation: "pulseDarkRed 1.2s infinite",
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
                            fontWeight: 700, color: "#8b0000", fontSize: "0.76rem",
                            background: "rgba(139,0,0,0.07)", borderRadius: "6px",
                            padding: "3px 9px", border: "1px solid rgba(139,0,0,0.18)",
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
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

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
      `}</style>
    </div>
  );
};