import { useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getPurchaseOrders, approvePurchaseOrder } from "../../../hooks/usePurchaseOrder";
// ── reuse the same View PO popup used in PurchaseOrderMasterGrid ──
// ⚠️ Adjust this relative path if this file lives somewhere other than
// Components/Private/EmployeeDashboard/ — it must resolve to
// Components/Private/CommonPopUp/ViewPurchaseOrderPopUp
import ViewPurchaseOrderPopUp from "../CommonPopUp/ViewPurchaseOrderPopUp";
// ── Old AMC History expiry alerts (AMC Executive / Vice President / Service Manager only) ──
import { getOldAMCHistory } from "../../../hooks/useOldAMCHistory";

// ── how many days before an AMC contract's End Date the blinker should start showing ──
const ALERT_WINDOW_DAYS = 50;

// ── designations allowed to see the AMC Expiry Alerts tab (case-insensitive) ──
const AMC_ALERT_DESIGNATIONS = ["amc executive", "amc executives", "vice president", "service manager"];

// ── soft coloured badge for any status text ──
const softBadge = (status = "") => {
  const s = String(status).toLowerCase();
  if (s.includes("won") || s.includes("complete") || s.includes("finish")) return { background: "#e8f8ef", color: "#15803d" };
  if (s.includes("lost") || s.includes("reject")) return { background: "#fdecec", color: "#dc2626" };
  if (s.includes("pending")) return { background: "#fff4e5", color: "#c2410c" };
  if (s.includes("ongoing") || s.includes("process") || s.includes("progress")) return { background: "#eaf2ff", color: "#2563eb" };
  if (s.includes("assign")) return { background: "#f1edff", color: "#6d28d9" };
  return { background: "#f1f3f7", color: "#475467" };
};

