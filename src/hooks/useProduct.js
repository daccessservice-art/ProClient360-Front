import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/product";

const getProducts = async (page = 1, limit = 20, search = "") => {
  try {
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
    console.error(error.response?.data);
    return error.response?.data || { success: false, error: "Network error while creating product" };
  }
};

const createProductForced = async (productData) => {
  return createProduct({ ...productData, forceCreateDuplicate: true });
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
    console.error(error?.response?.data);
    return error?.response?.data || { success: false, error: "Network error while updating product" };
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
    console.error(error?.response?.data);
    return error?.response?.data || { success: false, error: "Network error while deleting product" };
  }
};

const bulkDeleteProducts = async (ids) => {
  try {
    const response = await axios.delete(`${url}/bulk`, {
      data: { ids },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data || { success: false, error: "Network error while bulk deleting products" };
  }
};

const getDuplicateProducts = async () => {
  try {
    const response = await axios.get(`${url}/duplicates`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data || { success: false, error: "Network error while fetching duplicates" };
  }
};

const getAllProductsForReport = async (search = "") => {
  try {
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

const getProductBrands = async () => {
  try {
    const response = await axios.get(`${url}/brands`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data || { success: false, error: "Network error while fetching brands" };
  }
};

// ── NEW: fetch distinct product categories from the DB ──
const getProductCategories = async () => {
  try {
    const response = await axios.get(`${url}/categories`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data || { success: false, error: "Network error while fetching categories" };
  }
};

export {
  getProducts,
  getProductById,
  createProduct,
  createProductForced,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  getDuplicateProducts,
  getAllProductsForReport,
  getProductBrands,
  getProductCategories,
};