import axios from 'axios';
import toast from 'react-hot-toast';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/customer-raise-ticket";

const createRaiseTicket = async (ticketData) => {
  try {
    const response = await axios.post(`${url}`, ticketData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating raise ticket:', error?.response?.data);
    return error?.response?.data || { success: false, error: 'Failed to raise ticket' };
  }
};

const getTicketsByCustomer = async (customerId) => {
  try {
    const response = await axios.get(`${url}/customer/${customerId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching tickets:', error?.response?.data);
    return error?.response?.data || { success: false, tickets: [] };
  }
};

const getTicketById = async (ticketId) => {
  try {
    const response = await axios.get(`${url}/${ticketId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching ticket:', error?.response?.data);
    return error?.response?.data || { success: false, error: 'Failed to fetch ticket' };
  }
};

const updateRaiseTicket = async (ticketId, ticketData) => {
  try {
    const response = await axios.put(`${url}/${ticketId}`, ticketData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating ticket:', error?.response?.data);
    return error?.response?.data || { success: false, error: 'Failed to update ticket' };
  }
};

const deleteRaiseTicket = async (ticketId) => {
  try {
    const response = await axios.delete(`${url}/${ticketId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting ticket:', error?.response?.data);
    return error?.response?.data || { success: false, error: 'Failed to delete ticket' };
  }
};

export {
  createRaiseTicket,
  getTicketsByCustomer,
  getTicketById,
  updateRaiseTicket,
  deleteRaiseTicket,
};