import axios from "axios";

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/sales-target";

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// FY start year for today. Oct 2026 → 2026 (FY 2026-27), Feb 2027 → 2026
export const currentFinancialYear = () => {
  const d = new Date();
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
};

export const fyLabel = (fy) => `FY ${fy}-${String(fy + 1).slice(-2)}`;

export const FY_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

// ₹ 1,23,45,678
export const formatINR = (n) =>
  "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

// ₹1.2 Cr / ₹4.5 L / ₹12K
export const formatINRCompact = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2).replace(/\.?0+$/, "")} L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};

const handle = (error) => {
  console.error(error);
  return error?.response?.data || { success: false, error: error.message };
};

// HR: list of sales employees with target + achieved
export const getSalesTargets = async (fy, { all = false, q = "" } = {}) => {
  try {
    const res = await axios.get(url, { params: { fy, all, q }, headers: auth() });
    return res.data;
  } catch (error) {
    return handle(error);
  }
};

// HR: one employee
export const getEmployeeSalesTarget = async (employeeId, fy) => {
  try {
    const res = await axios.get(`${url}/employee/${employeeId}`, { params: { fy }, headers: auth() });
    return res.data;
  } catch (error) {
    return handle(error);
  }
};

// HR: save target  payload = { financialYear, yearlyTarget? , monthlyTargets?, incentive?, remark? }
export const saveEmployeeSalesTarget = async (employeeId, payload) => {
  try {
    const res = await axios.put(`${url}/employee/${employeeId}`, payload, { headers: auth() });
    return res.data;
  } catch (error) {
    return handle(error);
  }
};

// Sales employee: own data for dashboard
export const getMySalesTarget = async (fy) => {
  try {
    const res = await axios.get(`${url}/my`, { params: { fy }, headers: auth() });
    return res.data;
  } catch (error) {
    return handle(error);
  }
};

// ✅ NEW — for the PO share (team) rows in the HR target popup
// all employees (id + name) for the dropdown — uses your existing /api/employee/dropdown
export const getEmployeeDropdown = async () => {
  try {
    const res = await axios.get(`${baseUrl}/api/employee/dropdown`, { headers: auth() });
    return res.data;
  } catch (error) {
    return handle(error);
  }
};