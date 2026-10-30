import { useEffect, useMemo, useState } from "react";
import {
  getMySalesTarget,
  currentFinancialYear,
  fyLabel,
  formatINR,
  formatINRCompact,
} from "../../../hooks/useSalesTarget";
import "./SalesTargetSection.css";

const ACHIEVED = "#6d5dfc";
const MET = "#22b35e";
const TARGET = "#dcd8ff";

const pctColor = (p) => (p >= 100 ? MET : p >= 80 ? "#6d5dfc" : p >= 40 ? "#f59e0b" : "#ef4444");

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";

// ── one progress tile (this month / quarter / year) ──
const ProgressTile = ({ title, sub, target, achieved, percent, note, noteColor }) => {
  const p = Math.max(0, Number(percent) || 0);
  const c = pctColor(p);
  return (
    <div className="st-tile">
      <div className="st-tile-head">
        <div>
          <div className="st-tile-title">{title}</div>
          <div className="st-tile-sub">{sub}</div>
        </div>
        <span className="st-pct" style={{ color: c, background: `${c}14` }}>{p}%</span>
      </div>
      <div className="st-tile-amount">
        {formatINRCompact(achieved)}
        <span> / {formatINRCompact(target)}</span>
      </div>
      <div className="ed-progress full"><span style={{ width: `${Math.min(p, 100)}%`, background: c }} /></div>
      <div className="st-tile-note" style={{ color: noteColor || "#8a90a6" }}>{note}</div>
    </div>
  );
};

// ── simple bar chart: target vs achieved (no chart library needed) ──
const TargetBars = ({ items }) => {
  const max = Math.max(1, ...items.map((i) => Math.max(i.target, i.achieved)));
  return (
    <div className="st-bars" role="img" aria-label="Target versus achieved">
      {items.map((it) => {
        const th = (it.target / max) * 100;
        const ah = (it.achieved / max) * 100;
        const met = it.target > 0 && it.achieved >= it.target;
        return (
          <div className={`st-bar-col ${it.current ? "current" : ""}`} key={it.label}
            title={`${it.label}\nTarget: ${formatINR(it.target)}\nAchieved: ${formatINR(it.achieved)}\n${it.percent}%`}>
            <div className="st-bar-value">{it.achieved > 0 ? formatINRCompact(it.achieved) : ""}</div>
            <div className="st-bar-pair">
              <div className="st-bar" style={{ height: `${th}%`, background: TARGET }} />
              <div className="st-bar" style={{ height: `${ah}%`, background: met ? MET : ACHIEVED }} />
            </div>
            <div className="st-bar-label">{it.label}</div>
          </div>
        );
      })}
    </div>
  );
};

