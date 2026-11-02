import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/vendor";

const getVendors = async (page = 1, limit = 20, search = "", type = "", onlyLink = false) => {
  try {
    const params = { page, limit };
    if (search && String(search).trim() !== "") params.q = String(search).trim();
    if (type) params.type = type;
    if (onlyLink) params.link = "true";

    // ✅ axios `params` encodes search text safely (spaces, &, commas, etc.)
    const response = await axios.get(url, {
      params,
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const getVendorById = async (vendorId) => {
  try {
    const response = await axios.get(`${url}/${vendorId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const createVendor = async (vendorData) => {
  try {
    const response = await axios.post(`${url}`, vendorData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error.response.data);
    return error.response.data;
  }
};

const updateVendor = async (updatedData) => {
  try {
    const response = await axios.put(`${url}/${updatedData._id}`, updatedData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error.response.data);
    return error.response.data;
  }
};

const deleteVendor = async (Id) => {
  try {
    const response = await axios.delete(`${url}/${Id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.log(error.response.data);
    return error.response.data.error;
  }
};

// ✅ NEW: aggregate counts across ALL vendors (not just current page)
const getVendorTypeCounts = async () => {
  try {
    const response = await axios.get(`${url}/type-counts`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

export { getVendors, getVendorById, createVendor, updateVendor, deleteVendor, getVendorTypeCounts };