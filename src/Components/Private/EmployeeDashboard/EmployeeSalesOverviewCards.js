import { useEffect, useState } from "react";

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

export const EmployeeSalesOverviewCards = ({
    targetAmount = 0,
    totalCustomers = 0,
    activeQuotationFunnel = "₹0",
    wonLeads = 0,
    lostLeads = 0,
}) => {
    const [isSalesEmployee, setIsSalesEmployee] = useState(false);

    useEffect(() => {
        try {
            const userData = JSON.parse(localStorage.getItem("user") || "{}");
            setIsSalesEmployee(isSalesDesignation(userData?.designation));
        } catch {
            setIsSalesEmployee(false);
        }
    }, []);

    if (!isSalesEmployee) return null;

    const closed = (Number(wonLeads) || 0) + (Number(lostLeads) || 0);
    const winRate = closed ? Math.round((wonLeads / closed) * 100) : 0;
    const lossRate = closed ? 100 - winRate : 0;

    const cards = [
        {
            label: "Target",
            value: targetAmount,
            icon: "fa-bullseye",
            accent: "#7c5cfc",
            tint: "#f3efff",
            foot: <>Your assigned sales target</>,
        },
        {
            label: "Total customers",
            value: totalCustomers,
            icon: "fa-users",
            accent: "#3b82f6",
            tint: "#edf4ff",
            foot: <>Customers owned by you</>,
        },
        {
            label: "Active quotation funnel",
            value: activeQuotationFunnel,
            icon: "fa-filter-circle-dollar",
            accent: "#f59e0b",
            tint: "#fff5e8",
            foot: <>Value of open quotations</>,
        },
        {
            label: "Won leads",
            value: wonLeads,
            icon: "fa-trophy",
            accent: "#22b35e",
            tint: "#ecf9f1",
            foot: <><b>{winRate}%</b> win rate</>,
        },
        {
            label: "Lost leads",
            value: lostLeads,
            icon: "fa-circle-xmark",
            accent: "#ef4444",
            tint: "#fdeeee",
            foot: <><b>{lossRate}%</b> of closed leads</>,
        },
    ];

    return (
        <div className="ed-kpi-grid">
            {cards.map((c) => (
                <div
                    key={c.label}
                    className="ed-kpi"
                    style={{ "--accent": c.accent, "--tint": c.tint }}
                >
                    <div className="ed-kpi-top">
                        <div style={{ minWidth: 0 }}>
                            <div className="ed-kpi-label">{c.label}</div>
                            <div className="ed-kpi-value">{c.value}</div>
                        </div>
                        <div className="ed-kpi-icon">
                            <i className={`fa-solid ${c.icon}`}></i>
                        </div>
                    </div>
                    <div className="ed-kpi-foot">{c.foot}</div>
                </div>
            ))}
        </div>
    );
};