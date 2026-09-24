import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { AdminDashboardCards } from "./AdminDashboardCards";
import { AdminInfoPieChart } from "./AdminInfoPieChart";
import { RegisteredCompaniesChart } from "./RegisteredCompaniesChart";
import { getAdminDashboard } from "../../../hooks/useAdmin";
import { UserContext } from "../../../context/UserContext";
// ⚠️ Reuses the employee dashboard styles – adjust the path if your folder names differ
import "../EmployeeDashboard/EmployeeDashboard.css";
import "./AdminDashboard.css";

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
};

function AdminMainDashboard() {
    const [isopen, setIsOpen] = useState(false);
    const { user } = useContext(UserContext);

    const [activateCompanys, setActivateCompanys] = useState("");
    const [companiesByMonth, setCompaniesByMonth] = useState([]);
    const [inactiveSubscriptions, setInactiveSubscriptions] = useState("");
    const [totalCompaines, setTotalCompaines] = useState("");
    const [companiesByYear, setCompaniesByYear] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAdminDashboard();
                if (data) {
                    setActivateCompanys(data.activeSubscriptions);
                    setCompaniesByMonth(data.companiesByMonth);
                    setInactiveSubscriptions(data.inactiveSubscriptions);
                    setTotalCompaines(data.totalCompaines);
                    setCompaniesByYear(data.companiesByYear);
                }
            } catch (error) {
                console.error("Error fetching customers:", error);
                setLoading(false);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggle = () => {
        setIsOpen(!isopen);
    };

    const firstName = (user?.name || "Admin").split(" ")[0];
    const todayLabel = new Date().toLocaleDateString("en-GB", {
        weekday: "short", day: "2-digit", month: "short", year: "numeric",
    });

    const quickActions = [
        {
            to: "/AdminCompanyMasterGrid",
            icon: "fa-building",
            color: "#6d5dfc",
            tint: "#f1edff",
            title: "Manage companies",
            sub: "Add companies and activate or deactivate their accounts",
        },
        {
            to: "/AdminmasterGrid",
            icon: "fa-user-tie",
            color: "#2563eb",
            tint: "#eaf2ff",
            title: "Manage admins",
            sub: "Add or edit admin users",
        },
        {
            to: "/ChangePassword",
            icon: "fa-key",
            color: "#c2410c",
            tint: "#fff4e5",
            title: "Change password",
            sub: "Update your admin login password",
        },
    ];

    return (
        <>
            {loading && (
                <div className="overlay">
                    <span className="loader"></span>
                </div>
            )}

            <div className="container-scroller">
                <div className="row background_main_all ed-page">
                    <AdminHeader toggle={toggle} isopen={isopen} />
                    <div className="container-fluid page-body-wrapper">
                        <AdminSidebar isopen={isopen} active="AdminMainDashboard" />
                        <div className="main-panel" style={{ width: isopen ? "" : "calc(100%  - 120px )", marginLeft: isopen ? "" : "125px" }}>
                            <div className="content-wrapper ps-3 ps-md-0 ed-wrap">

                                {/* ── Page heading ── */}
                                <div className="ed-pagehead">
                                    <div>
                                        <div className="ed-title">Dashboard</div>
                                        <div className="ed-welcome">
                                            {getGreeting()}, {firstName}! Here's how your companies are doing today.
                                        </div>
                                    </div>
                                    <div className="ed-head-actions">
                                        <span className="ed-date-chip">
                                            <i className="fa-solid fa-calendar-days"></i>
                                            {todayLabel}
                                        </span>
                                        <Link to="/AdminCompanyMasterGrid" className="ed-btn-primary">
                                            <i className="fa-solid fa-building"></i>
                                            Manage companies
                                        </Link>
                                    </div>
                                </div>

                                {/* ── KPI cards ── */}
                                <AdminDashboardCards
                                    activateCompanys={activateCompanys}
                                    inactiveSubscriptions={inactiveSubscriptions}
                                    totalCompaines={totalCompaines}
                                />

                                {/* ── Subscription donut + quick actions ── */}
                                <div className="ed-grid-2 ed-section">
                                    <div className="ed-card">
                                        <div className="ed-card-head">
                                            <div>
                                                <div className="ed-card-title">Subscription status</div>
                                                <div className="ed-card-sub">Active vs deactivated companies</div>
                                            </div>
                                        </div>
                                        <div className="ed-card-body">
                                            <AdminInfoPieChart
                                                activateCompanys={activateCompanys}
                                                inactiveSubscriptions={inactiveSubscriptions}
                                                totalCompaines={totalCompaines}
                                            />
                                        </div>
                                    </div>

                                    <div className="ed-card">
                                        <div className="ed-card-head">
                                            <div>
                                                <div className="ed-card-title">Quick actions</div>
                                                <div className="ed-card-sub">Jump to common admin tasks</div>
                                            </div>
                                        </div>
                                        <div className="ed-card-body">
                                            <div className="ad-links">
                                                {quickActions.map((a) => (
                                                    <Link key={a.to} to={a.to} className="ad-link">
                                                        <span className="ad-link-icon" style={{ background: a.tint, color: a.color }}>
                                                            <i className={`fa-solid ${a.icon}`}></i>
                                                        </span>
                                                        <span style={{ minWidth: 0 }}>
                                                            <span className="ad-link-title">{a.title}</span>
                                                            <span className="ad-link-sub">{a.sub}</span>
                                                        </span>
                                                        <i className="fa-solid fa-chevron-right ad-link-arrow"></i>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Registrations chart (existing component) ── */}
                                <div className="ed-section">
                                    <RegisteredCompaniesChart
                                        companiesByMonth={companiesByMonth}
                                        companiesByYear={companiesByYear}
                                    />
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default AdminMainDashboard;