const progressColor = (lvl) => {
  if (lvl >= 70) return "#22b35e";
  if (lvl >= 40) return "#6d5dfc";
  if (lvl > 0) return "#f59e0b";
  return "#c9cde0";
};

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

  // ── View PO popup state ──
  const [viewPopUpShow, setViewPopUpShow] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  // ── AMC expiry alert state ──
  const [amcAlerts, setAmcAlerts] = useState([]);
  const [amcLoading, setAmcLoading] = useState(false);
  const amcPollRef = useRef(null);

  // ── "Show More" pagination — 10 rows at a time on every tab ──
  const SHOW_MORE_STEP = 10;
  const [visibleCount, setVisibleCount] = useState(SHOW_MORE_STEP);

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

  // ── is this user allowed to see AMC expiry alerts? ──
  const isAMCAlertRole = useMemo(() => {
    const d = (userDesignation || "").toLowerCase().trim();
    if (!d) return false;
    return AMC_ALERT_DESIGNATIONS.some((allowed) => d.includes(allowed));
  }, [userDesignation]);

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

  // ── initial fetch + silent 20s polling (Purchase & Store CEO only) ──
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

  // ── fetch AMC records whose End Date is expired or within ALERT_WINDOW_DAYS ──
  const fetchAMCAlerts = async (silent = false) => {
    if (!silent) setAmcLoading(true);
    try {
      const data = await getOldAMCHistory(1, 9999, "", "", "", "", "");
      if (data?.success) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const windowEnd = new Date(today);
        windowEnd.setDate(windowEnd.getDate() + ALERT_WINDOW_DAYS);

        const alerts = (data.records || [])
          .filter((r) => {
            if (!r.endDate) return false;
            const end = new Date(r.endDate);
            if (isNaN(end.getTime())) return false;
            end.setHours(0, 0, 0, 0);
            return end <= windowEnd;
          })
          .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

        setAmcAlerts(alerts);
      } else {
        setAmcAlerts([]);
      }
    } catch (err) {
      console.error("Error fetching AMC expiry alerts:", err);
      if (!silent) setAmcAlerts([]);
    } finally {
      if (!silent) setAmcLoading(false);
    }
  };

  // ── initial fetch + 20s poll, only for allowed designations ──
  useEffect(() => {
    if (!isAMCAlertRole) return;

    fetchAMCAlerts(false);

    amcPollRef.current = setInterval(() => {
      fetchAMCAlerts(true);
    }, 20000);

    return () => {
      if (amcPollRef.current) clearInterval(amcPollRef.current);
    };
  }, [isAMCAlertRole]);

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

  // ── open the View PO popup for a given row ──
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

  // ── expired vs expiring-soon status + days-left label for AMC alerts ──
  const getAMCStatus = (endDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    const diffDays = Math.round((end - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { label: `Expired ${Math.abs(diffDays)}d ago`, expired: true };
    }
    if (diffDays === 0) {
      return { label: "Expires Today", expired: true };
    }
    return { label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`, expired: false };
  };

  const todayDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const allTabs = [
    { key: "today",    label: "Today follow-up",  count: todayLeads.length,            color: "#0d6efd", pulse: "pulseBlue",   leadTab: true  },
    { key: "pending",  label: "Pending enquiries", count: pendingLeads.length,           color: "#f97316", pulse: "pulseOrange", leadTab: true  },
    { key: "overdue",  label: "Overdue follow-up", count: overdueLeads.length,           color: "#dc2626", pulse: "pulseRed",    leadTab: true  },
    { key: "assigned", label: "Assigned tasks",    count: (assignedTasks || []).length,  color: "#7c5cfc", pulse: "pulsePurple", leadTab: false },
    { key: "active",   label: "Active tasks",      count: (inprocessTasks || []).length, color: "#16a34a", pulse: "pulseGreen",  leadTab: false },
    { key: "poApproval", label: "PO approval", count: pendingPOs.length, color: "#0891b2", pulse: "pulseBlue", leadTab: false, poTab: true },
    { key: "amcExpiry", label: "AMC expiry alerts", count: amcAlerts.length, color: "#dc2626", pulse: "pulseRed", leadTab: false, amcTab: true },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.poTab) return isPurchaseCEO;
    if (tab.amcTab) return isAMCAlertRole;
    if (tab.leadTab) return isSalesOrMarketing;
    return true;
  });

  useEffect(() => {
    if (isPurchaseCEO) setActiveTab("poApproval");
    else if (isAMCAlertRole) setActiveTab("amcExpiry");
    else if (!isSalesOrMarketing) setActiveTab("assigned");
    else setActiveTab("today");
  }, [isSalesOrMarketing, isPurchaseCEO, isAMCAlertRole]);

  const currentData = useMemo(() => {
    if (activeTab === "today")      return todayLeads;
    if (activeTab === "pending")    return pendingLeads;
    if (activeTab === "overdue")    return overdueLeads;
    if (activeTab === "assigned")   return assignedTasks || [];
    if (activeTab === "active")     return inprocessTasks || [];
    if (activeTab === "poApproval") return pendingPOs;
    if (activeTab === "amcExpiry")  return amcAlerts;
    return [];
  }, [activeTab, todayLeads, pendingLeads, overdueLeads, assignedTasks, inprocessTasks, pendingPOs, amcAlerts]);

  const isTaskTab = activeTab === "assigned" || activeTab === "active";
  const isPOTab = activeTab === "poApproval";
  const isAMCTab = activeTab === "amcExpiry";
  const activeTabInfo = tabs.find(t => t.key === activeTab);

  // ── reset "Show More" back to 10 whenever the active tab changes ──
  useEffect(() => {
    setVisibleCount(SHOW_MORE_STEP);
  }, [activeTab]);

  const displayedData = currentData.slice(0, visibleCount);
  const hasMore = currentData.length > visibleCount;

  const getRowAnimation = () => {
    if (activeTab === "overdue") return "blinkDarkRed 1.4s infinite";
    if (activeTab === "today")   return "blinkRed 1.4s infinite";
    return "none";
  };

  const getDotColor = () => {
    if (activeTab === "overdue") return "#8b0000";
    if (activeTab === "today")   return "#dc3545";
    return activeTabInfo?.color || "#6d5dfc";
  };

  // ── small context chip in the card header ──
  const headerChip = () => {
    const chip = (text, color, bg, border) => (
      <span className="ed-chip" style={{ color, background: bg, borderColor: border }}>{text}</span>
    );
    if (activeTab === "today")      return chip(<><i className="fa-solid fa-calendar-day"></i> {todayDate}</>, "#b91c1c", "#fdf0f0", "#f6cfd3");
    if (activeTab === "overdue")    return chip(<><i className="fa-solid fa-triangle-exclamation"></i> Action required</>, "#8b0000", "#fbeeee", "#efc9c9");
    if (activeTab === "pending")    return chip(<><i className="fa-solid fa-clock"></i> Pending</>, "#c2410c", "#fff4e8", "#fbd9b5");
    if (activeTab === "poApproval") return chip(<><i className="fa-solid fa-file-invoice"></i> Awaiting approval</>, "#0e7490", "#ecf8fb", "#bfe5ee");
    if (activeTab === "amcExpiry")  return chip(<><i className="fa-solid fa-bell"></i> Expiring within {ALERT_WINDOW_DAYS} days</>, "#b91c1c", "#fdf0f0", "#f6cfd3");
    if (activeTab === "assigned")   return chip(<><i className="fa-solid fa-clipboard-list"></i> Not started</>, "#6d28d9", "#f3efff", "#ddd3ff");
    if (activeTab === "active")     return chip(<><i className="fa-solid fa-bolt"></i> In progress</>, "#15803d", "#effaf3", "#c9eed8");
    return null;
  };

  const idxBox = (idx) => (
    <span className="ed-row-idx">{String(idx + 1).padStart(2, "0")}</span>
  );

  const renderRows = () => {
    if (isPOTab && poLoading) {
      return <div className="ed-empty"><span className="ed-spinner"></span><div>Loading pending purchase orders…</div></div>;
    }
    if (isAMCTab && amcLoading) {
      return <div className="ed-empty"><span className="ed-spinner"></span><div>Loading AMC expiry alerts…</div></div>;
    }
    if (currentData.length === 0) {
      return (
        <div className="ed-empty">
          <i className="fa-solid fa-inbox"></i>
          Nothing here right now. New items will appear automatically.
        </div>
      );
    }

    // ── AMC expiry rows ──
    if (isAMCTab) {
      return displayedData.map((r, idx) => {
        const status = getAMCStatus(r.endDate);
        const c = status.expired ? "#8b0000" : "#dc2626";
        return (
          <div
            key={r._id}
            className="ed-row"
            style={{ animation: status.expired ? "blinkDarkRed 1.4s infinite" : "blinkRed 1.4s infinite" }}
          >
            {idxBox(idx)}
            <div className="ed-row-main">
              <div className="ed-row-title"><span>{r.custName || "N/A"}</span></div>
              <div className="ed-row-sub">
                <span><i className="fa-solid fa-location-dot"></i>{r.zone || "N/A"}</span>
                <span><i className="fa-solid fa-user"></i>{r.ownedBy || "N/A"}</span>
              </div>
            </div>
            <div className="ed-row-right">
              <span className="ed-date-pill" style={{ color: c, background: `${c}10`, borderColor: `${c}33` }}>
                <i className="fa-solid fa-calendar-xmark"></i>{formatDate(r.endDate)}
              </span>
              <span className="ed-badge" style={{ background: c, color: "#fff" }}>{status.label}</span>
            </div>
          </div>
        );
      });
    }

    // ── PO approval rows ──
    if (isPOTab) {
      return displayedData.map((po, idx) => (
        <div key={po._id} className="ed-row">
          {idxBox(idx)}
          <div className="ed-row-main">
            <div className="ed-row-title"><span>{po.orderNumber || "N/A"}</span></div>
            <div className="ed-row-sub">
              <span><i className="fa-solid fa-truck"></i>{po.vendor?.vendorName || "N/A"}</span>
              <span><i className="fa-solid fa-calendar-days"></i>{formatDate(po.orderDate)}</span>
            </div>
          </div>
          <div className="ed-row-right">
            <span className="ed-row-amount">{formatAmount(po.grandTotal)}</span>
            <button
              type="button"
              className="ed-icon-btn"
              onClick={() => handleViewPO(po)}
              title="View purchase order"
              aria-label="View purchase order"
            >
              <i className="fa-solid fa-eye"></i>
            </button>
            <button
              type="button"
              className="ed-approve-btn"
              disabled={approvingId === po._id}
              onClick={() => handleApprovePO(po._id)}
            >
              {approvingId === po._id ? "Approving…" : "Approve"}
            </button>
          </div>
        </div>
      ));
    }

    // ── Task rows ──
    if (isTaskTab) {
      return displayedData.map((item, idx) => {
        const lvl = Math.max(0, Math.min(100, Number(item.taskLevel) || 0));
        const status = item.taskStatus || (activeTab === "assigned" ? "Assigned" : "In progress");
        const pc = progressColor(lvl);
        return (
          <div key={item._id} className="ed-row">
            {idxBox(idx)}
            <div className="ed-row-main">
              <div className="ed-row-title">
                <span className="ed-tab-dot" style={{ background: activeTabInfo?.color }} />
                <span>{item.taskName?.name || "N/A"}</span>
              </div>
              <div className="ed-row-sub">
                <span><i className="fa-solid fa-play"></i>{formatDate(item.startDate)}</span>
                <span><i className="fa-solid fa-flag-checkered"></i>{formatDate(item.endDate)}</span>
              </div>
            </div>
            <div className="ed-row-right">
              <span className="ed-badge" style={softBadge(status)}>{status}</span>
              <div className="ed-progress-wrap">
                <div className="ed-progress"><span style={{ width: `${lvl}%`, background: pc }} /></div>
                <span className="ed-pct" style={{ color: lvl > 0 ? pc : "#8a90a6" }}>{lvl}%</span>
              </div>
            </div>
          </div>
        );
      });
    }

    // ── Lead rows (today / pending / overdue) ──
    const dc = getDotColor();
    return displayedData.map((item, idx) => (
      <div key={item._id} className="ed-row" style={{ animation: getRowAnimation() }}>
        {idxBox(idx)}
        <div className="ed-row-main">
          <div className="ed-row-title">
            <span className="ed-tab-dot" style={{ background: dc }} />
            <span>{item.SENDER_COMPANY || "N/A"}</span>
          </div>
          <div className="ed-row-sub">
            <span><i className="fa-solid fa-user"></i>{item.SENDER_NAME || "N/A"}</span>
            <span><i className="fa-solid fa-box"></i>{item.QUERY_PRODUCT_NAME || "N/A"}</span>
          </div>
        </div>
        <div className="ed-row-right">
          <span
            className="ed-date-pill"
            style={{ color: dc, background: `${dc}12`, borderColor: `${dc}33` }}
            title={activeTab === "overdue" ? "Overdue since" : "Next follow-up"}
          >
            <i className="fa-solid fa-calendar-days"></i>{formatDate(item.nextFollowUpDate)}
          </span>
          <span className="ed-badge" style={softBadge(item.STATUS)}>{item.STATUS || "N/A"}</span>
        </div>
      </div>
    ));
  };

  return (
    <div className="ed-card">
      <div className="ed-card-head">
        <div>
          <div className="ed-card-title">Work status overview</div>
          <div className="ed-card-sub">Your tasks and follow-ups in one place</div>
        </div>
        {headerChip()}
      </div>

      {/* ── Pill tabs ── */}
      <div className="ed-tabs" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className="ed-tab"
              onClick={() => setActiveTab(tab.key)}
              style={isActive ? {
                borderColor: tab.color,
                color: tab.color,
                background: `${tab.color}12`,
                boxShadow: `0 4px 12px -4px ${tab.color}55`,
              } : undefined}
            >
              <span
                className="ed-tab-dot"
                style={{ background: tab.color, animation: `${tab.pulse} 1.4s infinite` }}
              />
              {tab.label}
              <span className="ed-tab-count" style={{ background: tab.color }}>
                {String(tab.count).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      <div className="ed-card-body">
        <div className="ed-list" style={{ borderColor: `${activeTabInfo?.color || "#eceef5"}22` }}>
          {renderRows()}
        </div>

        {/* ── Show More — 10 more rows at a time ── */}
        {hasMore && (
          <button
            type="button"
            className="ed-btn-ghost"
            onClick={() => setVisibleCount((c) => c + SHOW_MORE_STEP)}
          >
            Show more ({currentData.length - visibleCount} remaining)
          </button>
        )}
      </div>

      {/* ── View Purchase Order popup ── */}
      {viewPopUpShow && (
        <ViewPurchaseOrderPopUp
          closePopUp={() => setViewPopUpShow(false)}
          selectedPO={selectedPO}
        />
      )}

      <style>{`
        @keyframes blinkRed {
          0%, 100% { background-color: rgba(255, 50, 50, 0.02); }
          50%       { background-color: rgba(255, 130, 130, 0.12); }
        }
        @keyframes blinkDarkRed {
          0%, 100% { background-color: rgba(139, 0, 0, 0.02); }
          50%       { background-color: rgba(139, 0, 0, 0.10); }
        }
        @keyframes pulseBlue   { 0%{box-shadow:0 0 0 0 rgba(13,110,253,0.7)}  70%{box-shadow:0 0 0 7px rgba(13,110,253,0)}   100%{box-shadow:0 0 0 0 rgba(13,110,253,0)}  }
        @keyframes pulseOrange { 0%{box-shadow:0 0 0 0 rgba(249,115,22,0.7)}  70%{box-shadow:0 0 0 7px rgba(249,115,22,0)}   100%{box-shadow:0 0 0 0 rgba(249,115,22,0)}  }
        @keyframes pulseRed    { 0%{box-shadow:0 0 0 0 rgba(220,38,38,0.7)}   70%{box-shadow:0 0 0 7px rgba(220,38,38,0)}    100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}   }
        @keyframes pulsePurple { 0%{box-shadow:0 0 0 0 rgba(124,92,252,0.7)}  70%{box-shadow:0 0 0 7px rgba(124,92,252,0)}   100%{box-shadow:0 0 0 0 rgba(124,92,252,0)}  }
        @keyframes pulseGreen  { 0%{box-shadow:0 0 0 0 rgba(22,163,74,0.7)}   70%{box-shadow:0 0 0 7px rgba(22,163,74,0)}    100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}   }
      `}</style>
    </div>
  );
};