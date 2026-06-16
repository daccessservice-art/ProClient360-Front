import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/product";

const getProducts = async (page = 1, limit = 20, search = "") => {
  try {
    // ── FIX: previously `search` could be `null`/`undefined` and got
    // interpolated straight into the URL as the literal text "null" or
    // "undefined" (?q=null). encodeURIComponent + defaulting to "" avoids
    // that and also makes special characters in search terms URL-safe.
    const q = encodeURIComponent(search ?? "");
    const response = await axios.get(`${url}?q=${q}&page=${page}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = response.data;
    return data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const getProductById = async (productId) => {
  try {
    const response = await axios.get(`${url}/${productId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = response.data;
    return data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const createProduct = async (productData) => {
  try {
    const response = await axios.post(`${url}`, productData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = response.data;
    return data;
  } catch (error) {
    console.error(error.response.data);
    return error.response.data;
  }
};

const updateProduct = async (updatedData) => {
  try {
    const response = await axios.put(`${url}/${updatedData._id}`, updatedData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = response.data;
    return data;
  } catch (error) {
    console.error(error.response.data);
    return error.response.data;
  }
};

const deleteProduct = async (Id) => {
  try {
    const response = await axios.delete(`${url}/${Id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = response.data;
    return data;
  } catch (error) {
    console.log(error.response.data);
    return error.response.data.error;
  }
};

// ✅ Fetch ALL products for report (no pagination)
const getAllProductsForReport = async (search = "") => {
  try {
    // ── FIX: same null/undefined-as-string issue as getProducts ──
    const q = encodeURIComponent(search ?? "");
    const response = await axios.get(`${url}/report/all?q=${q}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

export { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getAllProductsForReport };