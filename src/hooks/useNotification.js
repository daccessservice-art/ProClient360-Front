import axios from 'axios';
import toast from 'react-hot-toast';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/notification";

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const getNotifications = async (params = {}) => {
  try {
    const response = await axios.get(`${url}/`, { ...authHeader(), params });
    return response?.data;
  } catch (error) {
    console.error("Error fetching notifications:", error.response?.data?.error);
    return error?.response?.data || { success: false };
  }
};

// ✅ NEW: light-weight badge count (polled by Header)
const getUnreadCount = async () => {
  try {
    const response = await axios.get(`${url}/unread-count`, authHeader());
    return response?.data;
  } catch (error) {
    return { success: false, unreadCount: 0, salesUnreadCount: 0 };
  }
};

const sendNotification = async (notificationData) => {
  try {
    const response = await axios.post(`${url}`, notificationData, authHeader());
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      return toast.error(data.error);
    }
    return data;
  } catch (error) {
    console.error("Error sending notification:", error);
    toast.error(error.response?.data?.error || "Failed to send notification");
  }
};

const markAsRead = async (notificationId) => {
  try {
    const response = await axios.put(`${url}/${notificationId}`, {}, authHeader());
    return response.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false };
  }
};

// ✅ NEW
const markAllAsRead = async () => {
  try {
    const response = await axios.put(`${url}/mark-all-read`, {}, authHeader());
    return response.data;
  } catch (error) {
    toast.error(error.response?.data?.error || "Failed to mark all as read");
    return { success: false };
  }
};

const deleteNotification = async (notificationId) => {
  try {
    const response = await axios.delete(`${url}/${notificationId}`, authHeader());
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      return toast.error(data.error);
    }
    return data;
  } catch (error) {
    console.error("Error deleting notification:", error);
    toast.error(error?.response?.data?.error || "Something went wrong.");
  }
};

// ✅ NEW: clear all from DB (old code only cleared redux, so they came back on refresh)
const clearAllNotificationsApi = async () => {
  try {
    const response = await axios.delete(`${url}/clear-all`, authHeader());
    return response.data;
  } catch (error) {
    toast.error(error.response?.data?.error || "Failed to clear notifications");
    return { success: false };
  }
};

export {
  getNotifications,
  getUnreadCount,
  sendNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotificationsApi,
};