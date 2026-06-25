import axios from 'axios';
import toast from 'react-hot-toast';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/callLog";

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const createCallLog = async (callLogData) => {
    try {
        const response = await axios.post(url, callLogData, { headers: authHeader() });
        const data = response.data;
        if (data.error) { toast.error(data.error); return { success: false, error: data.error }; }
        toast.success(data.message || "Call log added successfully");
        return data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || "Failed to add call log";
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
    }
};

const getCallLogsByService = async (serviceId) => {
    try {
        const response = await axios.get(`${url}/service/${serviceId}`, { headers: authHeader() });
        return response.data;
    } catch (error) {
        console.error("Error fetching call logs:", error);
        return { success: false, error: "Failed to fetch call logs", callLogs: [], summary: {} };
    }
};

const updateCallLog = async (id, callLogData) => {
    try {
        const response = await axios.put(`${url}/${id}`, callLogData, { headers: authHeader() });
        const data = response.data;
        if (data.error) { toast.error(data.error); return { success: false, error: data.error }; }
        toast.success(data.message || "Call log updated successfully");
        return data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || "Failed to update call log";
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
    }
};

const deleteCallLog = async (id) => {
    try {
        const response = await axios.delete(`${url}/${id}`, { headers: authHeader() });
        const data = response.data;
        if (data.error) { toast.error(data.error); return { success: false, error: data.error }; }
        toast.success(data.message || "Call log deleted successfully");
        return data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || "Failed to delete call log";
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
    }
};

const getCallLogSummary = async () => {
    try {
        const response = await axios.get(`${url}/summary`, { headers: authHeader() });
        return response.data;
    } catch (error) {
        console.error("Error fetching call log summary:", error);
        return { success: false, summaries: [] };
    }
};

const getCallLogStats = async () => {
    try {
        const response = await axios.get(`${url}/stats`, { headers: authHeader() });
        return response.data;
    } catch (error) {
        console.error("Error fetching call log stats:", error);
        return { success: false, stats: {} };
    }
};

export { createCallLog, getCallLogsByService, updateCallLog, deleteCallLog, getCallLogSummary, getCallLogStats };