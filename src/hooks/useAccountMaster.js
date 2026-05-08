import axios from "axios";
import toast from "react-hot-toast";

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/account";

// Get all accounts with filters
const getAccounts = async (page, limit, filters = {}, searchTerm = "") => {
    try {
        const params = {
            page,
            limit,
            ...(filters.invoiceStatus && { invoiceStatus: filters.invoiceStatus }),
            ...(filters.followUpDue && { followUpDue: filters.followUpDue }),
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

// Get account by project ID
const getAccountByProject = async (projectId) => {
    try {
        const response = await axios.get(`${url}/project/${projectId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Update account actions
const updateAccountActions = async (accountId, updateData) => {
    try {
        const response = await axios.put(
            `${url}/${accountId}`,
            updateData,
            {
                headers: { 
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    'Content-Type': 'application/json'
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 120000,
            }
        );
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Convert to invoice
const convertToInvoice = async (accountId, invoiceData) => {
    try {
        const response = await axios.post(
            `${url}/${accountId}/convert-to-invoice`,
            invoiceData,
            {
                headers: { 
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    'Content-Type': 'application/json'
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 120000,
            }
        );
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Add follow-up
const addFollowUp = async (accountId, followUpData) => {
    try {
        const response = await axios.post(
            `${url}/${accountId}/follow-up`,
            followUpData,
            {
                headers: { 
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Get follow-up alerts
const getFollowUpAlerts = async () => {
    try {
        const response = await axios.get(`${url}/alerts`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

// Get account statistics
const getAccountStats = async () => {
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

// Sync account with project
const syncWithProject = async (projectId) => {
    try {
        const response = await axios.put(
            `${url}/sync/${projectId}`,
            {},
            {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            }
        );
        return response.data;
    } catch (error) {
        console.error(error);
        return error.response?.data;
    }
};

export {
    getAccounts,
    getAccountByProject,
    updateAccountActions,
    convertToInvoice,
    addFollowUp,
    getFollowUpAlerts,
    getAccountStats,
    syncWithProject
};