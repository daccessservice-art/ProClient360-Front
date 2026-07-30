import { useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getPurchaseOrders, approvePurchaseOrder } from "../../../hooks/usePurchaseOrder";
// ── NEW: reuse the same View PO popup used in PurchaseOrderMasterGrid ──
// ⚠️ Adjust this relative path if this file lives somewhere other than
// Components/Private/EmployeeDashboard/ — it must resolve to
// Components/Private/CommonPopUp/ViewPurchaseOrderPopUp
import ViewPurchaseOrderPopUp from "../CommonPopUp/ViewPurchaseOrderPopUp";

export const EmployeeLeadFollowUpSection = ({ leads = [], assignedTasks = [], inprocessTasks = [] }) => {

  const [allLeads, setAllLeads] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [userDesignation, setUserDesignation] = useState("");
  const [userDepartment, setUserDepartment] = useState("");

  // ── PO approval state (Purchase and Store / CEO only) ──
  const [pendingPOs, setPendingPOs] = useState([]);
  const [poLoading, setPoLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const poPollRef = useRef(null);

  // ── NEW: View PO popup state ──
  const [viewPopUpShow, setViewPopUpShow] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUserDesignation(userData?.designation || "");
      setUserDepartment(userData?.department || "");
    } catch {
      setUserDesignation("");
      setUserDepartment("");
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
    return (
      d.includes("sales") ||
      d.includes("marketing") ||
      d.includes("amc") ||
      d.includes("bde") ||
      d.includes("bdm") ||
      d.includes("tender")
    );
  }, [userDesignation]);

  // ── is this the Purchase & Store CEO? ──
  const isPurchaseCEO = useMemo(() => {
    const dept = userDepartment?.toLowerCase() || "";
    const desig = userDesignation?.toLowerCase() || "";
    return dept.includes("purchase") && dept.includes("store") && desig === "ceo";
  }, [userDepartment, userDesignation]);

  // ── fetch pending POs for approval ──
  const fetchPendingPOs = async (silent = false) => {
    if (!silent) setPoLoading(true);
    try {
      const data = await getPurchaseOrders(1, 500, "");
      if (data?.success) {
        const pending = (data.purchaseOrders || []).filter(po => po.status === "Pending");
        setPendingPOs(pending);
      } else {
        setPendingPOs([]);
      }
    } catch (err) {
      console.error("Error fetching pending purchase orders:", err);
      if (!silent) setPendingPOs([]);
    } finally {
      if (!silent) setPoLoading(false);
    }
  };

  // ── initial fetch + background polling every 20s so the count/list
  // stays live when POs are created/approved elsewhere, without needing
  // a manual refresh or page reload. Polling is silent (no loading spinner
  // flicker) and only runs while this user is the Purchase & Store CEO. ──
  useEffect(() => {
    if (!isPurchaseCEO) return;

    fetchPendingPOs(false);

    poPollRef.current = setInterval(() => {
      fetchPendingPOs(true);
    }, 20000);

    return () => {
      if (poPollRef.current) clearInterval(poPollRef.current);
    };
  }, [isPurchaseCEO]);

  const handleApprovePO = async (poId) => {
    setApprovingId(poId);
    try {
      const data = await approvePurchaseOrder(poId);
      if (data?.success) {
        if (data.mailStatus === false) {
          toast.success("Purchase Order approved (but approval email could not be sent — check vendor email on file)");
        } else if (data.mailStatus === true) {
          toast.success("Purchase Order approved & email sent to vendor");
        } else {
          toast.success("Purchase Order approved successfully");
        }
        fetchPendingPOs(false);
      } else {
        toast.error(data?.error || "Failed to approve purchase order");
      }
    } finally {
      setApprovingId(null);
    }
  };

  // ── NEW: open the View PO popup for a given row ──
  const handleViewPO = (po) => {
    setSelectedPO(po);
    setViewPopUpShow(true);
  };

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

  const formatAmount = (val) => {
    if (!val || val <= 0) return "₹0";
    return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    { key: "active",   label: "Active Tasks",      count: (inprocessTasks || []).length, color: "#16a34a", pulse: "pulseGreen",  leadTab: false },
    { key: "poApproval", label: "PO Approval", count: pendingPOs.length, color: "#0891b2", pulse: "pulseBlue", leadTab: false, poTab: true },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.poTab) return isPurchaseCEO;
    if (tab.leadTab) return isSalesOrMarketing;
    return true;
  });

  useEffect(() => {
    if (isPurchaseCEO) setActiveTab("poApproval");
    else if (!isSalesOrMarketing) setActiveTab("assigned");
    else setActiveTab("today");
  }, [isSalesOrMarketing, isPurchaseCEO]);

  const currentData = useMemo(() => {
    if (activeTab === "today")      return todayLeads;
    if (activeTab === "pending")    return pendingLeads;
    if (activeTab === "overdue")    return overdueLeads;
    if (activeTab === "assigned")   return assignedTasks || [];
    if (activeTab === "active")     return inprocessTasks || [];
    if (activeTab === "poApproval") return pendingPOs;
    return [];
  }, [activeTab, todayLeads, pendingLeads, overdueLeads, assignedTasks, inprocessTasks, pendingPOs]);

  const isTaskTab = activeTab === "assigned" || activeTab === "active";
  const isPOTab = activeTab === "poApproval";
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

        {/* ── Header ── */}
        <div style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: "14px 20px",
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
          {activeTab === "poApproval" && (
            <span style={{
              fontSize: "0.72rem", color: "#0e7490",
              background: "rgba(8,145,178,0.07)",
              border: "1px solid rgba(8,145,178,0.18)",
              borderRadius: "8px", padding: "3px 10px", fontWeight: 600,
            }}>🧾 Awaiting Approval</span>
          )}
        </div>

        {/* ── Pill Tabs ── */}
        <div style={{
          padding: "14px 20px 12px",
          display: "flex",
          flexWrap: "nowrap",
          gap: "8px",
          width: "100%",
          boxSizing: "border-box",
        }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "7px 8px",
                  borderRadius: "50px",
                  border: `1.5px solid ${isActive ? tab.color : "rgba(0,0,0,0.12)"}`,
                  background: isActive ? `${tab.color}12` : "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  color: isActive ? tab.color : "#64748b",
                  boxShadow: isActive ? `0 2px 12px ${tab.color}30` : "none",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: tab.color, flexShrink: 0,
                  animation: `${tab.pulse} 1.4s infinite`,
                }} />
                {tab.label}
                <span style={{
                  minWidth: "20px", height: "20px", borderRadius: "50px",
                  background: tab.color, color: "#fff",
                  fontSize: "0.68rem", fontWeight: 700,
                  display: "inline-flex", alignItems: "center",
                  justifyContent: "center", padding: "0 5px",
                  boxShadow: `0 2px 6px ${tab.color}44`,
                  flexShrink: 0,
                }}>
                  {String(tab.count).padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Table ── */}
        <div style={{ padding: "0 20px 20px", width: "100%" }}>
          <div
            className="table-responsive"
            style={{
              borderRadius: "10px",
              border: `1px solid ${activeTabInfo?.color}22`,
              maxHeight: "320px",
              overflowY: "auto",
              overflowX: "auto",
              width: "100%",
            }}
          >
            <table
              className="table mb-0"
              style={{
                fontSize: "0.82rem",
                borderCollapse: "collapse",
                width: "100%",
                minWidth: isTaskTab ? "620px" : "680px",
              }}
            >
              <thead>
                <tr style={{
                  background: "#f8fafc",
                  borderBottom: `2px solid ${activeTabInfo?.color}30`,
                }}>
                  {(isPOTab
                    ? [
                        { h: "SR NO.",      w: "60px"  },
                        { h: "ORDER NO.",   w: "140px" },
                        { h: "VENDOR",      w: ""      },
                        { h: "ORDER DATE",  w: "110px" },
                        { h: "GRAND TOTAL", w: "130px" },
                        { h: "ACTION",      w: "140px" },
                      ]
                    : isTaskTab
                    ? [
                        { h: "SR NO.",     w: "60px"  },
                        { h: "TASK NAME",  w: ""      },
                        { h: "START DATE", w: "120px" },
                        { h: "END DATE",   w: "120px" },
                        { h: "STATUS",     w: "110px" },
                        { h: "COMPLETION", w: "90px"  },
                      ]
                    : [
                        { h: "SR NO.",       w: "60px"  },
                        { h: "COMPANY NAME", w: ""      },
                        { h: "CONTACT",      w: "150px" },
                        { h: "PRODUCTS",     w: "150px" },
                        { h: activeTab === "overdue" ? "OVERDUE SINCE" : "FOLLOW-UP", w: "120px" },
                        { h: "STATUS",       w: "90px"  },
                      ]
                  ).map((col, i) => (
                    <th
                      key={col.h}
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
                        width: col.w || undefined,
                        textAlign: i === 0 ? "center" : "left",
                      }}
                    >
                      {col.h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {isPOTab && poLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-5" style={{ fontSize: "0.82rem", border: "none" }}>
                      Loading pending purchase orders...
                    </td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-5"
                      style={{ fontSize: "0.82rem", border: "none" }}>
                      No records found
                    </td>
                  </tr>
                ) : isPOTab ? (
                  currentData.map((po, idx) => (
                    <tr
                      key={po._id}
                      style={{
                        borderBottom: "1px solid rgba(0,0,0,0.05)",
                        background: idx % 2 === 0 ? "#fff" : "#fafbfc",
                      }}
                    >
                      <td style={{ border: "none", padding: "10px 14px", color: "#94a3b8", fontWeight: 700, textAlign: "center" }}>
                        {String(idx + 1).padStart(2, "0")}.
                      </td>
                      <td style={{ border: "none", padding: "10px 14px", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                        {po.orderNumber || "N/A"}
                      </td>
                      <td style={{ border: "none", padding: "10px 14px", color: "#555" }}>
                        {po.vendor?.vendorName || "N/A"}
                      </td>
                      <td style={{ border: "none", padding: "10px 14px", color: "#555", whiteSpace: "nowrap" }}>
                        {formatDate(po.orderDate)}
                      </td>
                      <td style={{ border: "none", padding: "10px 14px", fontWeight: 700, color: "#15803d", whiteSpace: "nowrap" }}>
                        {formatAmount(po.grandTotal)}
                      </td>
                      <td style={{ border: "none", padding: "10px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                        {/* ── NEW: View (eye) button — opens ViewPurchaseOrderPopUp ── */}
                        <span
                          onClick={() => handleViewPO(po)}
                          title="View Purchase Order"
                          style={{ cursor: "pointer", marginRight: "10px" }}
                        >
                          <i className="fa-solid fa-eye text-primary"></i>
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          disabled={approvingId === po._id}
                          onClick={() => handleApprovePO(po._id)}
                          style={{ fontSize: "0.72rem", padding: "4px 12px" }}
                        >
                          {approvingId === po._id ? "Approving..." : "Approve"}
                        </button>
                      </td>
                    </tr>
                  ))
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
                        <td style={{ border: "none", padding: "10px 14px", color: "#94a3b8", fontWeight: 700, textAlign: "center" }}>
                          {String(idx + 1).padStart(2, "0")}.
                        </td>
                        <td style={{ border: "none", padding: "10px 14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: activeTabInfo?.color, flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: "#1e293b" }}>{item.taskName?.name || "N/A"}</span>
                          </div>
                        </td>
                        <td style={{ border: "none", padding: "10px 14px", color: "#555", whiteSpace: "nowrap" }}>{formatDate(item.startDate)}</td>
                        <td style={{ border: "none", padding: "10px 14px", color: "#555", whiteSpace: "nowrap" }}>{formatDate(item.endDate)}</td>
                        <td style={{ border: "none", padding: "10px 14px", textAlign: "center" }}>
                          <span style={{
                            ...statusBadge(item.taskStatus),
                            borderRadius: "6px", padding: "3px 10px",
                            fontSize: "0.7rem", fontWeight: 600,
                          }}>
                            {item.taskStatus || "N/A"}
                          </span>
                        </td>
                        <td style={{ border: "none", padding: "10px 14px", fontWeight: 700, color: activeTabInfo?.color, textAlign: "center" }}>
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
                        <td style={{ border: "none", padding: "10px 14px", color: "#94a3b8", fontWeight: 700, textAlign: "center" }}>
                          {String(idx + 1).padStart(2, "0")}.
                        </td>
                        <td style={{ border: "none", padding: "10px 14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: getDotColor(), flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: "#1e293b" }}>{item.SENDER_COMPANY || "N/A"}</span>
                          </div>
                        </td>
                        <td style={{ border: "none", padding: "10px 14px", color: "#555", whiteSpace: "nowrap" }}>{item.SENDER_NAME || "N/A"}</td>
                        <td style={{ border: "none", padding: "10px 14px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.QUERY_PRODUCT_NAME || "N/A"}</td>
                        <td style={{ border: "none", padding: "10px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
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
                        <td style={{ border: "none", padding: "10px 14px", textAlign: "center" }}>
                          <span style={{
                            ...statusBadge(item.STATUS),
                            borderRadius: "6px", padding: "3px 10px",
                            fontSize: "0.7rem", fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}>
                            {item.STATUS || "N/A"}
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

      {/* ── NEW: View Purchase Order popup ── */}
      {viewPopUpShow && (
        <ViewPurchaseOrderPopUp
          closePopUp={() => setViewPopUpShow(false)}
          selectedPO={selectedPO}
        />
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
        @keyframes pulseBlue   { 0%{box-shadow:0 0 0 0 rgba(13,110,253,0.7)}  70%{box-shadow:0 0 0 7px rgba(13,110,253,0)}   100%{box-shadow:0 0 0 0 rgba(13,110,253,0)}  }
        @keyframes pulseOrange { 0%{box-shadow:0 0 0 0 rgba(249,115,22,0.7)}  70%{box-shadow:0 0 0 7px rgba(249,115,22,0)}   100%{box-shadow:0 0 0 0 rgba(249,115,22,0)}  }
        @keyframes pulseRed    { 0%{box-shadow:0 0 0 0 rgba(220,38,38,0.7)}   70%{box-shadow:0 0 0 7px rgba(220,38,38,0)}    100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}   }
        @keyframes pulsePurple { 0%{box-shadow:0 0 0 0 rgba(139,92,246,0.7)}  70%{box-shadow:0 0 0 7px rgba(139,92,246,0)}   100%{box-shadow:0 0 0 0 rgba(139,92,246,0)}  }
        @keyframes pulseGreen  { 0%{box-shadow:0 0 0 0 rgba(22,163,74,0.7)}   70%{box-shadow:0 0 0 7px rgba(22,163,74,0)}    100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}   }
      `}</style>
    </div>
  );
};