export const SalesTargetSection = () => {
  const [fy, setFy] = useState(currentFinancialYear());
  const [view, setView] = useState("monthly");
  const [data, setData] = useState(null);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPOs, setShowPOs] = useState(5);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const res = await getMySalesTarget(fy);
      if (!alive) return;
      if (res?.success) {
        setData(res.summary);
        setPos(res.purchaseOrders || []);
      } else {
        setData(null);
        setPos([]);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [fy]);

  const chartItems = useMemo(() => {
    if (!data) return [];
    if (view === "quarterly") {
      const curQ = data.currentQuarter?.index;
      return data.quarters.map((q) => ({
        label: `Q${q.index + 1}`,
        target: q.target,
        achieved: q.achieved,
        percent: q.percent,
        current: q.index === curQ,
      }));
    }
    if (view === "yearly") {
      return [{ label: data.financialYearLabel, target: data.yearly.target, achieved: data.yearly.achieved, percent: data.yearly.percent }];
    }
    return data.months.map((m) => ({
      label: m.label,
      target: m.target,
      achieved: m.achieved,
      percent: m.percent,
      current: m.status === "current",
    }));
  }, [data, view]);

  const thisFy = currentFinancialYear();

  const isEmpty = !data || (!data.hasTarget && pos.length === 0);

  return (
    <div className="ed-card ed-section st-card">
      <div className="ed-card-head">
        <div>
          <div className="ed-card-title">
            <i className="fa-solid fa-bullseye me-2" style={{ color: ACHIEVED }}></i>
            Sales target &amp; incentive
          </div>
          <div className="ed-card-sub">
            PO value (without GST) from projects you created · {data?.financialYearLabel || fyLabel(fy)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select className="form-select form-select-sm" style={{ width: "auto", borderRadius: 10 }}
            value={fy} onChange={(e) => setFy(Number(e.target.value))} aria-label="Financial year">
            {[thisFy - 1, thisFy, thisFy + 1].map((f) => (
              <option key={f} value={f}>{fyLabel(f)}</option>
            ))}
          </select>
          <div className="ed-seg" role="tablist" aria-label="Target period">
            {["monthly", "quarterly", "yearly"].map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v}
                className={view === v ? "active" : ""} onClick={() => setView(v)}>
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ed-card-body">
        {loading ? (
          <div className="ed-empty"><span className="ed-spinner"></span><div>Loading your target…</div></div>
        ) : !data ? (
          <div className="ed-empty"><i className="fa-solid fa-circle-exclamation"></i>Could not load target data.</div>
        ) : (
          <>
            {!data.hasTarget && (
              <div className="st-alert">
                <i className="fa-solid fa-circle-info"></i>
                HR has not set your target for {data.financialYearLabel} yet. Your PO achievement is still tracked below.
              </div>
            )}

            {/* ── Progress tiles ── */}
            <div className="st-tiles">
              <ProgressTile
                title="This month"
                sub={`${data.currentMonth.label} ${data.currentMonth.year}`}
                target={data.currentMonth.target}
                achieved={data.currentMonth.achieved}
                percent={data.currentMonth.percent}
                note={
                  data.currentMonth.incentiveEligible
                    ? `Incentive earned ${formatINR(data.currentMonth.incentive)}`
                    : data.currentMonth.target > 0
                      ? `${formatINR(Math.max(data.currentMonth.target - data.currentMonth.achieved, 0))} to go`
                      : "No target this month"
                }
                noteColor={data.currentMonth.incentiveEligible ? MET : undefined}
              />
              <ProgressTile
                title="This quarter"
                sub={data.currentQuarter.label}
                target={data.currentQuarter.target}
                achieved={data.currentQuarter.achieved}
                percent={data.currentQuarter.percent}
                note={
                  data.currentQuarter.incentiveEligible
                    ? `Incentive earned ${formatINR(data.currentQuarter.incentive)}`
                    : data.currentQuarter.target > 0
                      ? `Reach ${formatINR(data.currentQuarter.thresholdAmount)} (${data.incentiveRules.quarterlyThreshold}%) for incentive`
                      : "No target this quarter"
                }
                noteColor={data.currentQuarter.incentiveEligible ? MET : undefined}
              />
              <ProgressTile
                title="This year"
                sub={data.financialYearLabel}
                target={data.yearly.target}
                achieved={data.yearly.achieved}
                percent={data.yearly.percent}
                note={data.yearly.target > 0 ? `${formatINR(data.yearly.remaining)} remaining` : "No yearly target"}
              />
              <div className="st-tile st-tile-incentive">
                <div className="st-tile-title" style={{ color: "#fff" }}>Incentive earned</div>
                <div className="st-tile-sub" style={{ color: "rgba(255,255,255,.85)" }}>{data.financialYearLabel}</div>
                <div className="st-tile-amount" style={{ color: "#fff" }}>{formatINR(data.incentiveTotals.total)}</div>
                <div className="st-inc-split">
                  <span>Monthly {formatINRCompact(data.incentiveTotals.monthly)}</span>
                  <span>Quarterly {formatINRCompact(data.incentiveTotals.quarterly)}</span>
                  <span>Yearly {formatINRCompact(data.incentiveTotals.yearly)}</span>
                </div>
                {data.maxPossibleIncentive > 0 && (
                  <div className="st-tile-note" style={{ color: "rgba(255,255,255,.85)" }}>
                    Max possible {formatINR(data.maxPossibleIncentive)}
                  </div>
                )}
              </div>
            </div>

            {isEmpty ? (
              <div className="ed-empty" style={{ padding: "20px 16px" }}>
                <i className="fa-solid fa-inbox"></i>
                No target and no POs for {data?.financialYearLabel || fyLabel(fy)}.
              </div>
            ) : (
            <>
            {/* ── Chart ── */}
            <div className="st-chart-wrap">
              <div className="st-legend">
                <span><i style={{ background: TARGET }} />Target</span>
                <span><i style={{ background: ACHIEVED }} />Achieved</span>
                <span><i style={{ background: MET }} />Target met</span>
              </div>
              <TargetBars items={chartItems} />
            </div>

            {/* ── Period table ── */}
            <div className="st-table-wrap">
              <table className="st-table">
                <thead>
                  <tr>
                    <th>{view === "quarterly" ? "Quarter" : view === "yearly" ? "Year" : "Month"}</th>
                    <th className="r">Target</th>
                    <th className="r">PO achieved</th>
                    <th className="r">%</th>
                    <th className="r">Incentive</th>
                  </tr>
                </thead>
                <tbody>
                  {(view === "monthly" ? data.months : view === "quarterly" ? data.quarters : [{ ...data.yearly, label: data.financialYearLabel }]).map((r) => (
                    <tr key={r.label} className={r.status === "current" || (view === "quarterly" && r.index === data.currentQuarter.index) ? "cur" : ""}>
                      <td>{view === "monthly" ? `${r.label} ${r.year}` : r.label}</td>
                      <td className="r">{formatINR(r.target)}</td>
                      <td className="r">{formatINR(r.achieved)}</td>
                      <td className="r" style={{ color: pctColor(r.percent), fontWeight: 700 }}>{r.percent}%</td>
                      <td className="r" style={{ color: r.incentive > 0 ? MET : "#8a90a6", fontWeight: 600 }}>
                        {r.incentive > 0 ? formatINR(r.incentive) : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="st-rules">
              <i className="fa-solid fa-scale-balanced"></i>
              Rules: monthly {data.incentiveRules.monthlyPoRate}% when 100% of month's PO target
              {data.incentiveRules.monthlyRequireAdvance ? " (POs with advance)" : ""} ·
              quarterly {data.incentiveRules.quarterlyRate}% at {data.incentiveRules.quarterlyThreshold}% ·
              yearly {data.incentiveRules.yearlyRate}% at {data.incentiveRules.yearlyThreshold}% ·
              on {data.incentiveRules.basis === "achieved" ? "achieved PO amount" : "target amount"}
            </div>
            </>
            )}

            {/* ── My POs (shown only when this employee has POs in the selected FY) ── */}
            {pos.length > 0 && (
              <>
                <div className="st-po-head">
                  <div className="ed-card-title" style={{ fontSize: "0.92rem" }}>My POs · {data.financialYearLabel}</div>
                  <span className="ed-chip" style={{ color: "#5a48f0", background: "#f3f1ff", borderColor: "#dcd6ff" }}>
                    {pos.length} PO{pos.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="ed-list">
                  {pos.slice(0, showPOs).map((p, idx) => (
                    <div className="ed-row" key={p._id}>
                      <span className="ed-row-idx">{String(idx + 1).padStart(2, "0")}</span>
                      <div className="ed-row-main">
                        <div className="ed-row-title"><span>{p.customer}</span></div>
                        <div className="ed-row-sub">
                          <span><i className="fa-solid fa-box"></i>{p.category || p.product}</span>
                          <span><i className="fa-solid fa-hashtag"></i>{p.poNumber}</span>
                          <span><i className="fa-solid fa-calendar-days"></i>{fmtDate(p.poDate)}</span>
                        </div>
                        {/* ✅ NEW: shared PO → who else is on it */}
                        {p.sharePercent < 100 && (
                          <div className="ed-row-sub" style={{ marginTop: 2 }}>
                            <span style={{ color: "#5a48f0", fontWeight: 600 }}>
                              <i className="fa-solid fa-people-arrows"></i>
                              Full PO {formatINR(p.poValue)} · shared with{" "}
                              {(p.splitWith || []).map((w) => `${w.name || "colleague"} ${w.percent}%`).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ed-row-right">
                        {p.advancePay > 0 && (
                          <span className="ed-badge" style={{ background: "#e8f8ef", color: "#15803d" }}>
                            Advance {p.advancePay}%
                          </span>
                        )}
                        {p.sharePercent < 100 && (
                          <span className="ed-badge" style={{ background: "#f3f1ff", color: "#5a48f0" }}>
                            Your share {p.sharePercent}%
                          </span>
                        )}
                        <span className="ed-row-amount" title={p.sharePercent < 100 ? `Your ${p.sharePercent}% of ${formatINR(p.poValue)}` : undefined}>
                          {formatINR(p.creditedValue ?? p.poValue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {pos.length > showPOs && (
                  <button type="button" className="ed-btn-ghost" onClick={() => setShowPOs((n) => n + 10)}>
                    Show more ({pos.length - showPOs} remaining)
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesTargetSection;