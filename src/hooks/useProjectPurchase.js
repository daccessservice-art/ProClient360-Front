import axios from "axios";
import toast from "react-hot-toast";

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/projectPurchase";

// Get all project purchases
const getProjectPurchases = async (page, limit, filters = {}, searchTerm = "") => {
    try {
        const params = {
            page,
            limit,
            ...(filters.status && { status: filters.status }),
            ...(filters.stockStatus && { stockStatus: filters.stockStatus }),
            ...(filters.paymentTermsMatch && { paymentTermsMatch: filters.paymentTermsMatch }),
            ...(searchTerm && { search: searchTerm }),
        };
        const response = await axios.get(url, {
            params,
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Get single project purchase
const getProjectPurchase = async (id) => {
    try {
        const response = await axios.get(`${url}/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Create project purchase
const createProjectPurchase = async (data) => {
    try {
        const response = await axios.post(url, data, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120000,
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Update project purchase
const updateProjectPurchase = async (id, data) => {
    try {
        const response = await axios.put(`${url}/${id}`, data, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120000,
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Store check - verify material availability
const storeCheckMaterials = async (id, materials) => {
    try {
        const response = await axios.put(`${url}/${id}/store-check`, { materials }, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Purchase team update
const updatePurchaseStatus = async (id, materials) => {
    try {
        const response = await axios.put(`${url}/${id}/purchase-update`, { materials }, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Account team verify
const accountVerifyPurchase = async (id, verificationData) => {
    try {
        const response = await axios.put(`${url}/${id}/account-verify`, verificationData, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120000,
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Get material status by project (for Account Master)
const getMaterialStatusByProject = async (projectId) => {
    try {
        const response = await axios.get(`${url}/project-materials/${projectId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Add materials to existing request
const addMaterials = async (id, materials) => {
    try {
        const response = await axios.post(`${url}/${id}/add-materials`, { materials }, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Delete project purchase
const deleteProjectPurchase = async (id) => {
    try {
        const response = await axios.delete(`${url}/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Get stats
const getProjectPurchaseStats = async () => {
    try {
        const response = await axios.get(`${url}/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

export {
    getProjectPurchases,
    getProjectPurchase,
    createProjectPurchase,
    updateProjectPurchase,
    storeCheckMaterials,
    updatePurchaseStatus,
    accountVerifyPurchase,
    getMaterialStatusByProject,
    addMaterials,
    deleteProjectPurchase,
    getProjectPurchaseStats,
};