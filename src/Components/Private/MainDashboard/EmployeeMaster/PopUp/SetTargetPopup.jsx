import { useEffect, useMemo, useState } from "react";
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
  const [summary, setSummary] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showRules, setShowRules] = useState(false);

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
      const data = await getEmployeeSalesTarget(employee._id, fy);
      if (!alive) return;
      if (data?.success) {
        if (data.target) {
          setMonths(data.target.monthlyTargets.map((v) => String(v)));
          setYearly(String(data.target.yearlyTarget || ""));
          setIncentive({ ...DEFAULT_INCENTIVE, ...(data.target.incentive || {}) });
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
          setMonths(Array(12).fill(""));
          setYearly("");
          setIncentive(DEFAULT_INCENTIVE);
          setRemark("");
          setShareRows([]);
          setLastUpdate(null);
        }
        setSummary(data.summary || null);
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
  const y = summary?.yearly;

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-lg">
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
                          <small className="text-muted">Paid when the month's PO target is 100% achieved.</small>
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
                            <option value="achieved">Actual PO amount achieved</option>
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

                {/* ── Current achievement (read only) ── */}
                {y && y.target > 0 && (
                  <div className="col-12 mt-3">
                    <div className="border p-2" style={{ background: "#f8f9ff" }}>
                      <div className="d-flex flex-wrap gap-3 small">
                        <span>PO achieved {fyLabel(fy)}: <b>{formatINR(y.achieved)}</b></span>
                        <span>of <b>{formatINR(y.target)}</b></span>
                        <span className="text-primary fw-bold">{y.percent}%</span>
                        <span>Incentive earned so far: <b className="text-success">{formatINR(summary.incentiveTotals.total)}</b></span>
                      </div>
                    </div>
                  </div>
                )}

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