// hooks/useQC.js
import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/qc";

const getQualityInspections = async (page = 1, limit = 20, search = null) => {
  try {
    const response = await axios.get(`${url}?q=${search}&page=${page}&limit=${limit}`, {
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

const getQualityInspectionById = async (qcId) => {
  try {
    const response = await axios.get(`${url}/${qcId}`, {
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

const createQualityInspection = async (qcData) => {
  try {
    const response = await axios.post(`${url}`, qcData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error.response?.data);
    return error.response?.data;
  }
};

const updateQualityInspection = async (updatedData) => {
  try {
    const response = await axios.put(`${url}/${updatedData._id}`, updatedData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error.response?.data);
    return error.response?.data;
  }
};

const deleteQualityInspection = async (Id) => {
  try {
    const response = await axios.delete(`${url}/${Id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.log(error.response?.data);
    return error.response?.data?.error;
  }
};

// New: Get asset by QR code data
const getAssetByQR = async (qrData) => {
  try {
    const response = await axios.get(`${url}/asset/${encodeURIComponent(qrData)}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error.response?.data);
    return error.response?.data;
  }
};

// New: Get all assets with filters
const getAllAssets = async (page = 1, limit = 20, search = null, status = null, warrantyStatus = null) => {
  try {
    let queryParams = `?page=${page}&limit=${limit}`;
    if (search) queryParams += `&q=${search}`;
    if (status) queryParams += `&status=${status}`;
    if (warrantyStatus) queryParams += `&warrantyStatus=${warrantyStatus}`;
    
    const response = await axios.get(`${url}/assets${queryParams}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error.response?.data);
    return error.response?.data;
  }
};

// New: Update asset status
const updateAssetStatus = async (qcId, assetId, updateData) => {
  try {
    const response = await axios.put(`${url}/${qcId}/asset/${assetId}`, updateData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error.response?.data);
    return error.response?.data;
  }
};

export { 
  getQualityInspections, 
  getQualityInspectionById, 
  createQualityInspection, 
  updateQualityInspection, 
  deleteQualityInspection,
  getAssetByQR,
  getAllAssets,
  updateAssetStatus
};