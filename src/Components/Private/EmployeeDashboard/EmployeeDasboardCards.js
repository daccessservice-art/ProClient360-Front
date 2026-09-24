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

export const EmployeeDasboardCards = ({
    totalProjectCount,
    completedProjectCount,
    inproccessProjectCount,
    assignedTaskCount = 0,
    activeTaskCount = 0,
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

    // ── HIDE for Sales, Marketing, AMC, BDE, Sr.BDE, Tender ──
    if (isSalesEmployee) return null;

    const total = Number(totalProjectCount) || 0;
    const completed = Number(completedProjectCount) || 0;
    const inprocess = Number(inproccessProjectCount) || 0;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    const inprocessShare = total ? Math.round((inprocess / total) * 100) : 0;

    const cards = [
        {
            label: "Total projects",
            value: totalProjectCount ?? 0,
            icon: "fa-folder-open",
            accent: "#7c5cfc",
            tint: "#f3efff",
            foot: <>All projects assigned to you</>,
        },
        {
            label: "Completed projects",
            value: completedProjectCount ?? 0,
            icon: "fa-circle-check",
            accent: "#22b35e",
            tint: "#ecf9f1",
            foot: <><b>{completionRate}%</b> completion rate</>,
        },
        {
            label: "In progress",
            value: inproccessProjectCount ?? 0,
            icon: "fa-hourglass-half",
            accent: "#f59e0b",
            tint: "#fff5e8",
            foot: <><b>{inprocessShare}%</b> of your projects</>,
        },
        {
            label: "Assigned tasks",
            value: assignedTaskCount,
            icon: "fa-clipboard-list",
            accent: "#3b82f6",
            tint: "#edf4ff",
            foot: <>Waiting to be started</>,
        },
        {
            label: "Active tasks",
            value: activeTaskCount,
            icon: "fa-bolt",
            accent: "#8b5cf6",
            tint: "#f5efff",
            foot: <>Currently being worked on</>,
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