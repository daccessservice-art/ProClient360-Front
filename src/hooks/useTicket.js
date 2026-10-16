import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/ticket";

const getAllTickets = async (page, limit, search = null, filter = '') => {
  try {
    const response = await axios.get(`${url}?q=${search}&page=${page}&limit=${limit}&filter=${filter}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const createTicket = async (ticketData) => {
  try {
    const response = await axios.post(`${url}`, ticketData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error.response.data);
    return error.response.data;
  }
};

const updateTicket = async (id, updatedData) => {
  try {
    const response = await axios.put(`${url}/${id}`, updatedData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error.response.data);
    return error.response.data;
  }
};

const deleteTicket = async (Id) => {
  try {
    const response = await axios.delete(`${url}/${Id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return error?.response?.data;
  }
};

// ✅ NEW: full details of an external ticket (EXT-xx)
const getExternalTicket = async (uniqueTicketId) => {
  try {
    const response = await axios.get(`${baseUrl}/api/external-ticket/${uniqueTicketId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    return error?.response?.data || { success: false, error: "Failed to load details" };
  }
};

// SmartGate (external) ticket update - separate from the DAccess update
const updateExternalTicket = async (uniqueTicketId, data) => {
  try {
    const response = await axios.patch(`${baseUrl}/api/external-ticket/${uniqueTicketId}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    return error?.response?.data || { success: false, error: "Failed to update ticket" };
  }
};

export { getAllTickets, createTicket, updateTicket, deleteTicket, getExternalTicket, updateExternalTicket };