import { useState } from "react";

/**
 * Lightweight SVG donut chart (no extra library needed).
 *
 * Usage 1 (new, generic):
 *   <CompanyInfEmployeeDashboardPieChartoPieChart
 *      segments={[{ label: "Completed", value: 1, color: "#22b35e" }, ...]}
 *      centerLabel="Total" />
 *
 * Usage 2 (old props still work):
 *   <CompanyInfEmployeeDashboardPieChartoPieChart
 *      completedProjectCount={1} inproccessProjectCount={10} />
 */
export const CompanyInfEmployeeDashboardPieChartoPieChart = ({
  segments,
  centerLabel = "Total",
  completedProjectCount,
  inproccessProjectCount,
}) => {
  const [hovered, setHovered] = useState(null);

  const data = (segments && segments.length
    ? segments
    : [
        { label: "Finished", value: Number(completedProjectCount) || 0, color: "#22b35e" },
        { label: "In progress", value: Number(inproccessProjectCount) || 0, color: "#f59e0b" },
      ]
  ).map((s) => ({ ...s, value: Number(s.value) || 0 }));

  const total = data.reduce((sum, s) => sum + s.value, 0);

  const size = 170;
  const stroke = 24;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const GAP = total > 0 && data.filter((s) => s.value > 0).length > 1 ? 3 : 0;

  let offset = 0;
  const arcs = data.map((s, i) => {
    const full = total > 0 ? (s.value / total) * C : 0;
    const len = Math.max(full - GAP, 0);
    const arc = { ...s, i, len, offset };
    offset += full;
    return arc;
  });

  const active = hovered !== null ? data[hovered] : null;
  const pct = (v) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return (
    <div className="ed-donut-wrap">
      <div className="ed-donut">
        <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" role="img"
          aria-label={data.map((s) => `${s.label}: ${s.value}`).join(", ")}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f1f6" strokeWidth={stroke} />
          {total > 0 && arcs.map((a) =>
            a.len > 0 ? (
              <circle
                key={a.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={hovered === a.i ? stroke + 6 : stroke}
                strokeDasharray={`${a.len} ${C - a.len}`}
                strokeDashoffset={-a.offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ opacity: hovered === null || hovered === a.i ? 1 : 0.35, cursor: "pointer" }}
                onMouseEnter={() => setHovered(a.i)}
                onMouseLeave={() => setHovered(null)}
              />
            ) : null
          )}
        </svg>
        <div className="ed-donut-center">
          <strong>{active ? active.value : total}</strong>
          <small>{active ? `${active.label} (${pct(active.value)}%)` : centerLabel}</small>
        </div>
      </div>

      <div className="ed-legend">
        {data.map((s, i) => (
          <div
            key={s.label}
            className={`ed-legend-item ${hovered === i ? "active" : ""}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="sw" style={{ background: s.color }} />
            <span className="nm">{s.label}</span>
            <span className="vl">{s.value}</span>
            <span style={{ color: "#8a90a6", fontSize: "0.74rem", minWidth: 36, textAlign: "right" }}>
              {pct(s.value)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompanyInfEmployeeDashboardPieChartoPieChart;