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
    // ── FIX: createProduct now intentionally returns HTTP 409 for duplicates
    // (see productController.createProduct). Previously this caught only
    // `error.response.data`, which still works for 409s, but if the network
    // itself fails (no response at all), `error.response` is undefined and
    // `.data` throws — guard with optional chaining like the other functions. ──
    console.error(error?.response?.data);
    return error?.response?.data || { success: false, error: "Network error while creating product" };
  }
};

// ── NEW: lets the Add Product form retry with forceCreateDuplicate=true
// after the user confirms "yes, I really do want to add a duplicate". ──
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
    // ── FIX: original code did `error.response.data.error` and returned just
    // the string, which is inconsistent with every other function here
    // (which return the full { success, error } object). The grid's
    // handelDeleteClick does `data?.success` / `data?.error`, so returning
    // a bare string made `data?.success` always undefined-falsy (harmless
    // here since it already checked falsy correctly) but `data?.error` would
    // have been `undefined` on a string return — toast.error(undefined) -
    // fixed by returning the consistent shape. ──
    console.error(error?.response?.data);
    return error?.response?.data || { success: false, error: "Network error while deleting product" };
  }
};

// ── NEW: bulk delete for clearing out duplicate groups in one call ──
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

// ── NEW: fetch all duplicate groups for the whole company in one call,
// computed server-side via aggregation (faster + more accurate than
// scanning getAllProductsForReport client-side for big catalogs). ──
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

// ── NEW: fetch distinct brands for this company from the DB ──
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
};