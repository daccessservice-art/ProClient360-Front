export const AdminDashboardCards = ({ activateCompanys, inactiveSubscriptions, totalCompaines }) => {

    const total = Number(totalCompaines) || 0;
    const active = Number(activateCompanys) || 0;
    const inactive = Number(inactiveSubscriptions) || 0;
    const activeRate = total ? Math.round((active / total) * 100) : 0;
    const inactiveRate = total ? Math.round((inactive / total) * 100) : 0;

    const cards = [
        {
            label: "Registered companies",
            value: totalCompaines || 0,
            icon: "fa-building",
            accent: "#7c5cfc",
            tint: "#f3efff",
            foot: <>All companies on the platform</>,
        },
        {
            label: "Active companies",
            value: activateCompanys || 0,
            icon: "fa-circle-check",
            accent: "#22b35e",
            tint: "#ecf9f1",
            foot: <><b>{activeRate}%</b> of registered companies</>,
        },
        {
            label: "Deactivated companies",
            value: inactiveSubscriptions || 0,
            icon: "fa-circle-pause",
            accent: "#ef4444",
            tint: "#fdeeee",
            foot: <><b>{inactiveRate}%</b> of registered companies</>,
        },
        {
            label: "Activation rate",
            value: `${activeRate}%`,
            icon: "fa-chart-line",
            accent: "#3b82f6",
            tint: "#edf4ff",
            foot: <>Companies with an active subscription</>,
        },
    ];

    return (
        <div className="ed-kpi-grid ad-kpi-4">
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