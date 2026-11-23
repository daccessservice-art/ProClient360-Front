import axios from 'axios';
import toast from 'react-hot-toast';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/location";

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// Engineers on duty now, with last position
const getLiveLocations = async () => {
  try {
    const response = await axios.get(`${url}/live`, { headers: authHeader() });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error?.response?.data?.error || "Failed to load live locations" };
  }
};

// Engineers who used tracking in the last 30 days (for the history dropdown)
const getTrackedEngineers = async () => {
  try {
    const response = await axios.get(`${url}/engineers`, { headers: authHeader() });
    return response.data;
  } catch (error) {
    console.error(error);
    toast.error(error?.response?.data?.error || "Failed to load engineers");
    return { success: false, engineers: [] };
  }
};

// One engineer's route for one day (date = "YYYY-MM-DD")
const getLocationHistory = async (employeeId, date) => {
  try {
    const response = await axios.get(`${url}/history/${employeeId}`, {
      params: { date },
      headers: authHeader(),
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error?.response?.data?.error || "Failed to load route history" };
  }
};

export { getLiveLocations, getTrackedEngineers, getLocationHistory };