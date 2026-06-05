import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/inventory";
const productUrl = baseUrl + "/api/product";

const getInventory = async (page = 1, limit = 20, search = null, category = null, stockStatus = null) => {
  try {
    let endpoint = `${url}?page=${page}&limit=${limit}`;
    if (search) endpoint += `&q=${search}`;
    if (category) endpoint += `&category=${category}`;
    if (stockStatus) endpoint += `&stockStatus=${stockStatus}`;

    const response = await axios.get(endpoint, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error("API error:", error?.response?.data);
    return error?.response?.data;
  }
};

const getInventoryById = async (inventoryId) => {
  try {
    const response = await axios.get(`${url}/${inventoryId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

/**
 * Create new inventory item.
 * If `linkedProductId` is present in inventoryData, also updates
 * the Product Master's `currentStockQty` with the opening stock value.
 */
const createInventory = async (inventoryData) => {
  try {
    const response = await axios.post(`${url}`, inventoryData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = response.data;

    // ── Sync currentStockQty back to Product Master ──────────────────────
    if (
      data?.success &&
      inventoryData.linkedProductId &&
      inventoryData.currentStock !== undefined &&
      inventoryData.currentStock !== ""
    ) {
      try {
        await axios.put(
          `${productUrl}/${inventoryData.linkedProductId}`,
          { currentStockQty: parseFloat(inventoryData.currentStock) || 0 },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
      } catch (syncErr) {
        // Non-critical: log but don't block the main flow
        console.warn("Could not sync currentStockQty to Product Master:", syncErr?.response?.data);
      }
    }
    // ────────────────────────────────────────────────────────────────────

    return data;
  } catch (error) {
    console.error(error.response?.data);
    return error.response?.data;
  }
};

/**
 * Update inventory item.
 * If `linkedProductId` is present and stock changes, also updates
 * the Product Master's `currentStockQty`.
 */
const updateInventory = async (id, updatedData) => {
  try {
    const response = await axios.put(`${url}/${id}`, updatedData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = response.data;

    // ── Sync currentStockQty back to Product Master ──────────────────────
    if (
      data?.success &&
      updatedData.linkedProductId &&
      updatedData.currentStock !== undefined &&
      updatedData.currentStock !== ""
    ) {
      try {
        await axios.put(
          `${productUrl}/${updatedData.linkedProductId}`,
          { currentStockQty: parseFloat(updatedData.currentStock) || 0 },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
      } catch (syncErr) {
        console.warn("Could not sync currentStockQty to Product Master:", syncErr?.response?.data);
      }
    }
    // ────────────────────────────────────────────────────────────────────

    return data;
  } catch (error) {
    console.error(error.response?.data);
    return error.response?.data;
  }
};

const deleteInventory = async (id) => {
  try {
    const response = await axios.delete(`${url}/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.log(error.response?.data);
    return error.response?.data?.error;
  }
};

const searchInventory = async (searchParams) => {
  try {
    const response = await axios.get(`${url}/search`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      params: searchParams
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const getLowStockItems = async () => {
  try {
    const response = await axios.get(`${url}/low-stock`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const getInventoryByCategory = async (category) => {
  try {
    const response = await axios.get(`${url}/category/${category}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const addStockTransaction = async (id, transactionData) => {
  try {
    const response = await axios.post(`${url}/${id}/transaction`, transactionData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error.response?.data);
    return error.response?.data;
  }
};

const getTransactionHistory = async (id) => {
  try {
    const response = await axios.get(`${url}/${id}/transactions`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

export {
  getInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  searchInventory,
  getLowStockItems,
  getInventoryByCategory,
  addStockTransaction,
  getTransactionHistory
};