// ─────────────────────────────────────────────────────────────────────────────
// Frontend copy of backend services/salesTargetCalc.js → buildSummary
// Used by HR "Set Target" popup to show the month-wise incentive calculation
// LIVE while HR edits targets / rules (before Save).
// ⚠️ Keep the rules here exactly the same as the backend file.
// Incentive on achieved amount is CAPPED at 100% of target (management decision).
// ─────────────────────────────────────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
export const QUARTER_LABELS = ["Q1 (Apr-Jun)", "Q2 (Jul-Sep)", "Q3 (Oct-Dec)", "Q4 (Jan-Mar)"];

export const DEFAULT_INCENTIVE = {
  monthlyPoRate: 0.1,
  monthlyRequireAdvance: true,
  quarterlyRate: 0.1,
  quarterlyThreshold: 80,
  yearlyRate: 0.1,
  yearlyThreshold: 100,
  basis: "target",
};

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pct = (a, t) => (t > 0 ? round2((a / t) * 100) : 0);

// 0..11 (Apr..Mar) for a date, in IST
export const getFyMonthIndex = (date) => {
  const ist = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  return (ist.getUTCMonth() + 9) % 12;
};

const getFinancialYear = (date = new Date()) => {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
};

// −1 = FY in future, 12 = FY over, else current month index
const getCurrentFyMonthIndex = (fy, now = new Date()) => {
  const cur = getFinancialYear(now);
  if (fy < cur) return 12;
  if (fy > cur) return -1;
  return getFyMonthIndex(now);
};

// same cleaning as backend upsertForEmployee: empty / invalid → default
export const normalizeIncentive = (inc = {}) => {
  const out = { ...DEFAULT_INCENTIVE };
  ["monthlyPoRate", "quarterlyRate", "yearlyRate", "quarterlyThreshold", "yearlyThreshold"].forEach((k) => {
    if (inc[k] !== undefined && inc[k] !== "" && inc[k] !== null) {
      const v = Number(inc[k]);
      if (Number.isFinite(v) && v >= 0 && v <= 100) out[k] = v;
    }
  });
  if (inc.monthlyRequireAdvance !== undefined) out.monthlyRequireAdvance = Boolean(inc.monthlyRequireAdvance);
  if (["target", "achieved"].includes(inc.basis)) out.basis = inc.basis;
  return out;
};

/**
 * Month-wise incentive calculation.
 * purchaseOrders = rows from GET /api/sales-target/employee/:id (poRow):
 *   { poDate, poValue, creditedValue, sharePercent, advancePay, ... }
 * Returns the same numbers as backend buildSummary, plus the POs of each month.
 */
export const buildIncentivePreview = ({ fy, monthlyTargets = [], incentive = {}, purchaseOrders = [], now = new Date() }) => {
  const targets = Array.from({ length: 12 }, (_, i) => round2(Number(monthlyTargets[i]) || 0));
  const rules = normalizeIncentive(incentive);

  const achieved = Array(12).fill(0);
  const achievedWithAdvance = Array(12).fill(0);
  const posByMonth = Array.from({ length: 12 }, () => []);

  purchaseOrders.forEach((p) => {
    if (!p.poDate) return;
    const i = getFyMonthIndex(p.poDate);
    const val =
      p.creditedValue !== undefined && p.creditedValue !== null ? Number(p.creditedValue) || 0 : Number(p.poValue) || 0;
    achieved[i] += val;
    if ((Number(p.advancePay) || 0) > 0) achievedWithAdvance[i] += val;
    posByMonth[i].push(p);
  });

  const nowIdx = getCurrentFyMonthIndex(fy, now);

  const months = MONTH_LABELS.map((label, i) => {
    const target = targets[i];
    const ach = round2(achieved[i]);
    const adv = round2(achievedWithAdvance[i]);
    const eligibleAch = rules.monthlyRequireAdvance ? adv : ach;
    // monthly incentive only when 100% of the month's target is achieved
    const met = target > 0 && eligibleAch >= target;
    const base = rules.basis === "achieved" ? Math.min(eligibleAch, target) : target; // ✅ max 100%
    return {
      index: i,
      label,
      year: i <= 8 ? fy : fy + 1,
      target,
      achieved: ach,
      achievedWithAdvance: adv,
      eligibleAchieved: eligibleAch,
      percent: pct(ach, target),
      incentiveEligible: met,
      // reached target only because of non-advance POs → not eligible
      blockedByAdvance: rules.monthlyRequireAdvance && target > 0 && ach >= target && adv < target,
      shortBy: round2(Math.max(target - eligibleAch, 0)),
      base: met ? base : 0,
      incentive: met ? round2((base * rules.monthlyPoRate) / 100) : 0,
      status: i < nowIdx ? "past" : i === nowIdx ? "current" : "upcoming",
      pos: posByMonth[i],
    };
  });

  const quarters = QUARTER_LABELS.map((label, q) => {
    const slice = months.slice(q * 3, q * 3 + 3);
    const target = round2(slice.reduce((s, m) => s + m.target, 0));
    const ach = round2(slice.reduce((s, m) => s + m.achieved, 0));
    const need = round2((target * rules.quarterlyThreshold) / 100);
    const met = target > 0 && ach >= need;
    const base = rules.basis === "achieved" ? Math.min(ach, target) : target; // ✅ max 100%
    const lastStatus = slice[2].status;
    return {
      index: q,
      label,
      target,
      achieved: ach,
      percent: pct(ach, target),
      thresholdAmount: need,
      shortBy: round2(Math.max(need - ach, 0)),
      incentiveEligible: met,
      base: met ? base : 0,
      incentive: met ? round2((base * rules.quarterlyRate) / 100) : 0,
      status: slice[0].status === "upcoming" ? "upcoming" : lastStatus === "past" ? "past" : "current",
    };
  });

  const yTarget = round2(targets.reduce((s, n) => s + n, 0));
  const yAch = round2(achieved.reduce((s, n) => s + n, 0));
  const yNeed = round2((yTarget * rules.yearlyThreshold) / 100);
  const yMet = yTarget > 0 && yAch >= yNeed;
  const yBase = rules.basis === "achieved" ? Math.min(yAch, yTarget) : yTarget; // ✅ max 100%
  const yearly = {
    target: yTarget,
    achieved: yAch,
    percent: pct(yAch, yTarget),
    thresholdAmount: yNeed,
    shortBy: round2(Math.max(yNeed - yAch, 0)),
    incentiveEligible: yMet,
    base: yMet ? yBase : 0,
    incentive: yMet ? round2((yBase * rules.yearlyRate) / 100) : 0,
    status: nowIdx >= 12 ? "past" : nowIdx < 0 ? "upcoming" : "current",
  };

  const totals = {
    monthly: round2(months.reduce((s, m) => s + m.incentive, 0)),
    quarterly: round2(quarters.reduce((s, q) => s + q.incentive, 0)),
    yearly: yearly.incentive,
  };
  totals.total = round2(totals.monthly + totals.quarterly + totals.yearly);

  return { fy, rules, months, quarters, yearly, totals, poCount: purchaseOrders.length };
};