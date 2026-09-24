import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CompanyInfEmployeeDashboardPieChartoPieChart } from "./EmployeeDashboardPieChart";

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const daysFromToday = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
};

const whenLabel = (days) => {
  if (days === 0) return { text: "Today", color: "#dc2626" };
  if (days === 1) return { text: "Tomorrow", color: "#f59e0b" };
  if (days <= 7) return { text: `In ${days} days`, color: "#f59e0b" };
  return { text: `In ${days} days`, color: "#22b35e" };
};

const softBadge = (status = "") => {
  const s = String(status).toLowerCase();
  if (s.includes("won")) return { background: "#e8f8ef", color: "#15803d" };
  if (s.includes("lost")) return { background: "#fdecec", color: "#dc2626" };
  if (s.includes("pending")) return { background: "#fff4e5", color: "#c2410c" };
  if (s.includes("ongoing")) return { background: "#eaf2ff", color: "#2563eb" };
  return { background: "#f1f3f7", color: "#475467" };
};

const progressColor = (lvl) => {
  if (lvl >= 70) return "#22b35e";
  if (lvl >= 40) return "#6d5dfc";
  if (lvl > 0) return "#f59e0b";
  return "#c9cde0";
};

export const EmployeeInsightsRow = ({
  isSales = false,
  leads = [],
  assignedTasks = [],
  inprocessTasks = [],
  totalProjectCount,
  completedProjectCount,
  inproccessProjectCount,
}) => {

  // ── Card 1: status donut ──
  const donutSegments = useMemo(() => {
    if (isSales) {
      const count = (st) => leads.filter((l) => l.STATUS === st).length;
      return [
        { label: "Won", value: count("Won"), color: "#22b35e" },
        { label: "Ongoing", value: count("Ongoing"), color: "#6d5dfc" },
        { label: "Pending", value: count("Pending"), color: "#f59e0b" },
        { label: "Lost", value: count("Lost"), color: "#ef4444" },
      ];
    }
    const total = Number(totalProjectCount) || 0;
    const done = Number(completedProjectCount) || 0;
    const running = Number(inproccessProjectCount) || 0;
    return [
      { label: "In progress", value: running, color: "#f59e0b" },
      { label: "Completed", value: done, color: "#22b35e" },
      { label: "Not started", value: Math.max(total - done - running, 0), color: "#8b7bff" },
    ];
  }, [isSales, leads, totalProjectCount, completedProjectCount, inproccessProjectCount]);

  // ── Card 2: upcoming deadlines (task end dates + lead follow-ups) ──
  const upcoming = useMemo(() => {
    const items = [];
    [...assignedTasks, ...inprocessTasks].forEach((t) => {
      if (!t.endDate || isNaN(new Date(t.endDate).getTime())) return;
      const days = daysFromToday(t.endDate);
      if (days < 0) return;
      items.push({
        id: `t-${t._id}`,
        title: t.taskName?.name || "Task",
        sub: "Task due",
        date: t.endDate,
        days,
        icon: "fa-list-check",
        tint: "#f1edff",
        color: "#6d5dfc",
      });
    });
    if (isSales) {
      leads.forEach((l) => {
        if (!l.nextFollowUpDate || l.STATUS === "Won" || l.STATUS === "Lost") return;
        if (isNaN(new Date(l.nextFollowUpDate).getTime())) return;
        const days = daysFromToday(l.nextFollowUpDate);
        if (days < 0) return;
        items.push({
          id: `l-${l._id}`,
          title: l.SENDER_COMPANY || "Lead",
          sub: `Follow-up with ${l.SENDER_NAME || "contact"}`,
          date: l.nextFollowUpDate,
          days,
          icon: "fa-phone",
          tint: "#eaf2ff",
          color: "#2563eb",
        });
      });
    }
    return items.sort((a, b) => a.days - b.days).slice(0, 4);
  }, [assignedTasks, inprocessTasks, leads, isSales]);

  // ── Card 3: task progress (non-sales) / recent enquiries (sales) ──
  const topTasks = useMemo(
    () =>
      [...inprocessTasks]
        .sort((a, b) => (Number(b.taskLevel) || 0) - (Number(a.taskLevel) || 0))
        .slice(0, 4),
    [inprocessTasks]
  );
  const recentLeads = useMemo(() => leads.slice(0, 4), [leads]);

  return (
    <div className="ed-grid-3 ed-section">

      {/* ── Status donut ── */}
      <div className="ed-card">
        <div className="ed-card-head">
          <div>
            <div className="ed-card-title">{isSales ? "Leads by status" : "Projects by status"}</div>
            <div className="ed-card-sub">Hover a slice to see its share</div>
          </div>
        </div>
        <div className="ed-card-body">
          <CompanyInfEmployeeDashboardPieChartoPieChart
            segments={donutSegments}
            centerLabel={isSales ? "Total leads" : "Total projects"}
          />
          {!isSales && (
            <Link
              to="/EmployeeTaskGrid"
              className="ed-btn-ghost"
              style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            >
              View all projects
            </Link>
          )}
        </div>
      </div>

      {/* ── Upcoming deadlines ── */}
      <div className="ed-card">
        <div className="ed-card-head">
          <div>
            <div className="ed-card-title">Upcoming deadlines</div>
            <div className="ed-card-sub">{isSales ? "Tasks and follow-ups due next" : "Tasks due next"}</div>
          </div>
        </div>
        <div className="ed-card-body">
          {upcoming.length === 0 ? (
            <div className="ed-empty">
              <i className="fa-solid fa-calendar-check"></i>
              No upcoming deadlines. You're all caught up.
            </div>
          ) : (
            upcoming.map((u) => {
              const w = whenLabel(u.days);
              return (
                <div className="ed-mini-item" key={u.id}>
                  <div className="ed-mini-icon" style={{ background: u.tint, color: u.color }}>
                    <i className={`fa-solid ${u.icon}`}></i>
                  </div>
                  <div className="ed-mini-main">
                    <div className="ed-mini-title">{u.title}</div>
                    <div className="ed-mini-sub">{u.sub}</div>
                  </div>
                  <div className="ed-mini-right">
                    <div className="ed-mini-date">{formatDate(u.date)}</div>
                    <div className="ed-mini-when" style={{ color: w.color }}>{w.text}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Task progress / Recent enquiries ── */}
      <div className="ed-card">
        <div className="ed-card-head">
          <div>
            <div className="ed-card-title">{isSales ? "Recent enquiries" : "Task progress"}</div>
            <div className="ed-card-sub">{isSales ? "Latest leads assigned to you" : "Your active tasks"}</div>
          </div>
        </div>
        <div className="ed-card-body">
          {isSales ? (
            recentLeads.length === 0 ? (
              <div className="ed-empty">
                <i className="fa-solid fa-user-plus"></i>
                No enquiries yet. New leads will show up here.
              </div>
            ) : (
              recentLeads.map((l) => {
                const initials = (l.SENDER_COMPANY || l.SENDER_NAME || "L")
                  .split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
                return (
                  <div className="ed-mini-item" key={l._id}>
                    <div className="ed-mini-icon" style={{ background: "#6d5dfc", color: "#fff", borderRadius: "50%", fontSize: "0.72rem", fontWeight: 700 }}>
                      {initials}
                    </div>
                    <div className="ed-mini-main">
                      <div className="ed-mini-title">{l.SENDER_COMPANY || "N/A"}</div>
                      <div className="ed-mini-sub">{l.QUERY_PRODUCT_NAME || l.SENDER_NAME || "N/A"}</div>
                    </div>
                    <span className="ed-badge" style={softBadge(l.STATUS)}>{l.STATUS || "N/A"}</span>
                  </div>
                );
              })
            )
          ) : topTasks.length === 0 ? (
            <div className="ed-empty">
              <i className="fa-solid fa-bars-progress"></i>
              No active tasks. Start an assigned task to track progress here.
            </div>
          ) : (
            topTasks.map((t) => {
              const lvl = Math.max(0, Math.min(100, Number(t.taskLevel) || 0));
              const pc = progressColor(lvl);
              return (
                <div className="ed-mini-item" key={t._id} style={{ display: "block" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div className="ed-mini-title">{t.taskName?.name || "N/A"}</div>
                    <span className="ed-pct" style={{ color: lvl > 0 ? pc : "#8a90a6" }}>{lvl}%</span>
                  </div>
                  <div className="ed-mini-sub">Due {formatDate(t.endDate)}</div>
                  <div className="ed-progress full"><span style={{ width: `${lvl}%`, background: pc }} /></div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};