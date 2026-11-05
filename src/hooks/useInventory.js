import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/inventory";

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const fail = (error, fallback) =>
  error?.response?.data && typeof error.response.data === 'object'
    ? { success: false, ...error.response.data }
    : { success: false, error: fallback };

// List (live stock + IN/OUT totals + summary). axios `params` encodes search text safely.
const getInventory = async (page = 1, limit = 20, search = "", category = "", stockStatus = "") => {
  try {
    const params = { page, limit };
    if (search && String(search).trim()) params.q = String(search).trim();
    if (category) params.category = category;
    if (stockStatus) params.stockStatus = stockStatus;

    const response = await axios.get(url, { params, headers: authHeader() });
    return response.data;
  } catch (error) {
    console.error("Inventory list error:", error?.response?.data);
    return fail(error, "Network error while fetching inventory");
  }
};

const getInventoryById = async (inventoryId) => {
  try {
    const response = await axios.get(`${url}/${inventoryId}`, { headers: authHeader() });
    return response.data;
  } catch (error) {
    return fail(error, "Network error while fetching inventory item");
  }
};

// Full stock movement ledger: Opening → GRN IN / DC OUT / Manual → running balance
const getInventoryLedger = async (inventoryId) => {
  try {
    const response = await axios.get(`${url}/${inventoryId}/ledger`, { headers: authHeader() });
    return response.data;
  } catch (error) {
    return fail(error, "Network error while fetching stock ledger");
  }
};

// Stock History of ALL items: Opening / GRN / DC / Manual In / Manual Out, with who & when
// params: { page, limit, q, type, from, to }
const getInventoryMovements = async (params = {}) => {
  try {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));
    const response = await axios.get(`${url}/movements`, { params: clean, headers: authHeader() });
    return response.data;
  } catch (error) {
    return fail(error, "Network error while fetching stock history");
  }
};

// Add every Product Master product that is missing from Inventory (also runs automatically)
const syncInventoryWithProducts = async () => {
  try {
    const response = await axios.post(`${url}/sync`, {}, { headers: authHeader() });
    return response.data;
  } catch (error) {
    return fail(error, "Network error while syncing with Product Master");
  }
};

// Product Master stock sync is now done on the server (no extra call from the browser)
const createInventory = async (inventoryData) => {
  try {
    const response = await axios.post(url, inventoryData, { headers: authHeader() });
    return response.data;
  } catch (error) {
    return fail(error, "Network error while creating inventory item");
  }
};

const updateInventory = async (id, updatedData) => {
  try {
    const response = await axios.put(`${url}/${id}`, updatedData, { headers: authHeader() });
    return response.data;
  } catch (error) {
    return fail(error, "Network error while updating inventory item");
  }
};

const deleteInventory = async (id) => {
  try {
    const response = await axios.delete(`${url}/${id}`, { headers: authHeader() });
    return response.data;
  } catch (error) {
    return fail(error, "Network error while deleting inventory item");
  }
};

const searchInventory = async (searchParams) => {
  try {
    const response = await axios.get(`${url}/search`, { headers: authHeader(), params: searchParams });
    return response.data;
  } catch (error) {
    return fail(error, "Network error while searching inventory");
  }
};

const getLowStockItems = async () => {
  try {
    const response = await axios.get(`${url}/low-stock`, { headers: authHeader() });
    return response.data;
  } catch (error) {
    return fail(error, "Network error while fetching low stock items");
  }
};

const getInventoryByCategory = async (category) => {
  try {
    const response = await axios.get(`${url}/category/${encodeURIComponent(category)}`, { headers: authHeader() });
    return response.data;
  } catch (error) {
    return fail(error, "Network error while fetching inventory by category");
  }
};

// Stock transaction = PUT with a `transaction` object
const addStockTransaction = async (id, transaction) => updateInventory(id, { transaction });

const getTransactionHistory = async (id) => {
  try {
    const response = await axios.get(`${url}/${id}/transactions`, { headers: authHeader() });
    return response.data;
  } catch (error) {
    return fail(error, "Network error while fetching transaction history");
  }
};

export {
  getInventory,
  getInventoryById,
  getInventoryLedger,
  getInventoryMovements,
  syncInventoryWithProducts,
  createInventory,
  updateInventory,
  deleteInventory,
  searchInventory,
  getLowStockItems,
  getInventoryByCategory,
  addStockTransaction,
  getTransactionHistory,
};