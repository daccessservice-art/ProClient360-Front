import { Link } from "react-router-dom";
import { useContext, useMemo } from "react";
import { UserContext } from "../../../../context/UserContext";
import "./Sidebar.css";

export const Sidebar = ({ isopen, active }) => {
    const { user } = useContext(UserContext);

    const perms = user?.permissions || [];
    const has = (p) => perms.includes(p);
    const isCompany = user?.user === "company";
    const isEmployee = user?.user === "employee";

    // ── logged-in user info for the bottom profile card ──
    const profile = useMemo(() => {
        try {
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            const name = u?.name || u?.companyName || (isCompany ? "Company Admin" : "Welcome");
            const role = u?.designation || (isCompany ? "Administrator" : "Employee");
            const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
            return { name, role, initials: initials || "U" };
        } catch {
            return { name: "Welcome", role: "", initials: "U" };
        }
    }, [isCompany]);

    // ── menu config: same permissions & routes as before, grouped into sections ──
    const sections = [
        {
            title: "",
            items: [
                { show: isCompany, to: "/MainDashboard", key: "dashboard", label: "Dashboard", icon: "fa-solid fa-house" },
                { show: isEmployee, to: "/EmployeeMainDashboard", key: "dashboard", label: "Dashboard", icon: "fa-solid fa-house" },
                { show: isEmployee, to: "/EmployeeTaskGrid", key: "EmployeeTaskGrid", label: "My Projects", icon: "fa-solid fa-bars-progress" },
                { show: isEmployee && has("viewService"), to: "/EmployeeMyServiceMasterGrid", key: "EmployeeMyServiceMasterGrid", label: "My Service", icon: "fa-solid fa-envelope" },
                { show: has("surveyEngineer"), to: "/SurveyEngineerDashboard", key: "SurveyEngineerDashboard", label: "Survey Dashboard", icon: "fa-solid fa-clipboard-list" },
            ],
        },
        {
            title: "Sales & CRM",
            items: [
                { show: (has("viewLead") || isCompany) && !has("viewMarketingDashboard"), to: "/SalesMasterGrid", key: "SalesMasterGrid", label: "Sales Master", icon: "fa-solid fa-chart-pie" },
                { show: has("viewMarketingDashboard") || isCompany, to: "/MarketingMasterGrid", key: "MarketingMasterGrid", label: "Marketing", icon: "fa-solid fa-chart-simple" },
                { show: (has("viewLead") && has("viewSalesManagerMaster")) || isCompany, to: "/SalesManagerMasterGrid", key: "SalesManagerMasterGrid", label: "Sales Manager Dashboard", icon: "fa-solid fa-users-gear" },
                { show: isCompany || has("viewSalesManagerMaster"), to: "/OldSalesHistory", key: "OldSalesHistory", label: "Old Sales History", icon: "fa-solid fa-clock-rotate-left" },
                { show: has("viewCustomer") || isCompany, to: "/CustomerMasterGrid", key: "CustomerMasterGrid", label: "Customer Master", icon: "fa-solid fa-people-line" },
                { show: has("viewCampaign") || isCompany, to: "/CampaignMasterGrid", key: "CampaignMasterGrid", label: "WhatsApp Campaigns", icon: "fa-brands fa-whatsapp" },
                { show: has("viewExhibition") || isCompany, to: "/ExhibitionMasterGrid", key: "ExhibitionMasterGrid", label: "Exhibition Master", icon: "fa-solid fa-building-columns" },
                { show: has("viewExhibitionVisit") || isCompany, to: "/ExhibitionVisitMasterGrid", key: "ExhibitionVisitMasterGrid", label: "Exhibition Visit", icon: "fa-solid fa-person-walking" },
            ],
        },
        {
            title: "Service",
            items: [
                { show: has("viewService") || isCompany, to: "/TicketMasterGrid", key: "TicketMasterGrid", label: "Ticket Master", icon: "fa-solid fa-ticket" },
                { show: has("viewService") || isCompany, to: "/ServiceMasterGrid", key: "ServiceMasterGrid", label: "Service Master", icon: "fa-solid fa-address-card" },
                { show: has("viewAMC") || isCompany, to: "/AMCMasterGrid", key: "AMCMasterGrid", label: "AMC", icon: "fa-solid fa-arrow-up-right-dots" },
                { show: has("viewOldAMCHistory") || isCompany, to: "/OldAMCHistoryGrid", key: "OldAMCHistoryGrid", label: "Old AMC History", icon: "fa-solid fa-clock-rotate-left" },
                { show: has("viewFeedback"), to: "/EmployeeFeedbackMasterGrid", key: "EmployeeFeedbackMasterGrid", label: "Feedback", icon: "fa-solid fa-comments" },
            ],
        },
        {
            title: "Purchase & Inventory",
            items: [
                { show: has("viewInventory") || isCompany, to: "/InventoryMasterGrid", key: "InventoryMasterGrid", label: "Inventory Master", icon: "fa-solid fa-boxes-stacked" },
                { show: has("viewVendor") || isCompany, to: "/VendorMasterGrid", key: "VendorMasterGrid", label: "Vendor Master", icon: "fa-solid fa-truck" },
                { show: has("viewProduct") || isCompany, to: "/ProductMasterGrid", key: "ProductMasterGrid", label: "Product Master", icon: "fa-solid fa-box" },
                { show: has("viewPurchaseOrder") || isCompany, to: "/PurchaseOrderMasterGrid", key: "PurchaseOrderMasterGrid", label: "Purchase Order Master", icon: "fa-solid fa-file-invoice" },
                { show: has("viewGRN") || isCompany, to: "/GRNMasterGrid", key: "GRNMasterGrid", label: "GRN Master", icon: "fa-solid fa-clipboard-check" },
                { show: has("viewQC") || isCompany, to: "/QCMasterGrid", key: "QCMasterGrid", label: "Quality Inspection", icon: "fa-solid fa-ranking-star" },
                { show: has("viewDC") || isCompany, to: "/DCMasterGrid", key: "DCMasterGrid", label: "Delivery Challan", icon: "fa-solid fa-truck-fast" },
                { show: has("viewMRF") || isCompany, to: "/MRFMasterGrid", key: "MRFMasterGrid", label: "MRF Master", icon: "fa-solid fa-file-lines" },
                { show: has("viewProjectPurchase") || isCompany, to: "/ProjectPurchaseMasterGrid", key: "ProjectPurchaseMasterGrid", label: "Project Purchase", icon: "fa-solid fa-cart-flatbed" },
            ],
        },
        {
            title: "Accounts",
            items: [
                { show: has("viewAccountMaster") || isCompany, to: "/AccountMasterGrid", key: "AccountMasterGrid", label: "Account Master", icon: "fa-solid fa-indian-rupee-sign" },
                { show: has("viewAccountMaster") || isCompany, to: "/AccountFollowUpMasterGrid", key: "AccountFollowUpMasterGrid", label: "Account Follow-Up", icon: "fa-solid fa-phone-volume" },
            ],
        },
        {
            title: "Reports",
            items: [
                { show: has("viewActivityLog") || isCompany, to: "/ActivityLogReport", key: "ActivityLogReport", label: "Activity Logs", icon: "fa-solid fa-history" },
                { show: has("viewAnnualReport") || isCompany, to: "/AnnualReport", key: "AnnualReport", label: "Annual Report", icon: "fa-solid fa-chart-bar" },
            ],
        },
        {
            title: "Organisation",
            items: [
                { show: has("viewEmployee") || isCompany, to: "/EmployeeMasterGrid", key: "EmployeeMasterGrid", label: "Employee Master", icon: "fa-solid fa-user-group" },
                { show: true, to: "/ProjectMasterGrid", key: "ProjectMasterGrid", label: "Project Master", icon: "fa-solid fa-list-check" },
                { show: has("viewDepartment") || isCompany, to: "/DepartmentMasterGrid", key: "DepartmentMasterGrid", label: "Department Master", icon: "fa-solid fa-sitemap" },
                { show: has("viewDesignation") || isCompany, to: "/DesignationMasterGird", key: "DesignationMasterGird", label: "Designation Master", icon: "fa-solid fa-diamond" },
                { show: has("viewTask") || isCompany, to: "/TaskMasterGrid", key: "TaskMasterGrid", label: "Task Master", icon: "fa-solid fa-bars-progress" },
            ],
        },
    ];

    return (
        <div
            className={`left-slidebar sb-shell ${isopen ? "sidebar-block sb-open" : "sidebar-none sb-collapsed"}`}
            style={{ width: isopen ? "210px" : "97px" }}
        >
            {/* ── Logo ── */}
            <div className="sb-brand">
                <img
                    src={user?.logo || "/static/assets/img/nav/DACCESS.png"}
                    alt="Company logo"
                />
            </div>

            {/* ── Menu ── */}
            <nav id="sidebar" className="sb-nav" aria-label="Main menu">
                {sections.map((sec, sIdx) => {
                    const items = sec.items.filter((i) => i.show);
                    if (!items.length) return null;
                    return (
                        <div className="sb-section" key={sec.title || `main-${sIdx}`}>
                            {sec.title && (isopen
                                ? <div className="sb-section-label">{sec.title}</div>
                                : <div className="sb-divider" />
                            )}
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
                    );
                })}
            </nav>

            {/* ── Logged-in user ── */}
            <div className="sb-footer">
                <div className="sb-user" title={`${profile.name}${profile.role ? " – " + profile.role : ""}`}>
                    <div className="sb-avatar">{profile.initials}</div>
                    {isopen && (
                        <div style={{ minWidth: 0 }}>
                            <div className="sb-user-name">{profile.name}</div>
                            <div className="sb-user-role">{profile.role}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};