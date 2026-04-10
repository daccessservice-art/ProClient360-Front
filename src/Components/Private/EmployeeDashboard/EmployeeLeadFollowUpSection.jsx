import { useMemo, useState, useEffect } from "react";
import axios from "axios";

export const EmployeeLeadFollowUpSection = ({ leads = [], assignedTasks = [], inprocessTasks = [] }) => {

  const [allLeads, setAllLeads] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [userDesignation, setUserDesignation] = useState("");

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUserDesignation(userData?.designation || "");
    } catch {
      setUserDesignation("");
    }
  }, []);

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
        if (response.data.success) setAllLeads(response.data.leads || []);
      } catch (err) {
        console.error("EmployeeLeadFollowUpSection fetch error:", err);
      }
    };
    fetchAll();
  }, []);

  const sourceLeads = allLeads.length > 0 ? allLeads : leads;

  const isSalesOrMarketing = useMemo(() => {
    const d = userDesignation?.toLowerCase() || "";
    const salesKeywords = ["sales", "marketing", "bde", "amc", "tender"];
    return salesKeywords.some(kw => d.includes(kw));
  }, [userDesignation]);

  const { todayLeads, overdueLeads, pendingLeads } = useMemo(() => {
    const today = [], overdue = [], pending = [];

    if (!isSalesOrMarketing) {
      return { todayLeads: today, overdueLeads: overdue, pendingLeads: pending };
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    sourceLeads.forEach((lead) => {
      if (lead.STATUS === "Pending") pending.push(lead);
      if (!lead.nextFollowUpDate) return;
      if (lead.STATUS === "Won" || lead.STATUS === "Lost") return;
      const followUp = new Date(lead.nextFollowUpDate);
      if (isNaN(followUp.getTime())) return;
      if (followUp >= startOfToday && followUp <= endOfToday) today.push(lead);
      else if (followUp < startOfToday) overdue.push(lead);
    });

    return { todayLeads: today, overdueLeads: overdue, pendingLeads: pending };
  }, [sourceLeads, isSalesOrMarketing]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const statusBadge = (status) => {
    const map = {
      Won:     { bg: "#198754", color: "#fff" },
      Ongoing: { bg: "#0d6efd", color: "#fff" },
      Pending: { bg: "#ffc107", color: "#333" },
      Lost:    { bg: "#dc3545", color: "#fff" },
    };
    return map[status] || { bg: "#6c757d", color: "#fff" };
  };

  const todayDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const allTabs = [
    { key: "today",    label: "Today Follow-up",  count: todayLeads.length,            color: "#0d6efd", pulse: "pulseBlue",   leadTab: true  },
    { key: "pending",  label: "Pending Enquiries", count: pendingLeads.length,           color: "#f97316", pulse: "pulseOrange", leadTab: true  },
    { key: "overdue",  label: "Overdue Follow-up", count: overdueLeads.length,           color: "#dc2626", pulse: "pulseRed",    leadTab: true  },
    { key: "assigned", label: "Assigned Tasks",    count: (assignedTasks || []).length,  color: "#8b5cf6", pulse: "pulsePurple", leadTab: false },
    { key: "active",   label: "Inprocess Tasks",   count: (inprocessTasks || []).length, color: "#16a34a", pulse: "pulseGreen",  leadTab: false },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.leadTab) return isSalesOrMarketing;
    return true;
  });

  useEffect(() => {
    if (!isSalesOrMarketing) {
      setActiveTab("assigned");
    } else {
      setActiveTab("today");
    }
  }, [isSalesOrMarketing]);

  const currentData = useMemo(() => {
    if (activeTab === "today")    return todayLeads;
    if (activeTab === "pending")  return pendingLeads;
    if (activeTab === "overdue")  return overdueLeads;
    if (activeTab === "assigned") return assignedTasks || [];
    if (activeTab === "active")   return inprocessTasks || [];
    return [];
  }, [activeTab, todayLeads, pendingLeads, overdueLeads, assignedTasks, inprocessTasks]);

  const isTaskTab = activeTab === "assigned" || activeTab === "active";
  const activeTabInfo = tabs.find(t => t.key === activeTab);

  const getRowAnimation = () => {
    if (activeTab === "overdue") return "blinkDarkRed 1.4s infinite";
    if (activeTab === "today")   return "blinkRed 1.4s infinite";
    return "none";
  };

  const getDotColor = () => {
    if (activeTab === "overdue") return "#8b0000";
    if (activeTab === "today")   return "#dc3545";
    return activeTabInfo?.color;
  };

  return (
    <div className="w-100" style={{ padding: "4px 0 0 0" }}>
      <div style={{
        background: "#fff",
        borderRadius: "16px",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        overflow: "hidden",
        width: "100%",
      }}>

        <div style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}>
          <h6 className="mb-0 fw-bold" style={{ color: "#1e293b", fontSize: "0.95rem" }}>
            Work Status Overview
          </h6>
          {activeTab === "today" && (
            <span style={{
              fontSize: "0.72rem", color: "#b91c1c",
              background: "rgba(220,53,69,0.07)",
              border: "1px solid rgba(220,53,69,0.18)",
              borderRadius: "8px", padding: "3px 10px", fontWeight: 600,
            }}>📅 {todayDate}</span>
          )}
          {activeTab === "overdue" && (
            <span style={{
              fontSize: "0.72rem", color: "#8b0000",
              background: "rgba(139,0,0,0.07)",
              border: "1px solid rgba(139,0,0,0.18)",
              borderRadius: "8px", padding: "3px 10px", fontWeight: 600,
            }}>⚠️ Action Required</span>
          )}
          {activeTab === "pending" && (
            <span style={{
              fontSize: "0.72rem", color: "#4338ca",
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.18)",
              borderRadius: "8px", padding: "3px 10px", fontWeight: 600,
            }}>🕐 Pending</span>
          )}
        </div>

        <div style={{ padding: "16px 20px 0", display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 16px",
                  borderRadius: "50px",
                  border: `1.5px solid ${isActive ? tab.color : "rgba(0,0,0,0.12)"}`,
                  background: isActive ? `${tab.color}12` : "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  color: isActive ? tab.color : "#64748b",
                  boxShadow: isActive ? `0 2px 12px ${tab.color}30` : "none",
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: tab.color, flexShrink: 0,
                  animation: `${tab.pulse} 1.4s infinite`,
                }} />
                {tab.label}
                <span style={{
                  minWidth: "22px", height: "22px", borderRadius: "50px",
                  background: tab.color, color: "#fff",
                  fontSize: "0.7rem", fontWeight: 700,
                  display: "inline-flex", alignItems: "center",
                  justifyContent: "center", padding: "0 6px",
                  boxShadow: `0 2px 6px ${tab.color}44`,
                }}>
                  {String(tab.count).padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: "16px 20px 20px", width: "100%" }}>
          <div
            className="table-responsive"
            style={{
              borderRadius: "10px",
              border: `1px solid ${activeTabInfo?.color}22`,
              maxHeight: "320px",
              overflowY: "auto",
              width: "100%",
            }}
          >
            <table
              className="table mb-0 w-100"
              style={{
                fontSize: "0.82rem",
                borderCollapse: "separate",
                borderSpacing: 0,
                tableLayout: "fixed",
                width: "100%",
              }}
            >
              <thead>
                <tr style={{
                  background: "#f8fafc",
                  borderBottom: `2px solid ${activeTabInfo?.color}30`,
                }}>
                  {(isTaskTab
                    ? [
                        { h: "SR NO.",     w: "7%"  },
                        { h: "TASK NAME",  w: "33%" },
                        { h: "START DATE", w: "18%" },
                        { h: "END DATE",   w: "18%" },
                        { h: "STATUS",     w: "14%" },
                        { h: "COMPLETION", w: "10%" },
                      ]
                    : [
                        { h: "SR NO.",       w: "7%"  },
                        { h: "COMPANY NAME", w: "28%" },
                        { h: "CONTACT",      w: "20%" },
                        { h: "PRODUCTS",     w: "25%" },
                        { h: activeTab === "overdue" ? "OVERDUE SINCE" : "FOLLOW-UP", w: "20%" },
                      ]
                  ).map((col, i) => (
                    <th
                      key={col.h}
                      className={i === 0 || i >= 4 ? "text-center" : ""}
                      style={{
                        backgroundColor: "#f8fafc",
                        color: "#64748b",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        border: "none",
                        borderBottom: `2px solid ${activeTabInfo?.color}30`,
                        padding: "11px 14px",
                        letterSpacing: "0.5px",
                        whiteSpace: "nowrap",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        width: col.w,
                      }}
                    >
                      {col.h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-5"
                      style={{ fontSize: "0.82rem", border: "none" }}>
                      No records found
                    </td>
                  </tr>
                ) : (
                  currentData.map((item, idx) =>
                    isTaskTab ? (
                      <tr
                        key={item._id}
                        style={{
                          borderBottom: "1px solid rgba(0,0,0,0.05)",
                          background: idx % 2 === 0 ? "#fff" : "#fafbfc",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${activeTabInfo?.color}08`}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafbfc"}
                      >
                        <td className="text-center align-middle" style={{ border: "none", padding: "10px 14px", color: "#94a3b8", fontWeight: 700 }}>
                          {String(idx + 1).padStart(2, "0")}.
                        </td>
                        <td className="align-middle" style={{ border: "none", padding: "10px 14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <div className="d-flex align-items-center gap-2">
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: activeTabInfo?.color, flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: "#1e293b" }}>{item.taskName?.name || "N/A"}</span>
                          </div>
                        </td>
                        <td className="align-middle" style={{ border: "none", padding: "10px 14px", color: "#555" }}>{formatDate(item.startDate)}</td>
                        <td className="align-middle" style={{ border: "none", padding: "10px 14px", color: "#555" }}>{formatDate(item.endDate)}</td>
                        <td className="text-center align-middle" style={{ border: "none", padding: "10px 14px" }}>
                          <span style={{
                            ...statusBadge(item.taskStatus),
                            borderRadius: "6px", padding: "3px 10px",
                            fontSize: "0.7rem", fontWeight: 600,
                          }}>
                            {item.taskStatus || "N/A"}
                          </span>
                        </td>
                        <td className="text-center align-middle" style={{ border: "none", padding: "10px 14px", fontWeight: 700, color: activeTabInfo?.color }}>
                          {item.taskLevel || 0}%
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={item._id}
                        style={{
                          borderBottom: "1px solid rgba(0,0,0,0.05)",
                          background: idx % 2 === 0 ? "#fff" : "#fafbfc",
                          transition: "background 0.15s",
                          animation: getRowAnimation(),
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${activeTabInfo?.color}08`}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafbfc"}
                      >
                        <td className="text-center align-middle" style={{ border: "none", padding: "10px 14px", color: "#94a3b8", fontWeight: 700 }}>
                          {String(idx + 1).padStart(2, "0")}.
                        </td>
                        <td className="align-middle" style={{ border: "none", padding: "10px 14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <div className="d-flex align-items-center gap-2">
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: getDotColor(), flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: "#1e293b" }}>{item.SENDER_COMPANY || "N/A"}</span>
                          </div>
                        </td>
                        <td className="align-middle" style={{ border: "none", padding: "10px 14px", color: "#555" }}>{item.SENDER_NAME || "N/A"}</td>
                        <td className="align-middle" style={{ border: "none", padding: "10px 14px", color: "#555" }}>{item.QUERY_PRODUCT_NAME || "N/A"}</td>
                        <td className="text-center align-middle" style={{ border: "none", padding: "10px 14px" }}>
                          <span style={{
                            fontWeight: 700,
                            color: getDotColor(),
                            fontSize: "0.76rem",
                            background: `${getDotColor()}15`,
                            borderRadius: "6px",
                            padding: "3px 9px",
                            border: `1px solid ${getDotColor()}30`,
                            display: "inline-block",
                          }}>
                            {formatDate(item.nextFollowUpDate)}
                          </span>
                        </td>
                      </tr>
                    )
                  )
                )}
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
        @keyframes pulseBlue   { 0%{box-shadow:0 0 0 0 rgba(13,110,253,0.7)}  70%{box-shadow:0 0 0 7px rgba(13,110,253,0)}   100%{box-shadow:0 0 0 0 rgba(13,110,253,0)}  }
        @keyframes pulseOrange { 0%{box-shadow:0 0 0 0 rgba(249,115,22,0.7)}  70%{box-shadow:0 0 0 7px rgba(249,115,22,0)}   100%{box-shadow:0 0 0 0 rgba(249,115,22,0)}  }
        @keyframes pulseRed    { 0%{box-shadow:0 0 0 0 rgba(220,38,38,0.7)}   70%{box-shadow:0 0 0 7px rgba(220,38,38,0)}    100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}   }
        @keyframes pulsePurple { 0%{box-shadow:0 0 0 0 rgba(139,92,246,0.7)}  70%{box-shadow:0 0 0 7px rgba(139,92,246,0)}   100%{box-shadow:0 0 0 0 rgba(139,92,246,0)}  }
        @keyframes pulseGreen  { 0%{box-shadow:0 0 0 0 rgba(22,163,74,0.7)}   70%{box-shadow:0 0 0 7px rgba(22,163,74,0)}    100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}   }
      `}</style>
    </div>
  );
};