import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Sidebar } from "../MainDashboard/Sidebar/Sidebar";
import { EmployeeDasboardCards } from "./EmployeeDasboardCards";
import { EmployeeSalesOverviewCards } from "./EmployeeSalesOverviewCards";
import { PerFormanceChart } from "./PerFormanceChart";
import { getEmployeeDashboard } from "../../../hooks/useEmployees";
import { getCustomerCountByOwner } from "../../../hooks/useCustomer";
import { Header } from "../MainDashboard/Header/Header";
import { EmployeeLeadFollowUpSection } from "./EmployeeLeadFollowUpSection";
import { EmployeeInsightsRow } from "./EmployeeInsightsRow";
import "./EmployeeDashboard.css";

const MY_LEADS_URL = `${process.env.REACT_APP_API_URL}/api/leads/my-leads`;

const isSalesDesignation = (designation = "") => {
    const d = designation.toLowerCase();
    return (
        d.includes("sales") ||
        d.includes("marketing") ||
        d.includes("amc") ||
        d.includes("bde") ||
        d.includes("bdm") ||
        d.includes("tender")
    );
};

const formatAmountCompact = (amount) => {
    if (!amount || amount <= 0) return "₹0";
    if (amount >= 10000000) return `₹.${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹.${(amount / 100000).toFixed(1)} L`;
    if (amount >= 1000) return `₹.${(amount / 1000).toFixed(0)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
};

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
};

function EmployeeMainDashboard() {
    const [isopen, setIsOpen] = useState(false);
    const [totalProjectCount, setTotalProjectCount] = useState();
    const [completedProjectCount, setCompletedProjectCount] = useState();
    const [inproccessProjectCount, setInproccessProjectCount] = useState();

    const [assignedTasks, setAssignedTasks] = useState([]);
    const [inprocessTasks, setInproccessTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [allMyLeads, setAllMyLeads] = useState([]);
    const [leadsLoading, setLeadsLoading] = useState(true);

    const [totalCustomers, setTotalCustomers] = useState(0);
    const [activeQuotationFunnel, setActiveQuotationFunnel] = useState("₹0");
    const [wonLeads, setWonLeads] = useState(0);
    const [lostLeads, setLostLeads] = useState(0);
    const [salesDataLoading, setSalesDataLoading] = useState(false);
    const [targetAmount, setTargetAmount] = useState(0);

    // ── user info (read once) for greeting + role-based layout ──
    const userData = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    }, []);
    const isSales = isSalesDesignation(userData?.designation || "");
    const firstName = (userData?.name || "there").split(" ")[0];

    useEffect(() => {
        const fetchAllLeads = async () => {
            setLeadsLoading(true);
            try {
                const response = await axios.get(MY_LEADS_URL, {
                    params: { page: 1, limit: 99999 },
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                if (response.data.success) {
                    setAllMyLeads(response.data.leads || []);
                }
            } catch (err) {
                console.error("Error fetching all leads for dashboard:", err);
            } finally {
                setLeadsLoading(false);
            }
        };
        fetchAllLeads();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getEmployeeDashboard();
                if (data) {
                    setTotalProjectCount(data.totalProjects);
                    setCompletedProjectCount(data.completedCount);
                    setInproccessProjectCount(data.inprocessCount);
                    setAssignedTasks(data.assignedTasks);
                    setInproccessTasks(data.inprocessTasks);
                    setTargetAmount(data.target || 0);
                }
            } catch (error) {
                console.error("Error fetching dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchSalesOverviewData = async () => {
            try {
                const userData = JSON.parse(localStorage.getItem("user") || "{}");

                if (!isSalesDesignation(userData?.designation)) return;

                setSalesDataLoading(true);

                const employeeName = userData?.name;
                if (employeeName) {
                    const custRes = await getCustomerCountByOwner(employeeName);
                    if (custRes?.success && custRes?.pagination) {
                        setTotalCustomers(custRes.pagination.totalCustomers || 0);
                    }
                }

                const leadsRes = await axios.get(MY_LEADS_URL, {
                    params: { page: 1, limit: 1 },
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });

                if (leadsRes.data?.success) {
                    const counts = leadsRes.data.leadCounts || {};
                    const funnel = leadsRes.data.quotationFunnel || {};

                    setWonLeads(counts.winCount || 0);
                    setLostLeads(counts.lostCount || 0);
                    setActiveQuotationFunnel(formatAmountCompact(funnel.totalActiveQuotationAmount || 0));
                }
            } catch (error) {
                console.error("Error fetching sales overview data:", error);
            } finally {
                setSalesDataLoading(false);
            }
        };
        fetchSalesOverviewData();
    }, []);

    const toggle = () => setIsOpen(!isopen);

    // ── derived numbers for the summary banner ──
    const safeAssigned = assignedTasks || [];
    const safeInprocess = inprocessTasks || [];
    const totalTasks = safeAssigned.length + safeInprocess.length;
    const avgProgress = safeInprocess.length
        ? Math.round(safeInprocess.reduce((s, t) => s + (Number(t.taskLevel) || 0), 0) / safeInprocess.length)
        : 0;
    const completionRate = totalProjectCount
        ? Math.round(((completedProjectCount || 0) / totalProjectCount) * 100)
        : 0;
    const winRate = wonLeads + lostLeads > 0 ? Math.round((wonLeads / (wonLeads + lostLeads)) * 100) : 0;

    const bannerStats = isSales
        ? [
            { icon: "fa-users", value: totalCustomers, label: "Total customers" },
            { icon: "fa-bullseye", value: allMyLeads.length, label: "Total leads" },
            { icon: "fa-trophy", value: wonLeads, label: "Won leads" },
            { icon: "fa-indian-rupee-sign", value: formatAmountCompact(targetAmount), label: "Target" },
        ]
        : [
            { icon: "fa-folder-open", value: totalProjectCount ?? 0, label: "Total projects" },
            { icon: "fa-list-check", value: totalTasks, label: "Total tasks" },
            { icon: "fa-chart-line", value: `${avgProgress}%`, label: "Avg. task progress" },
            { icon: "fa-circle-check", value: completedProjectCount ?? 0, label: "Completed" },
        ];

    const bannerTitle = isSales
        ? `Your win rate is ${winRate}%`
        : `You've completed ${completionRate}% of your projects`;
    const bannerSub = isSales
        ? "Keep your follow-ups on time to convert more leads."
        : "Update task progress regularly so your team stays in sync.";

    const todayLabel = new Date().toLocaleDateString("en-GB", {
        weekday: "short", day: "2-digit", month: "short", year: "numeric",
    });

    return (
        <>
            {(loading || leadsLoading || salesDataLoading) && (
                <div className="overlay">
                    <span className="loader"></span>
                </div>
            )}

            <div className="container-scroller">
                <div className="row background_main_all ed-page">
                    <Header toggle={toggle} isopen={isopen} />
                    <div className="container-fluid page-body-wrapper">
                        <Sidebar isopen={isopen} active="dashboard" />
                        <div className="main-panel" style={{ width: isopen ? "" : "calc(100%  - 120px)", marginLeft: isopen ? "" : "125px" }}>
                            <div className="content-wrapper ps-3 ps-md-0 ed-wrap">

                                {/* ── Page heading ── */}
                                <div className="ed-pagehead">
                                    <div>
                                        <div className="ed-title">Dashboard</div>
                                        <div className="ed-welcome">
                                            {getGreeting()}, {firstName}! Here's what's happening with your work today.
                                        </div>
                                    </div>
                                    <div className="ed-head-actions">
                                        <span className="ed-date-chip">
                                            <i className="fa-solid fa-calendar-days"></i>
                                            {todayLabel}
                                        </span>
                                        <Link to="/EmployeeTaskGrid" className="ed-btn-primary">
                                            <i className="fa-solid fa-bars-progress"></i>
                                            My projects
                                        </Link>
                                    </div>
                                </div>

                                {/* ── KPI cards (non-sales) ── */}
                                <EmployeeDasboardCards
                                    totalProjectCount={totalProjectCount}
                                    completedProjectCount={completedProjectCount}
                                    inproccessProjectCount={inproccessProjectCount}
                                    assignedTaskCount={safeAssigned.length}
                                    activeTaskCount={safeInprocess.length}
                                />

                                {/* ── KPI cards (sales) ── */}
                                <EmployeeSalesOverviewCards
                                    targetAmount={formatAmountCompact(targetAmount)}
                                    totalCustomers={totalCustomers}
                                    activeQuotationFunnel={activeQuotationFunnel}
                                    wonLeads={wonLeads}
                                    lostLeads={lostLeads}
                                />

                                {/* ── Performance + Work status ── */}
                                <div className="ed-grid-2 ed-section">
                                    <PerFormanceChart />
                                    <EmployeeLeadFollowUpSection
                                        leads={allMyLeads}
                                        assignedTasks={assignedTasks}
                                        inprocessTasks={inprocessTasks}
                                    />
                                </div>

                                {/* ── Status donut / deadlines / progress ── */}
                                <EmployeeInsightsRow
                                    isSales={isSales}
                                    leads={allMyLeads}
                                    assignedTasks={safeAssigned}
                                    inprocessTasks={safeInprocess}
                                    totalProjectCount={totalProjectCount}
                                    completedProjectCount={completedProjectCount}
                                    inproccessProjectCount={inproccessProjectCount}
                                />

                                {/* ── Summary banner ── */}
                                <div className="ed-banner ed-section">
                                    {bannerStats.map((s) => (
                                        <div className="ed-banner-stat" key={s.label}>
                                            <div className="ed-banner-icon">
                                                <i className={`fa-solid ${s.icon}`}></i>
                                            </div>
                                            <div>
                                                <div className="ed-banner-value">{s.value}</div>
                                                <div className="ed-banner-label">{s.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="ed-banner-msg">
                                        <div>
                                            <div className="ed-banner-msg-title">{bannerTitle}</div>
                                            <div className="ed-banner-msg-sub">{bannerSub}</div>
                                        </div>
                                        <i className="fa-solid fa-rocket ed-banner-rocket"></i>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default EmployeeMainDashboard;