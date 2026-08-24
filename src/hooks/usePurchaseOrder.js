import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/purchaseOrder";

const getPurchaseOrders = async (page = 1, limit = 20, search = "") => {
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

const getPurchaseOrderById = async (poId) => {
  try {
    const response = await axios.get(`${url}/${poId}`, {
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

const getPurchaseOrderHistory = async (poId) => {
  try {
    const response = await axios.get(`${url}/${poId}/history`, {
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

const createPurchaseOrder = async (poData) => {
  try {
    const response = await axios.post(`${url}`, poData, {
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

const updatePurchaseOrder = async (updatedData) => {
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

const deletePurchaseOrder = async (Id) => {
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

const approvePurchaseOrder = async (poId) => {
  try {
    const response = await axios.put(`${url}/${poId}`, { _id: poId, status: "Approved" }, {
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

// ✅ NEW: fetch the logged-in user's own company profile (name + Address)
const getMyCompanyProfile = async () => {
  try {
    const response = await axios.get(`${url}/company-profile`, {
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

export { 
  getPurchaseOrders, getPurchaseOrderById, getPurchaseOrderHistory, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, approvePurchaseOrder, getMyCompanyProfile 
};