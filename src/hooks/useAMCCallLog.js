import axios from "axios";

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/amc-call-log";

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const handleError = (error) => {
  console.error(error?.response?.data || error);
  return error?.response?.data || { success: false, error: error?.message || "Something went wrong" };
};

// Save one call (date & time are set automatically by the server)
export const logAMCCall = async (amcId, payload) => {
  try {
    const response = await axios.post(`${url}/${amcId}`, payload, authHeader());
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

// Full call history of one AMC record
export const getAMCCallHistory = async (amcId) => {
  try {
    const response = await axios.get(`${url}/${amcId}`, authHeader());
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

// Call count + last call for many AMC records (used by grid)
export const getAMCCallSummary = async (ids = []) => {
  try {
    const response = await axios.post(`${url}/summary`, { ids }, authHeader());
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

// AMC expiry alert counts → { totalAlerts, calledCount, pendingCount, followUpDue }
export const getAMCAlertCount = async () => {
  try {
    const response = await axios.get(`${url}/alert-count`, authHeader());
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};