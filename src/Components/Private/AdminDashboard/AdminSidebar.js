import { useContext } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../../../context/UserContext";
// ⚠️ Reuses the main sidebar styles – adjust the path if your folder names differ
import "../MainDashboard/Sidebar/Sidebar.css";

export const AdminSidebar = ({ isopen, active }) => {
    const { user } = useContext(UserContext);

    const name = user?.name || "Admin";
    const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "A";

    const items = [
        { to: "/AdminMainDashboard", key: "AdminMainDashboard", label: "Dashboard", icon: "fa-solid fa-house" },
        { to: "/AdminCompanyMasterGrid", key: "AdminCompanyMasterGrid", label: "Company", icon: "fa-solid fa-building" },
        { to: "/AdminmasterGrid", key: "AdminmasterGrid", label: "Admin", icon: "fa-solid fa-user-tie" },
    ];

    return (
        <div
            className={`left-slidebar sb-shell ${isopen ? "sidebar-block sb-open" : "sidebar-none sb-collapsed"}`}
            style={{ width: isopen ? "210px" : "97px" }}
        >
            {/* ── Logo ── */}
            <div className="sb-brand">
                <img src="static/assets/img/nav/DACCESS.png" alt="Logo" />
            </div>

            {/* ── Menu ── */}
            <nav id="sidebar" className="sb-nav" aria-label="Admin menu">
                <div className="sb-section">
                    <ul className="sb-list">
                        {items.map((item) => {
                            const isActive = active === item.key;
                            return (
                                <li key={item.to} title={item.label}>
                                    <Link
                                        to={item.to}
                                        className={`sb-link ${isActive ? "active" : ""}`}
                                        aria-current={isActive ? "page" : undefined}
                                    >
                                        <span className="sb-icon">
                                            <i className={item.icon}></i>
                                        </span>
                                        {isopen && <span className="sb-label">{item.label}</span>}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>

            {/* ── Logged-in admin ── */}
            <div className="sb-footer">
                <div className="sb-user" title={`${name} – Super admin`}>
                    <div className="sb-avatar">{initials}</div>
                    {isopen && (
                        <div style={{ minWidth: 0 }}>
                            <div className="sb-user-name">{name}</div>
                            <div className="sb-user-role">Super admin</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};