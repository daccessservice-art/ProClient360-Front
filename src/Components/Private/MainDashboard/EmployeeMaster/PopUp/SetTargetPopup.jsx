import { Fragment, useEffect, useMemo, useState } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import {
  getEmployeeSalesTarget,
  saveEmployeeSalesTarget,
  getEmployeeDropdown,
  currentFinancialYear,
  fyLabel,
  FY_MONTHS,
  formatINR,
} from "../../../../../hooks/useSalesTarget";
// ✅ NEW: month-wise incentive calculation (same rules as backend)
import { buildIncentivePreview } from "../../../../../utils/salesIncentiveCalc";

const DEFAULT_INCENTIVE = {
  monthlyPoRate: 0.1,
  monthlyRequireAdvance: true,
  quarterlyRate: 0.1,
  quarterlyThreshold: 80,
  yearlyRate: 0.1,
  yearlyThreshold: 100,
  basis: "target",
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const splitYearly = (yearly) => {
  const total = round2(yearly);
  const each = Math.floor((total / 12) * 100) / 100;
  const arr = Array(12).fill(each);
  arr[11] = round2(total - each * 11);
  return arr.map(String);
};

const numOnly = (v) => /^\d*\.?\d{0,2}$/.test(v);

// exact rupee split — last person takes the paise difference (same as backend)
const splitAmount = (value, percents) => {
  const total = round2(value);
  const parts = percents.map((p) => round2((total * (Number(p) || 0)) / 100));
  if (parts.length > 0) {
    const others = parts.slice(0, -1).reduce((s, n) => s + n, 0);
    parts[parts.length - 1] = round2(total - others);
  }
  return parts;
};

// ✅ NEW: exact rupees + paise for payment amounts (₹1,234.50)
const formatPay = (n) =>
  "₹" + (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const STATUS_TEXT = { past: "", current: " (running)", upcoming: " (upcoming)" };

// status text for one month row
const monthStatus = (m, rules) => {
  if (m.target <= 0) return { text: "No target", cls: "text-muted" };
  if (m.incentiveEligible) return { text: "✓ Reached 100%", cls: "text-success fw-bold" };
  if (m.status === "upcoming") return { text: `Need ${formatINR(m.target)} (100%)`, cls: "text-muted" };
  if (m.blockedByAdvance)
    return { text: `Reached 100%, but advance POs only ${formatINR(m.achievedWithAdvance)}`, cls: "text-warning fw-bold" };
  return {
    text: `Need ${formatINR(m.target)} (100%) · short ${formatINR(m.shortBy)}${rules.monthlyRequireAdvance ? " (advance POs)" : ""}${STATUS_TEXT[m.status]}`,
    cls: m.status === "current" ? "text-primary" : "text-danger",
  };
};

const periodStatus = (p, thresholdPct) => {
  if (p.target <= 0) return { text: "No target", cls: "text-muted" };
  if (p.incentiveEligible) return { text: `✓ Reached ${thresholdPct}%`, cls: "text-success fw-bold" };
  if (p.status === "upcoming") return { text: `Need ${formatINR(p.thresholdAmount)} (${thresholdPct}%)`, cls: "text-muted" };
  return {
    text: `Need ${formatINR(p.thresholdAmount)} (${thresholdPct}%) · short ${formatINR(p.shortBy)}${STATUS_TEXT[p.status]}`,
    cls: p.status === "current" ? "text-primary" : "text-danger",
  };
};

const approvalBadge = (st) => {
  if (!st || st === "Approved") return null;
  return (
    <span className={`badge ms-1 ${st === "Rejected" ? "bg-danger" : "bg-warning text-dark"}`} style={{ fontSize: 10 }}>
      {st}
    </span>
  );
};

/**
 * HR popup: set Yearly / Quarterly / Monthly target + incentive % for one employee.
 * Props: employee (row from Employee Master), handleClose()
 */
const SetTargetPopup = ({ employee, handleClose }) => {
  const thisFy = currentFinancialYear();
  const [fy, setFy] = useState(thisFy);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [yearly, setYearly] = useState("");
  const [months, setMonths] = useState(Array(12).fill(""));
  const [incentive, setIncentive] = useState(DEFAULT_INCENTIVE);
  const [remark, setRemark] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showRules, setShowRules] = useState(false);

  // ✅ NEW: POs credited to this employee in the FY (for month-wise calculation)
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [openMonth, setOpenMonth] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");

  // ✅ PO share (team): colleagues who get a % of ALL this employee's POs in this FY
  //    own share = 100 − sum of colleagues
  const [shareRows, setShareRows] = useState([]); // [{ employee:{value,label}|null, percent:"20" }]
  const [empOptions, setEmpOptions] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await getEmployeeDropdown();
      if (res?.success) {
        setEmpOptions(
          (res.employees || [])
            .filter((e) => String(e._id) !== String(employee._id))
            .map((e) => ({ value: e._id, label: e.name }))
        );
      }
    })();
  }, [employee._id]);

  // ── load existing target for the selected FY ──
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setOpenMonth(null);
      const data = await getEmployeeSalesTarget(employee._id, fy);
      if (!alive) return;
      if (data?.success) {
        let m = Array(12).fill("");
        let inc = DEFAULT_INCENTIVE;
        if (data.target) {
          m = data.target.monthlyTargets.map((v) => String(v));
          inc = { ...DEFAULT_INCENTIVE, ...(data.target.incentive || {}) };
          setYearly(String(data.target.yearlyTarget || ""));
          setRemark(data.target.remark || "");
          setShareRows(
            (data.target.poShare || [])
              .filter((r) => String(r.employee) !== String(employee._id))
              .map((r) => ({ employee: { value: r.employee, label: r.name || "Employee" }, percent: String(r.percent) }))
          );
          setLastUpdate(
            data.target.updatedAt
              ? { by: data.target.updatedByName, at: data.target.updatedAt }
              : null
          );
        } else {
          setYearly("");
          setRemark("");
          setShareRows([]);
          setLastUpdate(null);
        }
        setMonths(m);
        setIncentive(inc);
        setSavedSnapshot(JSON.stringify({ m: m.map(Number), inc }));
        setPurchaseOrders(data.purchaseOrders || []);
      } else {
        toast.error(data?.error || "Could not load target");
      }
      setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, [employee._id, fy]);

  // ── yearly typed → split into 12 months ──
  const handleYearlyChange = (e) => {
    const v = e.target.value;
    if (!numOnly(v)) return;
    setYearly(v);
    setMonths(v === "" ? Array(12).fill("") : splitYearly(v));
  };

  // ── one month typed → yearly = sum ──
  const handleMonthChange = (i, v) => {
    if (!numOnly(v)) return;
    const next = [...months];
    next[i] = v;
    setMonths(next);
    setYearly(String(round2(next.reduce((s, m) => s + (Number(m) || 0), 0))));
  };

  const totals = useMemo(() => {
    const m = months.map((x) => Number(x) || 0);
    return {
      yearly: round2(m.reduce((s, x) => s + x, 0)),
      quarters: [0, 1, 2, 3].map((q) => round2(m.slice(q * 3, q * 3 + 3).reduce((s, x) => s + x, 0))),
    };
  }, [months]);

  // ✅ NEW: month-wise incentive calculation — updates live while HR edits
  const calc = useMemo(
    () => buildIncentivePreview({ fy, monthlyTargets: months, incentive, purchaseOrders }),
    [fy, months, incentive, purchaseOrders]
  );
  const isDirty = !loading && savedSnapshot !== JSON.stringify({ m: months.map(Number), inc: incentive });

  const maxIncentive = round2(
    (totals.yearly * (Number(incentive.monthlyPoRate) || 0)) / 100 +
      (totals.yearly * (Number(incentive.quarterlyRate) || 0)) / 100 +
      (totals.yearly * (Number(incentive.yearlyRate) || 0)) / 100
  );

  const setRule = (k, v) => setIncentive((p) => ({ ...p, [k]: v }));

  // ── PO share helpers ──
  const othersPercent = round2(shareRows.reduce((s, r) => s + (Number(r.percent) || 0), 0));
  const ownPercent = round2(100 - othersPercent);
  const shareUsedIds = shareRows.map((r) => r.employee?.value).filter(Boolean);
  const exampleAmounts = splitAmount(100000, [ownPercent, ...shareRows.map((r) => r.percent)]);

  const setShareRow = (i, patch) =>
    setShareRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const handleSharePercent = (i, v) => {
    if (!/^\d{0,3}(\.\d{0,2})?$/.test(v) || Number(v) > 100) return;
    setShareRow(i, { percent: v });
  };
  const addShareRow = () => {
    if (shareRows.length >= 9) return toast.error("Maximum 10 employees in a PO share");
    setShareRows((prev) => [...prev, { employee: null, percent: prev.length === 0 ? "20" : "" }]);
  };
  const removeShareRow = (i) => setShareRows((prev) => prev.filter((_, idx) => idx !== i));
  const setOwnPreset = (own) => {
    if (shareRows.length !== 1) return;
    setShareRows((prev) => [{ ...prev[0], percent: String(round2(100 - own)) }]);
  };

  // ✅ NEW: download month-wise incentive sheet (CSV → opens in Excel)
  const downloadCsv = () => {
    const r = calc.rules;
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      [`Sales incentive — ${employee.name} — ${fyLabel(fy)}`],
      [`Rules: monthly ${r.monthlyPoRate}% at 100%${r.monthlyRequireAdvance ? " (advance POs only)" : ""}; quarterly ${r.quarterlyRate}% at ${r.quarterlyThreshold}%; yearly ${r.yearlyRate}% at ${r.yearlyThreshold}%; on ${r.basis === "achieved" ? "achieved PO amount (max 100% of target)" : "target amount"}`],
      [],
      ["Period", "Target", "PO value (employee share, without GST)", "PO value with advance", "Achieved %", "Eligible", "Incentive %", "Incentive (Rs)"],
    ];
    calc.quarters.forEach((qt) => {
      calc.months.slice(qt.index * 3, qt.index * 3 + 3).forEach((m) =>
        lines.push([`${m.label} ${m.year}`, m.target, m.achieved, m.achievedWithAdvance, m.percent, m.incentiveEligible ? "Yes" : "No", r.monthlyPoRate, m.incentive])
      );
      lines.push([qt.label, qt.target, qt.achieved, "", qt.percent, qt.incentiveEligible ? "Yes" : "No", r.quarterlyRate, qt.incentive]);
    });
    const y = calc.yearly;
    lines.push([fyLabel(fy), y.target, y.achieved, "", y.percent, y.incentiveEligible ? "Yes" : "No", r.yearlyRate, y.incentive]);
    lines.push([]);
    lines.push(["Total monthly incentive", "", "", "", "", "", "", calc.totals.monthly]);
    lines.push(["Total quarterly incentive", "", "", "", "", "", "", calc.totals.quarterly]);
    lines.push(["Yearly incentive", "", "", "", "", "", "", calc.totals.yearly]);
    lines.push(["TOTAL INCENTIVE", "", "", "", "", "", "", calc.totals.total]);
    lines.push([]);
    lines.push(["PO date", "Customer", "PO number", "Full PO value", "Share %", "Credited value", "Advance %", "Approval"]);
    calc.months.forEach((m) =>
      m.pos.forEach((p) =>
        lines.push([fmtDate(p.poDate), p.customer, p.poNumber, p.poValue, p.sharePercent, p.creditedValue, p.advancePay, p.approvalStatus || "Approved"])
      )
    );
    const csv = "\uFEFF" + lines.map((l) => l.map(q).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Incentive_${employee.name.replace(/\s+/g, "_")}_${fyLabel(fy).replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (totals.yearly <= 0 && shareRows.length === 0)
      return toast.error("Enter a yearly or monthly target greater than 0");

    // ── PO share checks ──
    if (shareRows.length > 0) {
      if (shareRows.some((r) => !r.employee)) return toast.error("Select an employee in every PO share row");
      if (shareRows.some((r) => !(Number(r.percent) > 0))) return toast.error("Each PO share must be more than 0%");
      if (new Set(shareUsedIds).size !== shareUsedIds.length) return toast.error("The same employee is added twice in PO share");
      if (ownPercent < 0) return toast.error(`PO share is more than 100% (${round2(othersPercent)}% to others)`);
    }

    for (const k of ["monthlyPoRate", "quarterlyRate", "yearlyRate", "quarterlyThreshold", "yearlyThreshold"]) {
      if (incentive[k] === "" || incentive[k] === null || incentive[k] === undefined)
        return toast.error("Fill every incentive % value (use 0 for no incentive)");
      const v = Number(incentive[k]);
      if (!Number.isFinite(v) || v < 0 || v > 100) return toast.error("Incentive % values must be between 0 and 100");
    }

    setSaving(true);
    const t = toast.loading("Saving target...");
    const data = await saveEmployeeSalesTarget(employee._id, {
      financialYear: fy,
      monthlyTargets: months.map((m) => Number(m) || 0),
      incentive: {
        ...incentive,
        monthlyPoRate: Number(incentive.monthlyPoRate),
        quarterlyRate: Number(incentive.quarterlyRate),
        yearlyRate: Number(incentive.yearlyRate),
        quarterlyThreshold: Number(incentive.quarterlyThreshold),
        yearlyThreshold: Number(incentive.yearlyThreshold),
      },
      remark,
      // own row + colleagues; empty list = 100% own (no sharing)
      poShare:
        shareRows.length === 0
          ? []
          : [
              ...(ownPercent > 0 ? [{ employee: employee._id, percent: ownPercent }] : []),
              ...shareRows.map((r) => ({ employee: r.employee.value, percent: Number(r.percent) })),
            ],
    });
    toast.dismiss(t);
    setSaving(false);
    if (data?.success) {
      toast.success(data.message || "Target saved");
      handleClose(true);
    } else {
      toast.error(data?.error || "Target not saved");
    }
  };

  const fyOptions = [thisFy - 1, thisFy, thisFy + 1];
  const rules = calc.rules;
  const thStyle = { fontSize: 12, whiteSpace: "nowrap", background: "#f1f3f9", position: "sticky", top: 0, zIndex: 1 };
  const tdR = { textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content p-3">
          <form onSubmit={handleSave}>
            <div className="modal-header pt-0">
              <div>
                <h5 className="card-title fw-bold mb-0">
                  <i className="fa-solid fa-bullseye me-2 text-primary"></i>Sales Target
                </h5>
                <small className="text-muted">
                  {employee.name}
                  {employee.designation?.name ? ` · ${employee.designation.name}` : ""}
                </small>
              </div>
              <button onClick={() => handleClose(false)} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">
                {/* ── FY + Yearly ── */}
                <div className="col-12 col-lg-4 mt-2">
                  <label className="form-label label_text">Financial Year</label>
                  <select className="form-select rounded-0" value={fy} onChange={(e) => setFy(Number(e.target.value))}>
                    {fyOptions.map((f) => (
                      <option key={f} value={f}>
                        {fyLabel(f)} (Apr {f} – Mar {f + 1})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-lg-8 mt-2">
                  <label className="form-label label_text">Yearly Target (without GST)</label>
                  <div className="input-group border">
                    <span className="input-group-text rounded-0 bg-white border-0">
                      <i className="fa-solid fa-indian-rupee-sign"></i>
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="form-control rounded-0 border-0"
                      placeholder="eg. 80000000"
                      value={yearly}
                      onChange={handleYearlyChange}
                      disabled={loading}
                      maxLength={15}
                    />
                  </div>
                  <small className="text-muted">
                    {totals.yearly > 0
                      ? `${formatINR(totals.yearly)} · Quarterly ≈ ${formatINR(totals.yearly / 4)} · Monthly ≈ ${formatINR(totals.yearly / 12)}`
                      : "Typing a yearly amount splits it equally into 12 months. You can then change any month."}
                  </small>
                </div>

                {/* ── Monthly split by quarter ── */}
                <div className="col-12 mt-3">
                  <div className="border bg-gray p-2">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="SecondaryInfo fw-bold">Monthly targets</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-0"
                        disabled={loading || totals.yearly <= 0}
                        onClick={() => setMonths(splitYearly(totals.yearly))}
                        title="Divide the yearly total equally across 12 months"
                      >
                        <i className="fa-solid fa-equals me-1"></i>Split equally
                      </button>
                    </div>
                    {[0, 1, 2, 3].map((q) => (
                      <div className="row g-2 mb-2 align-items-end" key={q}>
                        {[0, 1, 2].map((k) => {
                          const i = q * 3 + k;
                          return (
                            <div className="col-6 col-md-3" key={i}>
                              <label className="form-label label_text mb-0" style={{ fontSize: 12 }}>
                                {FY_MONTHS[i]} {i <= 8 ? fy : fy + 1}
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="form-control form-control-sm rounded-0"
                                value={months[i]}
                                onChange={(e) => handleMonthChange(i, e.target.value)}
                                disabled={loading}
                                placeholder="0"
                              />
                            </div>
                          );
                        })}
                        <div className="col-6 col-md-3">
                          <div className="small text-muted">Q{q + 1} total</div>
                          <div className="fw-bold">{formatINR(totals.quarters[q])}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Incentive rules ── */}
                <div className="col-12 mt-3">
                  <div className="border p-2">
                    <div
                      className="d-flex justify-content-between align-items-center"
                      style={{ cursor: "pointer" }}
                      onClick={() => setShowRules((s) => !s)}
                    >
                      <span className="SecondaryInfo fw-bold">
                        Incentive rules{" "}
                        <small className="text-muted fw-normal">
                          (monthly {incentive.monthlyPoRate}% · quarterly {incentive.quarterlyRate}% · yearly {incentive.yearlyRate}%)
                        </small>
                      </span>
                      <i className={`fa-solid fa-chevron-${showRules ? "up" : "down"}`}></i>
                    </div>

                    {showRules && (
                      <div className="row g-2 mt-2">
                        <div className="col-12 col-md-4">
                          <label className="form-label label_text mb-0" style={{ fontSize: 12 }}>Monthly PO incentive %</label>
                          <input type="number" step="0.01" min="0" max="100" className="form-control form-control-sm rounded-0"
                            value={incentive.monthlyPoRate} onChange={(e) => setRule("monthlyPoRate", e.target.value)} />
                          <div className="form-check mt-1">
                            <input className="form-check-input" type="checkbox" id="reqAdv"
                              checked={!!incentive.monthlyRequireAdvance}
                              onChange={(e) => setRule("monthlyRequireAdvance", e.target.checked)} />
                            <label className="form-check-label" htmlFor="reqAdv" style={{ fontSize: 12 }}>
                              Count only POs with advance payment
                            </label>
                          </div>
                          <small className="text-muted">Paid only when the month's PO target is 100% achieved. Set 0% for no monthly incentive.</small>
                        </div>

                        <div className="col-6 col-md-4">
                          <label className="form-label label_text mb-0" style={{ fontSize: 12 }}>Quarterly incentive %</label>
                          <input type="number" step="0.01" min="0" max="100" className="form-control form-control-sm rounded-0"
                            value={incentive.quarterlyRate} onChange={(e) => setRule("quarterlyRate", e.target.value)} />
                          <label className="form-label label_text mb-0 mt-1" style={{ fontSize: 12 }}>Paid when quarter reaches (%)</label>
                          <input type="number" step="1" min="0" max="100" className="form-control form-control-sm rounded-0"
                            value={incentive.quarterlyThreshold} onChange={(e) => setRule("quarterlyThreshold", e.target.value)} />
                        </div>

                        <div className="col-6 col-md-4">
                          <label className="form-label label_text mb-0" style={{ fontSize: 12 }}>Yearly incentive %</label>
                          <input type="number" step="0.01" min="0" max="100" className="form-control form-control-sm rounded-0"
                            value={incentive.yearlyRate} onChange={(e) => setRule("yearlyRate", e.target.value)} />
                          <label className="form-label label_text mb-0 mt-1" style={{ fontSize: 12 }}>Paid when year reaches (%)</label>
                          <input type="number" step="1" min="0" max="100" className="form-control form-control-sm rounded-0"
                            value={incentive.yearlyThreshold} onChange={(e) => setRule("yearlyThreshold", e.target.value)} />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label label_text mb-0" style={{ fontSize: 12 }}>Calculate incentive on</label>
                          <select className="form-select form-select-sm rounded-0" value={incentive.basis}
                            onChange={(e) => setRule("basis", e.target.value)}>
                            <option value="target">Target amount (as in Excel sheet)</option>
                            <option value="achieved">Actual PO amount achieved (max 100% of target)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {totals.yearly > 0 && (
                      <div className="small mt-2 text-success">
                        <i className="fa-solid fa-coins me-1"></i>
                        Maximum incentive if every target is hit: <b>{formatINR(maxIncentive)}</b>
                      </div>
                    )}
                  </div>
                </div>

                {/* ✅ NEW: Month-wise incentive calculation (for HR payment) ── */}
                <div className="col-12 mt-3">
                  <div className="border p-2" style={{ background: "#fbfcff" }}>
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                      <div>
                        <span className="SecondaryInfo fw-bold">
                          <i className="fa-solid fa-calculator me-1 text-primary"></i>
                          Incentive calculation — month wise ({fyLabel(fy)})
                        </span>
                        <div className="small text-muted">
                          PO value = Purchase Order Value without GST from Project Master, by PO date
                          {purchaseOrders.some((p) => Number(p.sharePercent) < 100) ? " · shared POs counted at this employee's %" : ""}
                          {" "}· {calc.poCount} PO{calc.poCount === 1 ? "" : "s"}
                        </div>
                        <div className="small text-muted">
                          Monthly {rules.monthlyPoRate}% at 100%{rules.monthlyRequireAdvance ? " (only POs with advance)" : ""} ·
                          Quarterly {rules.quarterlyRate}% at {rules.quarterlyThreshold}% ·
                          Yearly {rules.yearlyRate}% at {rules.yearlyThreshold}% ·
                          on {rules.basis === "achieved" ? "achieved PO amount (max 100% of target)" : "target amount"}
                        </div>
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-success rounded-0" onClick={downloadCsv} disabled={loading}>
                        <i className="fa-solid fa-file-excel me-1"></i>Download sheet
                      </button>
                    </div>

                    {isDirty && (
                      <div className="alert alert-warning py-1 px-2 small mb-2 rounded-0">
                        <i className="fa-solid fa-triangle-exclamation me-1"></i>
                        Showing your <b>unsaved</b> target / incentive changes. Click <b>Save Target</b> to apply them
                        (the employee dashboard shows saved values). PO share changes apply after saving.
                      </div>
                    )}

                    {loading ? (
                      <div className="text-center text-muted small py-3">Loading…</div>
                    ) : (
                      <div className="table-responsive" style={{ maxHeight: 420, overflowY: "auto" }}>
                        <table className="table table-sm table-bordered mb-0 align-middle" style={{ fontSize: 12.5 }}>
                          <thead>
                            <tr>
                              <th style={thStyle}>Month</th>
                              <th style={{ ...thStyle, textAlign: "right" }}>Target</th>
                              <th style={{ ...thStyle, textAlign: "right" }}>PO value (no GST)</th>
                              <th style={{ ...thStyle, textAlign: "right" }}>With advance</th>
                              <th style={{ ...thStyle, textAlign: "right" }}>%</th>
                              <th style={thStyle}>Status</th>
                              <th style={{ ...thStyle, textAlign: "right" }}>Calculation</th>
                              <th style={{ ...thStyle, textAlign: "right" }}>Incentive</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calc.quarters.map((qt) => {
                              const qs = periodStatus(qt, rules.quarterlyThreshold);
                              return (
                                <Fragment key={qt.index}>
                                  {calc.months.slice(qt.index * 3, qt.index * 3 + 3).map((m) => {
                                    const st = monthStatus(m, rules);
                                    const open = openMonth === m.index;
                                    return (
                                      <Fragment key={m.index}>
                                        <tr
                                          onClick={() => m.pos.length && setOpenMonth(open ? null : m.index)}
                                          style={{
                                            cursor: m.pos.length ? "pointer" : "default",
                                            background: m.status === "current" ? "#f6f5ff" : undefined,
                                          }}
                                        >
                                          <td style={{ whiteSpace: "nowrap" }}>
                                            {m.pos.length > 0 && (
                                              <i className={`fa-solid fa-caret-${open ? "down" : "right"} me-1 text-muted`}></i>
                                            )}
                                            {m.label} {m.year}
                                            {m.pos.length > 0 && <span className="text-muted"> · {m.pos.length} PO</span>}
                                          </td>
                                          <td style={tdR}>{formatINR(m.target)}</td>
                                          <td style={tdR}>{formatINR(m.achieved)}</td>
                                          <td style={tdR}>{formatINR(m.achievedWithAdvance)}</td>
                                          <td style={tdR}>{m.percent}%</td>
                                          <td className={st.cls}>{st.text}</td>
                                          <td style={{ ...tdR, color: "#6b7280" }}>
                                            {m.incentiveEligible ? `${formatINR(m.base)} × ${rules.monthlyPoRate}%` : "–"}
                                          </td>
                                          <td style={{ ...tdR, fontWeight: 700, color: m.incentive > 0 ? "#15803d" : "#9ca3af" }}>
                                            {m.incentive > 0 ? formatPay(m.incentive) : "–"}
                                          </td>
                                        </tr>

                                        {/* PO list of this month */}
                                        {open && (
                                          <tr>
                                            <td colSpan={8} style={{ background: "#f9fafb", padding: 6 }}>
                                              <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                                                <thead>
                                                  <tr className="text-muted">
                                                    <th>PO date</th>
                                                    <th>Customer</th>
                                                    <th>PO no.</th>
                                                    <th style={{ textAlign: "right" }}>Full PO value</th>
                                                    <th style={{ textAlign: "right" }}>Share</th>
                                                    <th style={{ textAlign: "right" }}>Counted</th>
                                                    <th style={{ textAlign: "right" }}>Advance</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {m.pos.map((p) => (
                                                    <tr key={p._id}>
                                                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(p.poDate)}</td>
                                                      <td>
                                                        {p.customer}
                                                        {approvalBadge(p.approvalStatus)}
                                                      </td>
                                                      <td>{p.poNumber}</td>
                                                      <td style={tdR}>{formatPay(p.poValue)}</td>
                                                      <td style={tdR}>
                                                        {p.sharePercent}%
                                                        {p.splitWith?.length > 0 && (
                                                          <div className="text-muted" style={{ fontSize: 10.5 }}>
                                                            with {p.splitWith.map((w) => `${w.name || "colleague"} ${w.percent}%`).join(", ")}
                                                          </div>
                                                        )}
                                                      </td>
                                                      <td style={{ ...tdR, fontWeight: 600 }}>{formatPay(p.creditedValue)}</td>
                                                      <td style={{ ...tdR, color: p.advancePay > 0 ? "#15803d" : "#dc2626" }}>
                                                        {p.advancePay > 0 ? `${p.advancePay}%` : "No"}
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                        )}
                                      </Fragment>
                                    );
                                  })}

                                  {/* quarter row */}
                                  <tr style={{ background: "#eef2ff", fontWeight: 600 }}>
                                    <td>{qt.label}</td>
                                    <td style={tdR}>{formatINR(qt.target)}</td>
                                    <td style={tdR}>{formatINR(qt.achieved)}</td>
                                    <td style={tdR}></td>
                                    <td style={tdR}>{qt.percent}%</td>
                                    <td className={qs.cls} style={{ fontWeight: 600 }}>{qs.text}</td>
                                    <td style={{ ...tdR, color: "#6b7280", fontWeight: 400 }}>
                                      {qt.incentiveEligible ? `${formatINR(qt.base)} × ${rules.quarterlyRate}%` : "–"}
                                    </td>
                                    <td style={{ ...tdR, fontWeight: 700, color: qt.incentive > 0 ? "#15803d" : "#9ca3af" }}>
                                      {qt.incentive > 0 ? formatPay(qt.incentive) : "–"}
                                    </td>
                                  </tr>
                                </Fragment>
                              );
                            })}

                            {/* year row */}
                            {(() => {
                              const y = calc.yearly;
                              const ys = periodStatus(y, rules.yearlyThreshold);
                              return (
                                <tr style={{ background: "#e0e7ff", fontWeight: 700 }}>
                                  <td>{fyLabel(fy)}</td>
                                  <td style={tdR}>{formatINR(y.target)}</td>
                                  <td style={tdR}>{formatINR(y.achieved)}</td>
                                  <td style={tdR}></td>
                                  <td style={tdR}>{y.percent}%</td>
                                  <td className={ys.cls}>{ys.text}</td>
                                  <td style={{ ...tdR, color: "#6b7280", fontWeight: 400 }}>
                                    {y.incentiveEligible ? `${formatINR(y.base)} × ${rules.yearlyRate}%` : "–"}
                                  </td>
                                  <td style={{ ...tdR, color: y.incentive > 0 ? "#15803d" : "#9ca3af" }}>
                                    {y.incentive > 0 ? formatPay(y.incentive) : "–"}
                                  </td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* totals to pay */}
                    {!loading && (
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        <div className="border bg-white px-3 py-2 small">
                          Monthly total<div className="fw-bold">{formatPay(calc.totals.monthly)}</div>
                        </div>
                        <div className="border bg-white px-3 py-2 small">
                          Quarterly total<div className="fw-bold">{formatPay(calc.totals.quarterly)}</div>
                        </div>
                        <div className="border bg-white px-3 py-2 small">
                          Yearly<div className="fw-bold">{formatPay(calc.totals.yearly)}</div>
                        </div>
                        <div className="px-3 py-2 small text-white" style={{ background: "#16a34a" }}>
                          Total incentive earned {fyLabel(fy)}
                          <div className="fw-bold" style={{ fontSize: 16 }}>{formatPay(calc.totals.total)}</div>
                        </div>
                      </div>
                    )}
                    {!loading && purchaseOrders.some((p) => p.approvalStatus && p.approvalStatus !== "Approved") && (
                      <div className="small text-warning mt-1">
                        <i className="fa-solid fa-circle-info me-1"></i>
                        Some POs are Pending / Rejected approval — check them before paying (click a month to see).
                      </div>
                    )}
                  </div>
                </div>

                {/* ✅ PO share (team) — applies to ALL POs of this employee in this FY ── */}
                <div className="col-12 mt-3">
                  <div className="border p-2">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <span className="SecondaryInfo fw-bold">
                        <i className="fa-solid fa-people-arrows me-1 text-primary"></i>
                        PO share (team){" "}
                        <small className="text-muted fw-normal">
                          — all POs created by {employee.name} in {fyLabel(fy)}
                        </small>
                      </span>
                      <button type="button" className="btn btn-sm btn-outline-primary rounded-0" onClick={addShareRow} disabled={loading}>
                        <i className="fa-solid fa-user-plus me-1"></i>Share with employee
                      </button>
                    </div>

                    {shareRows.length === 0 ? (
                      <small className="text-muted d-block mt-2">
                        Not shared: 100% of every PO counts for {employee.name}.
                      </small>
                    ) : (
                      <div className="mt-2">
                        {/* own share (auto) */}
                        <div className="row g-2 align-items-center mb-2">
                          <div className="col-12 col-md-6">
                            <input className="form-control form-control-sm rounded-0 bg-light" value={`${employee.name} (PO creator)`} readOnly />
                          </div>
                          <div className="col-5 col-md-2">
                            <div className="input-group input-group-sm">
                              <input className="form-control rounded-0 bg-light" value={ownPercent} readOnly />
                              <span className="input-group-text rounded-0">%</span>
                            </div>
                          </div>
                          <div className="col-7 col-md-4 small text-muted">
                            auto = 100% − others · on ₹1,00,000 PO: <b>{formatINR(exampleAmounts[0])}</b>
                          </div>
                        </div>

                        {shareRows.map((r, i) => (
                          <div className="row g-2 align-items-center mb-2" key={i}>
                            <div className="col-12 col-md-6">
                              <Select
                                options={empOptions.filter((o) => o.value === r.employee?.value || !shareUsedIds.includes(o.value))}
                                value={r.employee}
                                onChange={(opt) => setShareRow(i, { employee: opt })}
                                placeholder="Search employee..."
                                menuPortalTarget={document.body}
                                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                              />
                            </div>
                            <div className="col-5 col-md-2">
                              <div className="input-group input-group-sm">
                                <input type="text" inputMode="decimal" className="form-control rounded-0"
                                  value={r.percent} onChange={(e) => handleSharePercent(i, e.target.value)} placeholder="0" />
                                <span className="input-group-text rounded-0">%</span>
                              </div>
                            </div>
                            <div className="col-5 col-md-3 small text-muted">
                              on ₹1,00,000 PO: <b>{formatINR(exampleAmounts[i + 1])}</b>
                            </div>
                            <div className="col-2 col-md-1 text-end">
                              <button type="button" className="btn btn-sm btn-outline-danger rounded-0" onClick={() => removeShareRow(i)} title="Remove">
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          </div>
                        ))}

                        {shareRows.length === 1 && (
                          <div className="d-flex flex-wrap gap-2 align-items-center">
                            <span className="small text-muted">Quick (creator / other):</span>
                            {[80, 70, 60, 50].map((own) => (
                              <button key={own} type="button" className="btn btn-sm btn-outline-secondary rounded-0" onClick={() => setOwnPreset(own)}>
                                {own} / {100 - own}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className={`mt-2 small fw-bold ${ownPercent >= 0 ? "text-success" : "text-danger"}`}>
                          {ownPercent >= 0
                            ? `Total 100% → ${employee.name} ${ownPercent}% + others ${othersPercent}%`
                            : `Too much: others have ${othersPercent}% (max 100%)`}
                        </div>
                        <small className="text-muted d-block">
                          Each person's share of the PO value is added to their own target achievement, so the incentive follows the same %.
                          Project Master does not change.
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-12 mt-3">
                  <label className="form-label label_text">Remark</label>
                  <textarea className="textarea_edit col-12" rows="2" maxLength={500} value={remark}
                    onChange={(e) => setRemark(e.target.value)} placeholder="eg. Team target with Pooja (80-20)" />
                  {lastUpdate && (
                    <small className="text-muted d-block">
                      Last updated by {lastUpdate.by || "HR"} on {new Date(lastUpdate.at).toLocaleString("en-IN")}
                    </small>
                  )}
                </div>

                <div className="row">
                  <div className="col-12 pt-3 mt-2">
                    <button type="submit" disabled={saving || loading} className="w-80 btn addbtn rounded-0 add_button m-2 px-4">
                      {saving ? "Saving..." : "Save Target"}
                    </button>
                    <button type="button" onClick={() => handleClose(false)} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetTargetPopup;